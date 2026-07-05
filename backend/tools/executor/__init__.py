"""执行器工厂 — 根据配置返回对应执行器。

使用方式：
    from tools.executor import get_executor
    executor = get_executor()
    result = await executor.rebalance_portfolio(allocation, capital, prices)

切换执行器：
    在 .env 中设置 EXECUTOR_TYPE=simulated 或 real_evm
"""

import os
from typing import Any

from tools.executor.base import BaseTransactionExecutor
from tools.executor.simulated import SimulatedExecutor


_executor_instance: BaseTransactionExecutor | None = None


def get_executor() -> BaseTransactionExecutor:
    """获取全局交易执行器单例。

    优先从环境变量读取 EXECUTOR_TYPE：
    - simulated: 模拟执行器（默认）
    - real_evm: 真实 EVM 链执行器
    """
    global _executor_instance
    if _executor_instance is not None:
        return _executor_instance

    executor_type = os.getenv("EXECUTOR_TYPE", "simulated").lower()

    if executor_type == "real_evm":
        try:
            from tools.executor.real_evm import RealEVMExecutor
            _executor_instance = RealEVMExecutor()
        except Exception as e:
            print(f"[WARNING] Failed to initialize RealEVMExecutor: {e}")
            print("[WARNING] Falling back to SimulatedExecutor")
            _executor_instance = SimulatedExecutor()
    else:
        _executor_instance = SimulatedExecutor()

    return _executor_instance


def reset_executor():
    """重置执行器单例（用于测试或配置变更后）。"""
    global _executor_instance
    _executor_instance = None


__all__ = ["get_executor", "reset_executor", "BaseTransactionExecutor"]
