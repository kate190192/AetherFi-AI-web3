"""AetherFi Tools — 市场数据、新闻情绪、投资组合模拟、Web3 模拟引擎。"""

from tools.market import get_market_data
from tools.news import get_news_sentiment
from tools.portfolio import simulate_portfolio
from tools.web3_sim import simulate_web3_execution

__all__ = [
    "get_market_data",
    "get_news_sentiment",
    "simulate_portfolio",
    "simulate_web3_execution",
]
