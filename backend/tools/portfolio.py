"""Portfolio Simulator — 根据风险偏好、市场数据和新闻情绪动态生成投资组合。"""

import logging
from typing import Any

logger = logging.getLogger(__name__)

# ── 基础收益率（年化） ─────────────────────────────────────────────────────
YIELD_RATES: dict[str, float] = {
    "USDC": 0.045,
    "BTC": 0.08,
    "ETH": 0.10,
    "SOL": 0.14,
    "AVAX": 0.12,
    "DOGE": 0.06,
    "XRP": 0.05,
    "ADA": 0.07,
    "LINK": 0.09,
    "DOT": 0.08,
    "BNB": 0.07,
}

# ── 基础风险系数 ──────────────────────────────────────────────────────────
RISK_FACTORS: dict[str, float] = {
    "USDC": 0.05, "BTC": 0.60, "ETH": 0.65, "SOL": 0.75,
    "AVAX": 0.70, "DOGE": 0.85, "XRP": 0.60, "ADA": 0.65,
    "LINK": 0.70, "DOT": 0.65, "BNB": 0.55,
}


def _calculate_dynamic_allocation(
    capital: float,
    risk_profile: str,
    market_data: dict[str, Any],
    news_sentiment: dict[str, Any] | None,
) -> tuple[dict[str, float], dict[str, float]]:
    """
    根据市场数据和新闻情绪动态计算资产配置和预期收益。

    Returns:
        (allocation, expected_returns): 配置比例和各资产预期年化
    """
    # 分析市场状态
    bullish_assets = []
    bearish_assets = []
    volatile_assets = []

    for sym, data in market_data.items():
        if not isinstance(data, dict):
            continue
        change = data.get("change_24h", 0) or data.get("price_change_24h", 0)
        trend = data.get("trend", "stable")
        if change > 3:
            bullish_assets.append(sym)
        elif change < -3:
            bearish_assets.append(sym)
        if abs(change) > 5:
            volatile_assets.append(sym)

    # 分析新闻情绪
    sentiment_bullish = 0
    sentiment_bearish = 0
    if news_sentiment:
        if isinstance(news_sentiment, dict):
            # 兼容 orchestrator 传入的格式
            details = news_sentiment.get("details", news_sentiment)
            if isinstance(details, dict):
                for v in details.values():
                    if isinstance(v, dict):
                        sentiment_bullish += v.get("bullish_signals", 0)
                        sentiment_bearish += v.get("bearish_signals", 0)

    # 确定可用资产（优先用户提到的 + 市场数据中的）
    available_assets = set(market_data.keys())
    available_assets.add("USDC")  # 总是保留稳定币
    available_assets = [a for a in available_assets if a in YIELD_RATES]

    if not available_assets:
        available_assets = ["USDC", "BTC", "ETH"]

    # 动态调整配置
    allocation: dict[str, float] = {}

    # 根据风险偏好确定基础
    if risk_profile == "conservative":
        base = {"USDC": 0.50, "BTC": 0.25, "ETH": 0.25}
    elif risk_profile == "aggressive":
        base = {"USDC": 0.05, "BTC": 0.30, "ETH": 0.35, "SOL": 0.30}
    else:
        base = {"USDC": 0.25, "BTC": 0.30, "ETH": 0.35, "SOL": 0.10}

    # 只保留可用资产
    for sym, pct in base.items():
        if sym in available_assets or sym == "USDC":
            allocation[sym] = pct

    # 如果用户提到了其他资产，分配一部分给它们
    user_assets = [a for a in available_assets if a not in allocation and a != "USDC"]
    if user_assets:
        # 从非稳定币部分拿出 20% 分配给用户资产
        reduce_from = [s for s in allocation if s != "USDC"]
        if reduce_from:
            reduce_amount = 0.20
            per_reduce = reduce_amount / len(reduce_from)
            for s in reduce_from:
                allocation[s] = max(0, allocation.get(s, 0) - per_reduce)
            per_user = reduce_amount / len(user_assets)
            for u in user_assets:
                allocation[u] = per_user

    # 市场情绪调整
    if sentiment_bullish > sentiment_bearish + 2:
        # 看涨：减少稳定币，增加风险资产
        if "USDC" in allocation:
            shift = min(0.15, allocation["USDC"] * 0.3)
            allocation["USDC"] -= shift
            risky = [s for s in allocation if s != "USDC"]
            if risky:
                shift_per = shift / len(risky)
                for s in risky:
                    allocation[s] += shift_per
    elif sentiment_bearish > sentiment_bullish + 2:
        # 看跌：增加稳定币，减少风险资产
        risky = [s for s in allocation if s != "USDC"]
        if risky:
            shift = min(0.15, sum(allocation.get(s, 0) for s in risky) * 0.3)
            per_reduce = shift / len(risky)
            for s in risky:
                allocation[s] = max(0, allocation.get(s, 0) - per_reduce)
            allocation["USDC"] = allocation.get("USDC", 0) + shift

    # 归一化
    total = sum(allocation.values())
    if total > 0:
        allocation = {k: v / total for k, v in allocation.items()}

    # 计算预期收益（结合市场数据动态调整）
    expected_returns: dict[str, float] = {}
    for sym in allocation:
        base_rate = YIELD_RATES.get(sym, 0.05)
        # 根据 24h 趋势微调
        data = market_data.get(sym, {})
        change = data.get("change_24h", 0) or data.get("price_change_24h", 0) or 0
        # 趋势加成（最多 ±3%）
        trend_bonus = max(-0.03, min(0.03, change / 100))
        expected_returns[sym] = round(base_rate + trend_bonus, 4)

    return allocation, expected_returns


def _calculate_portfolio_risk(allocation: dict[str, float]) -> float:
    """计算组合风险评分 (0-1)"""
    risk = 0.0
    for sym, pct in allocation.items():
        factor = RISK_FACTORS.get(sym, 0.5)
        risk += pct * factor
    return round(min(1.0, risk), 2)


async def simulate_portfolio(
    capital: float,
    risk_profile: str,
    market_data: dict[str, Any] | None = None,
    news_sentiment: dict[str, Any] | None = None,
    user_intent: str = "",
) -> dict[str, Any]:
    """根据资金、风险偏好、市场数据和新闻情绪生成投资组合模拟。

    Args:
        capital: 投入资金（USD）
        risk_profile: 风险偏好 — conservative / neutral / aggressive
        market_data: 市场数据字典（来自 get_market_data）
        news_sentiment: 新闻情绪（来自 get_news_sentiment）
        user_intent: 用户意图描述
    """
    market_data = market_data or {}

    allocation_pcts, expected_returns = _calculate_dynamic_allocation(
        capital, risk_profile, market_data, news_sentiment,
    )

    # 构建详细配置
    allocation_details: dict[str, dict[str, Any]] = {}
    for asset, pct in allocation_pcts.items():
        data = market_data.get(asset, {})
        price = data.get("price") or data.get("price", 0)
        change_24h = data.get("change_24h", 0) or data.get("price_change_24h", 0) or 0
        allocation_details[asset] = {
            "percentage": round(pct * 100),
            "amount": round(capital * pct, 2),
            "current_price": price,
            "change_24h": round(change_24h, 2),
            "expected_annual_return": f"{expected_returns.get(asset, 0.05) * 100:.1f}%",
        }

    # 加权平均预期收益
    total_expected = sum(
        pct * expected_returns.get(sym, 0.05)
        for sym, pct in allocation_pcts.items()
    )

    risk_score = _calculate_portfolio_risk(allocation_pcts)
    risk_level = "low" if risk_score < 0.35 else ("high" if risk_score > 0.65 else "medium")

    return {
        "capital": capital,
        "allocation": allocation_details,
        "expected_return": f"{total_expected * 100:.1f}%",
        "risk_level": risk_level,
        "risk_score": risk_score,
        "market_analysis": {
            "bullish_assets": [s for s, d in market_data.items()
                               if isinstance(d, dict) and (d.get("change_24h") or 0) > 3],
            "bearish_assets": [s for s, d in market_data.items()
                               if isinstance(d, dict) and (d.get("change_24h") or 0) < -3],
        },
    }
