"""Web3 模拟交易引擎 — 使用执行器抽象层。

通过执行器工厂模式，支持切换模拟/真实交易。

当前默认使用模拟执行器，价格基于真实市场数据计算。
切换真实交易：设置 EXECUTOR_TYPE=real_evm
"""

from typing import Any

from tools.executor import get_executor


async def simulate_web3_execution(
    allocation: dict[str, Any],
    capital: float,
    token_prices: dict[str, float] | None = None,
) -> dict[str, Any]:
    """执行 Web3 交易模拟（基于执行器抽象层）。

    Args:
        allocation: 资产配置 {"ETH": {"percentage": 40, "amount": 400}, ...}
        capital: 总资金（USD）
        token_prices: 代币实时价格（可选，传入则基于真实价格计算）

    Returns:
        交易结果字典（模拟或真实，取决于 EXECUTOR_TYPE 配置）
    """
    executor = get_executor()
    return await executor.rebalance_portfolio(
        allocation=allocation,
        capital=capital,
        token_prices=token_prices,
    )
