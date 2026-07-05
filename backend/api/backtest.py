"""Backtest API — 推荐历史、真实盈亏追踪、胜率统计。"""

from fastapi import APIRouter, HTTPException
from core.backtest import get_performance, get_recommendation_history

router = APIRouter(prefix="/backtest", tags=["backtest"])


@router.get("/performance")
async def get_performance_stats():
    """获取所有推荐的真实表现（胜率、盈亏、平均收益）"""
    try:
        result = await get_performance()
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取表现数据失败: {str(e)}")


@router.get("/history")
async def get_history(limit: int = 20):
    """获取推荐历史记录"""
    try:
        records = await get_recommendation_history(limit=limit)
        return {"count": len(records), "records": records}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取历史记录失败: {str(e)}")
