"""Market Data Tool — 通过 CoinGecko 免费 API 获取加密市场数据，失败时使用 fallback 模拟数据。"""

import time
from typing import Any

import httpx

from core.retry import with_retry_async, API_CONFIG

# ── Symbol → CoinGecko ID 映射 ──────────────────────────────────────────────
SYMBOL_TO_COINGECKO_ID: dict[str, str] = {
    "BTC": "bitcoin",
    "ETH": "ethereum",
    "SOL": "solana",
    "USDC": "usd-coin",
    "WBTC": "wrapped-bitcoin",
}

# ── 简易缓存 (TTL 60s) ─────────────────────────────────────────────────────
_cache: dict[str, tuple[float, dict[str, Any]]] = {}
CACHE_TTL = 60  # 秒


def _cache_get(symbol: str) -> dict[str, Any] | None:
    entry = _cache.get(symbol.upper())
    if entry is None:
        return None
    ts, data = entry
    if time.time() - ts > CACHE_TTL:
        del _cache[symbol.upper()]
        return None
    return data


def _cache_set(symbol: str, data: dict[str, Any]) -> None:
    _cache[symbol.upper()] = (time.time(), data)


# ── Fallback 模拟数据 ───────────────────────────────────────────────────────
FALLBACK_DATA: dict[str, dict[str, Any]] = {
    "BTC": {
        "symbol": "BTC",
        "price": 67500.0,
        "change_24h": 1.8,
        "volume": "high",
        "trend": "bullish",
        "market_cap": 1_320_000_000_000,
    },
    "ETH": {
        "symbol": "ETH",
        "price": 2450.0,
        "change_24h": -2.3,
        "volume": "high",
        "trend": "volatile",
        "market_cap": 295_000_000_000,
    },
    "SOL": {
        "symbol": "SOL",
        "price": 148.0,
        "change_24h": 3.5,
        "volume": "medium",
        "trend": "bullish",
        "market_cap": 65_000_000_000,
    },
    "USDC": {
        "symbol": "USDC",
        "price": 1.0,
        "change_24h": 0.01,
        "volume": "very_high",
        "trend": "stable",
        "market_cap": 33_000_000_000,
    },
    "WBTC": {
        "symbol": "WBTC",
        "price": 67400.0,
        "change_24h": 1.7,
        "volume": "medium",
        "trend": "bullish",
        "market_cap": 9_500_000_000,
    },
}


def _determine_trend(change_24h: float) -> str:
    if abs(change_24h) < 0.5:
        return "stable"
    if change_24h > 3:
        return "bullish"
    if change_24h < -3:
        return "bearish"
    return "volatile"


def _determine_volume(total_volume: float | None) -> str:
    if total_volume is None:
        return "medium"
    if total_volume > 5_000_000_000:
        return "very_high"
    if total_volume > 1_000_000_000:
        return "high"
    if total_volume > 200_000_000:
        return "medium"
    return "low"


def _make_result(
    symbol: str,
    price: float,
    change_24h: float,
    volume: str,
    trend: str,
    market_cap: float,
    *,
    source: str,
    source_url: str | None = None,
    is_real: bool = False,
) -> dict[str, Any]:
    """构建统一的市场数据返回格式，包含数据源元信息"""
    return {
        "symbol": symbol.upper(),
        "price": round(price, 2) if price else 0,
        "change_24h": round(change_24h, 2),
        "volume": volume,
        "trend": trend,
        "market_cap": market_cap,
        "source": source,
        "source_url": source_url,
        "last_updated": time.strftime("%Y-%m-%d %H:%M:%S"),
        "is_real_data": is_real,
        "data_quality": "real" if is_real else "fallback",
    }


async def _fetch_from_coingecko(symbol: str) -> dict[str, Any] | None:
    """从 CoinGecko 免费 API 获取市场数据（带重试）。"""
    coin_id = SYMBOL_TO_COINGECKO_ID.get(symbol.upper())
    if not coin_id:
        return None

    url = f"https://api.coingecko.com/api/v3/coins/{coin_id}"
    params = {
        "localization": "false",
        "tickers": "false",
        "market_data": "true",
        "community_data": "false",
        "developer_data": "false",
        "sparkline": "false",
    }

    @with_retry_async(config=API_CONFIG, fallback_value=None, log_prefix=f"CoinGecko[{symbol}]")
    async def _do_fetch():
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(url, params=params)
            if resp.status_code != 200:
                raise httpx.HTTPStatusError(f"HTTP {resp.status_code}", request=resp.request, response=resp)
            return resp.json()

    try:
        data = await _do_fetch()
        if data is None:
            return None

        md = data.get("market_data", {})
        price = md.get("current_price", {}).get("usd", 0)
        change_24h = md.get("price_change_percentage_24h", 0) or 0
        market_cap = md.get("market_cap", {}).get("usd", 0)
        total_volume = md.get("total_volume", {}).get("usd")

        return _make_result(
            symbol,
            price,
            change_24h,
            _determine_volume(total_volume),
            _determine_trend(change_24h),
            market_cap,
            source="CoinGecko API",
            source_url=f"https://www.coingecko.com/en/coins/{coin_id}",
            is_real=True,
        )
    except Exception:
        return None


def _get_fallback(symbol: str) -> dict[str, Any]:
    """获取 fallback 模拟数据"""
    fb = FALLBACK_DATA.get(symbol, {
        "symbol": symbol,
        "price": 0,
        "change_24h": 0,
        "volume": "low",
        "trend": "unknown",
        "market_cap": 0,
    })
    return _make_result(
        symbol,
        fb.get("price", 0),
        fb.get("change_24h", 0),
        fb.get("volume", "low"),
        fb.get("trend", "unknown"),
        fb.get("market_cap", 0),
        source="Simulated (Fallback)",
        is_real=False,
    )


async def get_market_data(symbol: str) -> dict[str, Any]:
    """获取指定币种的市场数据。

    优先使用缓存 → 其次 CoinGecko API → 最终 fallback 模拟数据。
    返回值包含 data_quality 字段标识数据可靠性。
    """
    symbol = symbol.upper()

    # 1) 缓存命中
    cached = _cache_get(symbol)
    if cached is not None:
        return cached

    # 2) 调用 CoinGecko（带重试）
    result = await _fetch_from_coingecko(symbol)
    if result is not None:
        _cache_set(symbol, result)
        return result

    # 3) Fallback
    return _get_fallback(symbol)
