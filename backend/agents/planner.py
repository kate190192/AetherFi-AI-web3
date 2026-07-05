"""Planning Agent - 基于 LLM 的意图解析与查询规划"""

import json
import logging
import re

import httpx
from langchain_ollama import ChatOllama
from langchain_core.messages import HumanMessage, SystemMessage

from core.settings_store import get_settings

logger = logging.getLogger(__name__)

KNOWN_SYMBOLS = {
    "BTC", "WBTC", "ETH", "SOL", "AVAX", "MATIC", "DOT", "LINK",
    "UNI", "AAVE", "ARB", "OP", "ATOM", "NEAR", "FTM", "DOGE",
    "XRP", "ADA", "SHIB", "PEPE", "USDC", "USDT", "DAI",
}

SYMBOL_ALIASES = {
    "比特币": "BTC", "以太坊": "ETH", "索拉纳": "SOL",
    "雪崩": "AVAX", "波卡": "DOT", "柴犬币": "SHIB",
    "狗狗币": "DOGE", "瑞波": "XRP", "艾达": "ADA",
    "链link": "LINK", "预言机": "LINK", "稳定币": "USDC",
    "大饼": "BTC", "以太": "ETH",
}

SYSTEM_PROMPT = """你是 AetherFi 的意图解析器。分析用户查询，提取：
1. symbols: 用户提到的加密货币符号列表（如 BTC, ETH, SOL）
2. query_type: single_asset / comparison / portfolio / news / general
3. capital: 用户投入的资金金额（USD），未提及则为 null
4. risk_hint: 用户语气暗示的风险偏好（conservative/neutral/aggressive），未暗示则为 null
5. user_intent: 用户的核心意图用一句话总结

已知加密货币符号: BTC, ETH, SOL, AVAX, DOGE, XRP, ADA, LINK, UNI, AAVE, DOT, MATIC, ARB, OP, ATOM, NEAR, FTM, SHIB, PEPE, USDC, USDT, DAI, WBTC

中文别名映射: 比特币=BTC, 以太坊=ETH, 索拉纳=SOL, 狗狗币=DOGE, 大饼=BTC, 以太=ETH

只输出 JSON，不要添加 markdown 代码块标记：
{"symbols": [], "query_type": "", "capital": null, "risk_hint": null, "user_intent": ""}"""


def _extract_symbols_regex(query: str) -> list[str]:
    """正则后备提取"""
    found = set()
    for match in re.finditer(r"\b([A-Z]{2,5})\b", query):
        if match.group(1) in KNOWN_SYMBOLS:
            found.add(match.group(1))
    for alias, symbol in SYMBOL_ALIASES.items():
        if alias in query:
            found.add(symbol)
    for word in re.findall(r"\b([a-zA-Z]{2,5})\b", query):
        if word.upper() in KNOWN_SYMBOLS:
            found.add(word.upper())
    return list(found)


def _extract_capital_regex(query: str) -> float | None:
    """正则后备提取资金"""
    patterns = [
        re.compile(r"(\d+(?:\.\d+)?)\s*[万wW]", re.IGNORECASE),
        re.compile(r"(\d+(?:\.\d+)?)\s*[kK千]"),
        re.compile(r"\$\s*(\d+(?:\.\d+)?)"),
        re.compile(r"(\d+(?:\.\d+)?)\s*美元"),
        re.compile(r"(\d+(?:\.\d+)?)\s*[Uu](?:SDT|SDC)?"),
        re.compile(r"(\d+(?:,\d{3})*(?:\.\d+)?)\s*元"),
    ]
    for p in patterns:
        m = p.search(query)
        if m:
            v = float(m.group(1).replace(",", ""))
            full = m.group(0).lower()
            if "万" in full or "w" in full:
                v *= 10000
            elif "k" in full or "千" in full:
                v *= 1000
            return v
    return None


def _resolve_model(base_url: str, configured: str) -> str:
    try:
        r = httpx.get(f"{base_url}/api/tags", timeout=5)
        available = [m["name"] for m in r.json().get("models", [])]
    except Exception:
        return configured
    if configured in available:
        return configured
    gen = [m for m in available if "embedding" not in m.lower()]
    return gen[0] if gen else configured


def _parse_llm_response(text: str) -> dict | None:
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass
    m = re.search(r"```(?:json)?\s*\n?(.*?)\n?```", text, re.DOTALL)
    if m:
        try:
            return json.loads(m.group(1).strip())
        except json.JSONDecodeError:
            pass
    first = text.find("{")
    last = text.rfind("}")
    if first != -1 and last > first:
        try:
            return json.loads(text[first:last + 1])
        except json.JSONDecodeError:
            pass
    return None


async def parse_intent(query: str) -> dict:
    """
    使用 LLM 解析用户查询意图。LLM 不可用时降级到正则。
    """
    settings = get_settings()
    base_url = settings.llm_base_url or "http://localhost:11434"
    model = _resolve_model(base_url, settings.llm_model or "qwen3:8b")

    try:
        llm = ChatOllama(model=model, base_url=base_url, temperature=0.1)
        response = await llm.ainvoke([
            SystemMessage(content=SYSTEM_PROMPT),
            HumanMessage(content=f"分析查询: {query}"),
        ])
        parsed = _parse_llm_response(response.content)
        if parsed:
            symbols = [s.upper() for s in parsed.get("symbols", []) if s]
            if not symbols:
                symbols = _extract_symbols_regex(query)
            capital = parsed.get("capital") or _extract_capital_regex(query)
            logger.info("LLM 意图解析成功: symbols=%s, type=%s", symbols, parsed.get("query_type"))
            return {
                "symbols": symbols,
                "query_type": parsed.get("query_type", "general"),
                "capital": capital,
                "risk_hint": parsed.get("risk_hint"),
                "user_intent": parsed.get("user_intent", ""),
                "original_query": query,
            }
    except Exception as e:
        logger.warning("LLM 意图解析失败: %s，降级到正则", e)

    symbols = _extract_symbols_regex(query)
    capital = _extract_capital_regex(query)
    if len(symbols) > 1:
        qtype = "comparison"
    elif len(symbols) == 1:
        qtype = "single_asset"
    else:
        qtype = "general"
    return {
        "symbols": symbols,
        "query_type": qtype,
        "capital": capital,
        "risk_hint": None,
        "user_intent": query,
        "original_query": query,
    }
