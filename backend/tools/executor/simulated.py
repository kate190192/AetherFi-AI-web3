"""模拟交易执行器 — 基于真实市场价格的模拟执行。

当前使用 CoinGecko 真实价格数据计算持仓量，
交易行为（钱包地址、交易哈希、gas 费）为模拟生成。
"""

import hashlib
import random
import time
from typing import Any

from tools.executor.base import BaseTransactionExecutor


# ── 模拟参数 ────────────────────────────────────────────────────────────────
_GAS_FEES_GWEI: dict[str, dict[str, str]] = {
    "ethereum": {"slow": "12 gwei", "standard": "24 gwei", "fast": "36 gwei"},
    "polygon": {"slow": "30 gwei", "standard": "60 gwei", "fast": "90 gwei"},
    "arbitrum": {"slow": "0.1 gwei", "standard": "0.2 gwei", "fast": "0.3 gwei"},
}

# 模拟 gas 费用（按美元价值估算，用于展示）
_SWAP_GAS_USD = {
    "ETH": 4.0,
    "BTC": 3.5,
    "SOL": 0.5,
    "USDC": 2.0,
}

# DeFi 协议（模拟但基于真实协议名称和大致 APY 范围）
_DEFI_PROTOCOLS: list[dict[str, Any]] = [
    {"protocol": "Aave V3", "apy_range": (3.5, 5.0), "chain": "Ethereum"},
    {"protocol": "Compound V3", "apy_range": (3.0, 4.5), "chain": "Ethereum"},
    {"protocol": "Lido Staking", "apy_range": (3.0, 4.0), "chain": "Ethereum"},
    {"protocol": "Rocket Pool", "apy_range": (3.5, 4.5), "chain": "Ethereum"},
    {"protocol": "Uniswap V3 LP", "apy_range": (5.0, 15.0), "chain": "Ethereum"},
    {"protocol": "Curve Finance", "apy_range": (4.0, 8.0), "chain": "Ethereum"},
]


def _generate_wallet_address() -> str:
    seed = f"wallet_{random.randint(0, 999999)}_{time.time()}"
    h = hashlib.sha256(seed.encode()).hexdigest()
    return f"0x{h[:8]}...{h[-4:]}"


def _generate_full_wallet_address() -> str:
    seed = f"wallet_full_{random.randint(0, 999999)}_{time.time()}"
    return "0x" + hashlib.sha256(seed.encode()).hexdigest()[:40]


def _generate_tx_hash() -> str:
    seed = f"tx_{random.randint(0, 999999)}_{time.time()}"
    h = hashlib.sha256(seed.encode()).hexdigest()
    return f"0x{h[:12]}...{h[-6:]}"


class SimulatedExecutor(BaseTransactionExecutor):
    """模拟交易执行器。

    价格数据：基于真实市场价格（通过 token_prices 参数传入）
    交易行为：纯模拟（钱包地址、tx hash、gas 为随机生成）

    用途：Demo、测试、策略预演
    """

    executor_type = "simulated"
    is_real = False

    def __init__(self, default_chain: str = "ethereum"):
        self.default_chain = default_chain
        self._simulated_wallet: str = _generate_full_wallet_address()

    async def get_balance(self, address: str, token: str) -> dict[str, Any]:
        return {
            "token": token,
            "balance": random.uniform(0.1, 10.0),
            "decimals": 18,
            "is_simulated": True,
        }

    async def execute_swap(
        self,
        from_token: str,
        to_token: str,
        amount: float,
        slippage: float = 0.01,
    ) -> dict[str, Any]:
        gas_usd = _SWAP_GAS_USD.get(to_token, 2.0)
        gas_eth = gas_usd / 2500.0

        return {
            "tx_hash": _generate_tx_hash(),
            "from_token": from_token,
            "to_token": to_token,
            "from_amount": amount,
            "to_amount": round(amount * (1 - slippage * 0.5), 6),
            "gas_fee_usd": round(gas_usd, 2),
            "gas_fee_eth": f"{gas_eth:.4f} ETH",
            "status": "confirmed",
            "block_number": random.randint(18000000, 19000000),
            "is_simulated": True,
        }

    async def rebalance_portfolio(
        self,
        allocation: dict[str, dict[str, Any]],
        capital: float,
        token_prices: dict[str, float] | None = None,
    ) -> dict[str, Any]:
        """执行组合再平衡。

        token_prices 参数传入真实市场价格，用于计算持仓量。
        如果未传入，则使用估算价格。
        """
        wallet_address_short = _generate_wallet_address()
        wallet_address_full = self._simulated_wallet

        transactions: list[dict[str, Any]] = []
        total_gas_usd = 0.0
        wallet_state: dict[str, float] = {}

        prices = token_prices or {
            "ETH": 2450.0, "BTC": 67500.0, "SOL": 148.0, "USDC": 1.0,
        }

        for asset, details in allocation.items():
            amount = details.get("amount", 0)
            percentage = details.get("percentage", 0)
            if amount <= 0:
                continue

            price = prices.get(asset, 1.0)

            # 计算代币数量（基于真实价格）
            if price > 0:
                token_amount = round(amount / price, 6)
            else:
                token_amount = 0.0
            wallet_state[asset] = token_amount

            # 生成 swap 交易（非稳定币）
            if asset != "USDC":
                gas_usd = _SWAP_GAS_USD.get(asset, 2.0)
                gas_eth = gas_usd / (prices.get("ETH", 2500.0))
                total_gas_usd += gas_usd

                transactions.append({
                    "type": "swap",
                    "from_token": "USDC",
                    "to_token": asset,
                    "from_amount_usd": amount,
                    "to_amount_token": token_amount,
                    "price_at_execution": price,
                    "gas_fee_usd": round(gas_usd, 2),
                    "gas_fee_eth": f"{gas_eth:.4f} ETH",
                    "tx_hash": _generate_tx_hash(),
                    "status": "confirmed",
                    "block_number": random.randint(18000000, 19000000),
                    "is_simulated": True,
                })

        # 计算总 gas（ETH 和 USD 两种单位）
        eth_price = prices.get("ETH", 2500.0)
        total_gas_eth = total_gas_usd / eth_price

        # DeFi 收益模拟
        defi_info = await self.simulate_defi_yield(
            wallet_state,
            token_prices=prices,
        )

        return {
            "simulation": "rebalance executed",
            "simulation_type": "Price-Based Simulation",
            "is_real_transaction": False,
            "warning": (
                "This is a simulated transaction for demo purposes. "
                "Prices are real (from CoinGecko), but no actual blockchain "
                "interaction occurred."
            ),
            "wallet_address": wallet_address_short,
            "wallet_address_full": wallet_address_full,
            "transactions": transactions,
            "total_gas_usd": round(total_gas_usd, 2),
            "total_gas": f"{total_gas_eth:.4f} ETH (simulated)",
            "new_wallet_state": wallet_state,
            "defi_yield": defi_info,
            "data_source": "CoinGecko (prices) + Internal Sim (transactions)",
            "price_basis": "real_time" if token_prices else "estimated",
            "chain": self.default_chain,
            "simulated_at": time.strftime("%Y-%m-%d %H:%M:%S"),
        }

    async def get_gas_price(self, chain: str = "ethereum") -> dict[str, Any]:
        chain_lower = chain.lower()
        if chain_lower not in _GAS_FEES_GWEI:
            chain_lower = "ethereum"
        return {
            "chain": chain_lower,
            **_GAS_FEES_GWEI[chain_lower],
            "is_simulated": True,
        }

    async def simulate_defi_yield(
        self,
        portfolio: dict[str, float],
        protocol: str | None = None,
        token_prices: dict[str, float] | None = None,
    ) -> dict[str, Any]:
        prices = token_prices or {
            "ETH": 2450.0, "BTC": 67500.0, "SOL": 148.0, "USDC": 1.0,
        }

        if protocol:
            proto_info = next(
                (p for p in _DEFI_PROTOCOLS if p["protocol"].lower() == protocol.lower()),
                _DEFI_PROTOCOLS[0],
            )
        else:
            proto_info = random.choice(_DEFI_PROTOCOLS)

        apy_min, apy_max = proto_info["apy_range"]
        apy = round(random.uniform(apy_min, apy_max), 2)

        total_value = 0.0
        for token, amount in portfolio.items():
            price = prices.get(token, 1.0)
            total_value += amount * price

        projected_annual = round(total_value * apy / 100, 2)

        return {
            "protocol": proto_info["protocol"] + " (simulated)",
            "chain": proto_info["chain"],
            "apy": f"{apy}%",
            "projected_annual_return": projected_annual,
            "total_deposit_value": round(total_value, 2),
            "is_simulated": True,
        }
