from typing import Any, Dict

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from tools.web3_sim import simulate_web3_execution
from tools.market import get_market_data
from tools.portfolio import simulate_portfolio

router = APIRouter(prefix="/web3", tags=["web3"])


class ConfirmSimulationRequest(BaseModel):
    allocation: Dict[str, Any] = Field(default_factory=dict)
    capital: float = 1000.0
    risk_profile: str = "neutral"


@router.post("/simulate/confirm")
async def confirm_web3_simulation(request: ConfirmSimulationRequest):
    """用户确认后执行 Web3 模拟"""
    try:
        allocation = request.allocation or {}
        
        token_prices: Dict[str, float] = {}
        if allocation:
            for asset in allocation.keys():
                try:
                    data = await get_market_data(asset)
                    if isinstance(data, dict) and "price" in data:
                        token_prices[asset] = data["price"]
                except Exception:
                    pass
        
        result = await simulate_web3_execution(
            allocation=allocation,
            capital=request.capital,
            token_prices=token_prices if token_prices else None,
        )
        
        return {
            "success": True,
            "data": result,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Web3 模拟执行失败: {str(e)}")


@router.post("/simulate/from-portfolio")
async def simulate_from_portfolio(request: ConfirmSimulationRequest):
    """从投资组合配置直接生成并执行 Web3 模拟"""
    try:
        portfolio = await simulate_portfolio(
            capital=request.capital,
            risk_profile=request.risk_profile,
            market_data={},
        )
        
        allocation = portfolio.get("allocation", {})
        token_prices: Dict[str, float] = {}
        
        if allocation:
            for asset in allocation.keys():
                try:
                    data = await get_market_data(asset)
                    if isinstance(data, dict) and "price" in data:
                        token_prices[asset] = data["price"]
                except Exception:
                    pass
        
        result = await simulate_web3_execution(
            allocation=allocation,
            capital=request.capital,
            token_prices=token_prices if token_prices else None,
        )
        
        return {
            "success": True,
            "portfolio": portfolio,
            "simulation": result,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"模拟执行失败: {str(e)}")
