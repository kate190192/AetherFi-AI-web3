"""News Sentiment Tool — 接入真实新闻 API，失败时降级到模拟数据。"""

import logging
import random
import time as _time
from typing import Any

import httpx

from core.retry import with_retry_async, API_CONFIG

logger = logging.getLogger(__name__)

# CryptoCompare 免费新闻 API（无需 API Key）
CRYPTOCOMPARE_NEWS_URL = "https://min-api.cryptocompare.com/data/v2/news/"

# 情绪关键词
_BULLISH_KW = {
    "surge", "soar", "rally", "bull", "gain", "jump", "record", "high",
    "growth", "adoption", "upgrade", "inflow", "milestone", "breakout",
    "recovery", "strengthen", "accumulate", "buy", "moon", "pump",
    "institutional", "etf", "approval", "partnership", "launch",
    "利好", "上涨", "突破", "新高", "增长", "买入", "看涨", "牛市",
}
_BEARISH_KW = {
    "crash", "dump", "bear", "drop", "fall", "plunge", "decline",
    "regulation", "ban", "hack", "exploit", "scam", "fraud",
    "sell", "panic", "fear", "correction", "risk", "warning",
    "sec", "lawsuit", "investigation", "outage", "vulnerability",
    "利空", "下跌", "暴跌", "监管", "黑客", "骗局", "卖出", "恐慌",
}


def _analyze_headline(headline: str) -> str:
    lower = headline.lower()
    bull = sum(1 for kw in _BULLISH_KW if kw in lower)
    bear = sum(1 for kw in _BEARISH_KW if kw in lower)
    if bull > bear + 1:
        return "bullish"
    elif bear > bull + 1:
        return "bearish"
    return "neutral"


async def _fetch_cryptocompare_news(categories: list[str] = None) -> list[dict]:
    """从 CryptoCompare 获取实时加密新闻（带重试）"""
    params = {"lang": "EN", "sortOrder": "latest"}
    if categories:
        params["categories"] = ",".join(categories)

    @with_retry_async(config=API_CONFIG, fallback_value=[], log_prefix="CryptoCompare")
    async def _do_fetch():
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(CRYPTOCOMPARE_NEWS_URL, params=params)
            if resp.status_code != 200:
                raise httpx.HTTPStatusError(f"HTTP {resp.status_code}", request=resp.request, response=resp)
            data = resp.json()
            articles = data.get("Data", [])[:20]
            return [
                {
                    "title": a.get("title", ""),
                    "source": a.get("source", ""),
                    "url": a.get("url", ""),
                    "categories": a.get("categories", ""),
                    "published_on": a.get("published_on", 0),
                }
                for a in articles
            ]

    try:
        return await _do_fetch()
    except Exception as e:
        logger.warning("CryptoCompare 新闻获取失败: %s", e)
        return []


async def _fetch_coingecko_trending() -> list[dict]:
    """从 CoinGecko 获取热门搜索币种（作为市场关注度信号，带重试）"""

    @with_retry_async(config=API_CONFIG, fallback_value=[], log_prefix="CoinGecko-trending")
    async def _do_fetch():
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get("https://api.coingecko.com/api/v3/search/trending")
            if resp.status_code != 200:
                raise httpx.HTTPStatusError(f"HTTP {resp.status_code}", request=resp.request, response=resp)
            data = resp.json()
            return [
                {
                    "name": item.get("item", {}).get("name", ""),
                    "symbol": item.get("item", {}).get("symbol", ""),
                    "market_cap_rank": item.get("item", {}).get("market_cap_rank"),
                    "score": item.get("item", {}).get("score", 0),
                }
                for item in data.get("coins", [])[:10]
            ]

    try:
        return await _do_fetch()
    except Exception as e:
        logger.warning("CoinGecko trending 获取失败: %s", e)
        return []


# ── 降级模拟新闻 ──────────────────────────────────────────────────────────
_FALLBACK_NEWS: dict[str, list[str]] = {
    "BTC": [
        "Bitcoin ETF sees continued institutional inflows amid market recovery",
        "Bitcoin mining difficulty adjustment impacts network hash rate",
        "Whale accumulation patterns suggest long-term holder confidence",
    ],
    "ETH": [
        "Ethereum L2 scaling solutions gain traction with lower gas fees",
        "Ethereum staking participation rate reaches new milestone",
        "DeFi protocols on Ethereum show renewed growth in TVL",
    ],
    "SOL": [
        "Solana ecosystem expands with new DeFi and NFT projects",
        "Solana network performance improvements attract developer activity",
    ],
}
_GENERAL_FALLBACK = [
    "Crypto market shows mixed signals amid global economic shifts",
    "Institutional crypto adoption continues to accelerate",
    "Regulatory clarity improves for digital assets in major markets",
]


async def get_news_sentiment(symbol: str) -> dict[str, Any]:
    """获取指定币种的新闻情绪分析。

    优先使用 CryptoCompare 实时新闻 → CoinGecko trending → 降级模拟数据。
    返回值包含 data_quality 字段标识数据可靠性。
    """
    symbol = symbol.upper()
    headlines = []
    data_source = "Simulated"

    # 1) 尝试 CryptoCompare 实时新闻
    crypto_news = await _fetch_cryptocompare_news()
    if crypto_news:
        data_source = "CryptoCompare"
        # 筛选包含该币种名称的新闻
        symbol_aliases = {"BTC": ["bitcoin"], "ETH": ["ethereum"], "SOL": ["solana"],
                          "DOGE": ["dogecoin"], "XRP": ["ripple"], "ADA": ["cardano"],
                          "AVAX": ["avalanche"], "BNB": ["binance"]}
        aliases = symbol_aliases.get(symbol, [symbol.lower()])
        relevant = [
            n["title"] for n in crypto_news
            if any(a in n["title"].lower() for a in aliases)
        ]
        # 如果有相关新闻，取前5条；否则取通用新闻前3条
        if relevant:
            headlines = relevant[:5]
        else:
            headlines = [n["title"] for n in crypto_news[:3]]

    # 2) 尝试 CoinGecko trending 作为补充
    if len(headlines) < 3:
        trending = await _fetch_coingecko_trending()
        trending_symbols = [t["symbol"].upper() for t in trending]
        if symbol in trending_symbols:
            rank = trending_symbols.index(symbol)
            headlines.append(f"{symbol} is trending on CoinGecko (search rank #{rank + 1})")
            if data_source == "Simulated":
                data_source = "CoinGecko"

    # 3) 降级到模拟数据
    is_fallback = False
    if not headlines:
        coin_news = _FALLBACK_NEWS.get(symbol, [])
        if coin_news:
            headlines = random.sample(coin_news, min(3, len(coin_news)))
        headlines.extend(random.sample(_GENERAL_FALLBACK, min(2, len(_GENERAL_FALLBACK))))
        is_fallback = True
        data_source = "Simulated (Fallback)"

    # 情绪分析
    sentiments = [_analyze_headline(h) for h in headlines]
    bullish = sentiments.count("bullish")
    bearish = sentiments.count("bearish")

    if bullish > bearish + 1:
        overall = "bullish"
    elif bearish > bullish + 1:
        overall = "bearish"
    else:
        overall = "neutral"

    return {
        "symbol": symbol,
        "sentiment": overall,
        "bullish_signals": bullish,
        "bearish_signals": bearish,
        "headlines": headlines,
        "source": data_source,
        "data_quality": "fallback" if is_fallback else "real",
        "last_updated": _time.strftime("%Y-%m-%d %H:%M:%S"),
    }
