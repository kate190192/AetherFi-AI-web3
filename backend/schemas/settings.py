from pydantic import BaseModel, Field
from typing import Optional, Dict, List


class DataSourceConfig(BaseModel):
    provider: str = "coingecko_binance"
    coingecko_base_url: str = "https://api.coingecko.com/api/v3"
    coingecko_api_key: Optional[str] = None
    binance_base_url: str = "https://api.binance.com/api/v3"
    binance_api_key: Optional[str] = None
    custom_base_url: Optional[str] = None
    custom_api_key: Optional[str] = None
    custom_provider_name: Optional[str] = None


class AppSettings(BaseModel):
    risk_profile: str = "neutral"
    language: str = "zh"
    data_sources: DataSourceConfig = Field(default_factory=DataSourceConfig)
    llm_provider: str = "ollama"
    llm_base_url: str = "http://localhost:11434"
    llm_model: str = "qwen3:8b"
    llm_api_key: Optional[str] = None


default_settings = AppSettings()
