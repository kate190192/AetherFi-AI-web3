"""交易执行器抽象基类 — 预留真实链上交易接入点。

本模块定义了统一的交易执行器接口，当前使用模拟实现，
未来可无缝切换为真实链上交易（如 EVM、Solana 等）。

扩展方式：
    1. 继承 BaseTransactionExecutor
    2. 实现 execute_swap、get_balance、get_gas_price 等方法
    3. 在 executor_factory 中注册新执行器
    4. 通过 .env 配置 EXECUTOR_TYPE 切换
"""

from abc import ABC, abstractmethod
from typing import Any


class BaseTransactionExecutor(ABC):
    """交易执行器抽象基类。

    所有交易执行器（模拟 / 真实 EVM / Solana 等）必须实现以下接口。
    """

    executor_type: str = "base"
    is_real: bool = False

    @abstractmethod
    async def get_balance(self, address: str, token: str) -> dict[str, Any]:
        """获取钱包地址的代币余额。

        Args:
            address: 钱包地址
            token: 代币符号（如 ETH、USDC）

        Returns:
            {"token": "ETH", "balance": 1.23, "decimals": 18}
        """
        ...

    @abstractmethod
    async def execute_swap(
        self,
        from_token: str,
        to_token: str,
        amount: float,
        slippage: float = 0.01,
    ) -> dict[str, Any]:
        """执行代币兑换。

        Args:
            from_token: 源代币符号
            to_token: 目标代币符号
            amount: 源代币数量
            slippage: 滑点容忍度（默认 1%）

        Returns:
            {
                "tx_hash": "0x...",
                "from_token": "USDC",
                "to_token": "ETH",
                "from_amount": 1000,
                "to_amount": 0.42,
                "gas_fee": "0.002 ETH",
                "status": "confirmed",
                "block_number": 12345678,
            }
        """
        ...

    @abstractmethod
    async def rebalance_portfolio(
        self,
        allocation: dict[str, dict[str, Any]],
        capital: float,
        token_prices: dict[str, float] | None = None,
    ) -> dict[str, Any]:
        """执行投资组合再平衡。

        Args:
            allocation: 资产配置 {token: {percentage, amount}}
            capital: 总资金（USD）
            token_prices: 代币价格映射（用于计算持有量）

        Returns:
            {
                "wallet_address": "0x...",
                "transactions": [...],
                "total_gas": "0.005 ETH",
                "new_wallet_state": {"ETH": 0.42, ...},
                "is_real_transaction": bool,
            }
        """
        ...

    @abstractmethod
    async def get_gas_price(self, chain: str = "ethereum") -> dict[str, Any]:
        """获取当前 Gas 价格。

        Args:
            chain: 链名称（ethereum / polygon 等）

        Returns:
            {"slow": "10 gwei", "standard": "20 gwei", "fast": "30 gwei"}
        """
        ...

    @abstractmethod
    async def simulate_defi_yield(
        self,
        portfolio: dict[str, float],
        protocol: str | None = None,
    ) -> dict[str, Any]:
        """模拟 / 查询 DeFi 收益。

        Args:
            portfolio: 资产组合 {token: amount}
            protocol: 协议名称（None 则自动选择最优）

        Returns:
            {
                "protocol": "Aave V3",
                "apy": "4.2%",
                "projected_annual_return": 42.0,
            }
        """
        ...
