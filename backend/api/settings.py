from fastapi import APIRouter, HTTPException
from schemas.settings import AppSettings
from core.settings_store import get_settings, save_settings
import httpx

router = APIRouter(prefix="/settings", tags=["settings"])


@router.get("")
async def read_settings():
    try:
        settings = get_settings()
        return settings
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("")
async def update_settings(settings: AppSettings):
    try:
        saved = save_settings(settings)
        return saved
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("")
async def patch_settings(partial: dict):
    try:
        current = get_settings()
        updated = current.model_copy(update=partial)
        saved = save_settings(updated)
        return saved
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/data-sources")
async def get_data_sources():
    settings = get_settings()
    return {
        "current_provider": settings.data_sources.provider,
        "available_providers": [
            {"id": "coingecko", "name": "CoinGecko", "description": "免费加密货币数据 API"},
            {"id": "binance", "name": "Binance", "description": "币安交易所实时行情"},
            {"id": "coingecko_binance", "name": "CoinGecko + Binance", "description": "双源验证（默认）"},
            {"id": "custom", "name": "自定义 API", "description": "自定义第三方数据源"},
        ],
        "config": settings.data_sources,
    }


@router.get("/llm/models")
async def get_llm_models():
    settings = get_settings()
    base_url = settings.llm_base_url or "http://localhost:11434"
    try:
        async with httpx.AsyncClient(timeout=5) as client:
            response = await client.get(f"{base_url}/api/tags")
            response.raise_for_status()
            data = response.json()
            models = []
            for model in data.get("models", []):
                models.append({
                    "name": model.get("name", ""),
                    "size": model.get("size", 0),
                    "modified_at": model.get("modified_at", ""),
                })
            return {"models": models, "count": len(models)}
    except httpx.ConnectError:
        raise HTTPException(status_code=503, detail=f"无法连接到 Ollama 服务 ({base_url})，请确认 Ollama 已启动")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取模型列表失败: {str(e)}")
