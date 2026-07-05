from enum import Enum
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class RiskProfile(str, Enum):
    conservative = "conservative"
    neutral = "neutral"
    aggressive = "aggressive"


class DataSourceMeta(BaseModel):
    """数据源元信息 — 标识数据的来源和可靠性"""
    provider: str = ""
    is_real: bool = False
    quality: str = "unknown"  # real / fallback / mixed / unknown
    source_url: str | None = None
    last_updated: str | None = None


class AgentRequest(BaseModel):
    query: str
    capital: float = Field(..., gt=0)
    user_id: str
    risk_profile: RiskProfile = RiskProfile.neutral
    skip_web3: bool = False


class StepUpdate(BaseModel):
    type: str
    step: str
    status: str
    data: dict[str, Any] = Field(default_factory=dict)


class Decision(BaseModel):
    action: str  # invest / hold / avoid
    allocation: dict[str, float] = Field(default_factory=dict)
    reasoning: list[str] = Field(default_factory=list)
    risk_score: float = Field(..., ge=0, le=1)
    confidence: float = Field(..., ge=0, le=1)


class PortfolioState(BaseModel):
    wallet_state: dict[str, Any] = Field(default_factory=dict)
    projected_return: str = ""
    risk_level: str = ""
    allocation: dict[str, Any] = Field(default_factory=dict)
    capital: float = 0.0


class Web3Simulation(BaseModel):
    simulation: str = ""
    gas_fee: str = ""
    new_allocation: dict[str, float] = Field(default_factory=dict)
    tx_hash: str = ""


class AgentResponse(BaseModel):
    steps: list[StepUpdate] = Field(default_factory=list)
    decision: Decision | None = None
    portfolio: PortfolioState | None = None
    simulation: Web3Simulation | None = None
    risk_score: float = 0.0
    confidence: float = 0.0


class ReviewAnalysisRequest(BaseModel):
    run_id: str
    current_market_data: Dict[str, Any] = Field(default_factory=dict)


class ReviewAnalysisResponse(BaseModel):
    success: bool
    message: str
    analysis: Dict[str, Any] = Field(default_factory=dict)
    recommendations: List[str] = Field(default_factory=list)


class ReviewIterateRequest(BaseModel):
    run_id: str
    improvements: List[str] = Field(default_factory=list)


class ReviewIterateResponse(BaseModel):
    success: bool
    message: str
    iteration: Dict[str, Any] = Field(default_factory=dict)


class SingleMarketDataResponse(BaseModel):
    symbol: str
    name: str
    price: Optional[float] = None
    price_change_24h: Optional[float] = None
    market_cap: Optional[float] = None
    volume_24h: Optional[float] = None
    circulating_supply: Optional[float] = None


class MarketOverviewResponse(BaseModel):
    btc_price: Optional[float] = None
    btc_change: Optional[float] = None
    btc_change_1h: Optional[float] = None
    eth_price: Optional[float] = None
    eth_change: Optional[float] = None
    eth_change_1h: Optional[float] = None
    sol_price: Optional[float] = None
    sol_change: Optional[float] = None
    sol_change_1h: Optional[float] = None
    timestamp: str


class MarketTrendingResponse(BaseModel):
    coins: List[Dict[str, Any]] = Field(default_factory=list)
    count: int = 0
