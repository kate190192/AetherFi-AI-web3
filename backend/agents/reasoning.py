"""LLM Reasoning Engine - 基于 Ollama 的投资推理引擎"""

import json
import logging
import re

import httpx
from langchain_ollama import ChatOllama
from langchain_core.messages import HumanMessage, SystemMessage

from schemas.models import Decision
from core.settings_store import get_settings

logger = logging.getLogger(__name__)


def _resolve_model(base_url: str, configured_model: str) -> str:
    """
    验证配置的模型是否可用。不可用时自动选择第一个可用的生成模型。
    """
    try:
        r = httpx.get(f"{base_url}/api/tags", timeout=5)
        available = [m["name"] for m in r.json().get("models", [])]
    except Exception:
        return configured_model

    if configured_model in available:
        return configured_model

    # 过滤掉 embedding 等非生成模型，按 size 降序选择最大的
    gen_models = [m for m in available if "embedding" not in m.lower()]
    if gen_models:
        logger.warning(
            "配置的模型 '%s' 不可用，自动选择 '%s'（共 %d 个可用模型）",
            configured_model, gen_models[0], len(gen_models),
        )
        return gen_models[0]

    return configured_model

SYSTEM_PROMPT = """你是 AetherFi，一个自主的 AI 金融分析师。你专注于加密货币和 Web3 去中心化金融领域，\
能够根据市场数据、新闻情绪、投资组合状态和用户风险偏好，提供专业的投资建议。

你必须基于提供的数据进行客观分析，给出可操作的投资决策。

你的输出必须是合法的 JSON 格式，严格遵循以下结构（不要添加 markdown 代码块标记）：
{
  "action": "invest 或 hold 或 avoid",
  "allocation": {"SYMBOL": 比例, ...},
  "reasoning": ["理由1", "理由2", ...],
  "risk_score": 0.0到1.0之间的浮点数,
  "confidence": 0.0到1.0之间的浮点数
}

其中：
- action: invest（建议投资）、hold（建议观望）、avoid（建议规避）
- allocation: 各资产分配比例，总和应为1.0
- reasoning: 决策理由列表
- risk_score: 风险评分，0=无风险，1=极高风险
- confidence: 决策置信度，0=不确定，1=非常确定"""


def _build_prompt(
    query: str,
    market_data: dict,
    news_sentiment: dict,
    portfolio_state: dict,
    risk_profile: str,
) -> str:
    """构建结构化提示词"""
    sections = []

    sections.append(f"## 用户查询\n{query}")
    sections.append(f"## 用户风险偏好\n{risk_profile}")

    if market_data:
        sections.append(f"## 市场数据\n{json.dumps(market_data, ensure_ascii=False, indent=2)}")

    if news_sentiment:
        sections.append(f"## 新闻情绪分析\n{json.dumps(news_sentiment, ensure_ascii=False, indent=2)}")

    if portfolio_state:
        sections.append(f"## 投资组合状态\n{json.dumps(portfolio_state, ensure_ascii=False, indent=2)}")

    sections.append(
        "请综合以上信息，给出你的投资决策。注意：只输出 JSON，不要输出任何其他内容。"
    )

    return "\n\n".join(sections)


def _rule_based_fallback(
    query: str,
    market_data: dict,
    news_sentiment: dict,
    risk_profile: str,
) -> Decision:
    """基于规则的后备决策（当 LLM 不可用时）"""
    sentiment_score = news_sentiment.get("overall_score", 0.5)

    if risk_profile == "conservative":
        allocation = {"USDC": 0.60, "WBTC": 0.20, "ETH": 0.15, "SOL": 0.05}
        risk_score = 0.25
    elif risk_profile == "aggressive":
        allocation = {"USDC": 0.10, "WBTC": 0.30, "ETH": 0.35, "SOL": 0.25}
        risk_score = 0.78
    else:
        allocation = {"USDC": 0.35, "WBTC": 0.25, "ETH": 0.25, "SOL": 0.15}
        risk_score = 0.50

    if sentiment_score < 0.3:
        action = "avoid"
        allocation = {"USDC": 0.85, "WBTC": 0.08, "ETH": 0.05, "SOL": 0.02}
        risk_score = min(risk_score + 0.1, 1.0)
    elif sentiment_score > 0.7:
        action = "invest"
    else:
        action = "hold"

    return Decision(
        action=action,
        allocation=allocation,
        reasoning=[
            "（基于规则的后备决策，LLM 不可用）",
            f"市场情绪评分: {sentiment_score:.2f}",
            f"用户风险偏好: {risk_profile}",
            "当前分配基于预设风险模板生成",
        ],
        risk_score=risk_score,
        confidence=0.45,
    )


def _extract_json_from_text(text: str) -> dict | None:
    """尝试从 LLM 回复文本中提取 JSON"""
    # 尝试直接解析
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    # 尝试从 markdown 代码块中提取
    json_match = re.search(r"```(?:json)?\s*\n?(.*?)\n?```", text, re.DOTALL)
    if json_match:
        try:
            return json.loads(json_match.group(1).strip())
        except json.JSONDecodeError:
            pass

    # 尝试找到第一个 { 和最后一个 } 之间的内容
    first_brace = text.find("{")
    last_brace = text.rfind("}")
    if first_brace != -1 and last_brace != -1 and last_brace > first_brace:
        try:
            return json.loads(text[first_brace : last_brace + 1])
        except json.JSONDecodeError:
            pass

    return None


def _build_fallback_decision_from_text(text: str, risk_profile: str) -> Decision:
    """当 JSON 解析失败时，从文本中提取推理信息构建后备 Decision"""
    reasoning_lines = [
        line.strip().lstrip("-•0123456789). ")
        for line in text.split("\n")
        if line.strip() and len(line.strip()) > 10
    ][:5]

    if not reasoning_lines:
        reasoning_lines = ["LLM 返回内容无法解析为结构化决策"]

    if risk_profile == "conservative":
        allocation = {"USDC": 0.60, "WBTC": 0.20, "ETH": 0.15, "SOL": 0.05}
        risk_score = 0.30
    elif risk_profile == "aggressive":
        allocation = {"USDC": 0.10, "WBTC": 0.30, "ETH": 0.35, "SOL": 0.25}
        risk_score = 0.70
    else:
        allocation = {"USDC": 0.35, "WBTC": 0.25, "ETH": 0.25, "SOL": 0.15}
        risk_score = 0.50

    return Decision(
        action="hold",
        allocation=allocation,
        reasoning=reasoning_lines,
        risk_score=risk_score,
        confidence=0.35,
    )


async def analyze_investment(
    query: str,
    market_data: dict,
    news_sentiment: dict,
    portfolio_state: dict,
    risk_profile: str,
) -> Decision:
    """
    使用 LLM 分析投资机会并生成决策。

    如果 LLM 不可用或解析失败，返回基于规则的后备决策。
    """
    settings = get_settings()
    base_url = settings.llm_base_url or "http://localhost:11434"
    configured_model = settings.llm_model or "qwen3:8b"

    # 自动检测并解析实际可用的模型
    ollama_model = _resolve_model(base_url, configured_model)
    logger.info("使用模型: %s (配置: %s)", ollama_model, configured_model)

    prompt = _build_prompt(query, market_data, news_sentiment, portfolio_state, risk_profile)

    try:
        llm = ChatOllama(
            model=ollama_model,
            base_url=base_url,
            temperature=0.3,
        )

        response = await llm.ainvoke(
            [
                SystemMessage(content=SYSTEM_PROMPT),
                HumanMessage(content=prompt),
            ]
        )

        raw_text = response.content
        logger.info("LLM 原始回复: %s", raw_text[:500])

        parsed = _extract_json_from_text(raw_text)
        if parsed:
            return Decision(
                action=parsed.get("action", "hold"),
                allocation=parsed.get("allocation", {}),
                reasoning=parsed.get("reasoning", []),
                risk_score=float(parsed.get("risk_score", 0.5)),
                confidence=float(parsed.get("confidence", 0.5)),
            )

        logger.warning("无法从 LLM 回复中解析 JSON，使用文本后备方案")
        return _build_fallback_decision_from_text(raw_text, risk_profile)

    except Exception as e:
        logger.error("LLM 推理失败: %s，切换到规则后备", e)
        return _rule_based_fallback(query, market_data, news_sentiment, risk_profile)
