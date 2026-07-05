from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException, Query

from core.logging import logger

router = APIRouter(prefix="/logs", tags=["logs"])


@router.get("/list", response_model=Dict[str, Any])
async def list_log_files(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=50),
):
    """列出日志文件（分页）"""
    all_files = logger.get_log_files()
    total = len(all_files)
    start = (page - 1) * page_size
    end = start + page_size
    files = all_files[start:end]

    return {
        "files": files,
        "page": page,
        "page_size": page_size,
        "total": total,
        "total_pages": (total + page_size - 1) // page_size,
    }


@router.get("/recent", response_model=Dict[str, Any])
async def get_recent_logs(limit: int = Query(50, ge=1, le=500)):
    """获取最近 N 条日志"""
    logs = logger.get_recent_logs(limit)
    return {
        "count": len(logs),
        "logs": logs,
    }


@router.get("/{date}", response_model=Dict[str, Any])
async def get_logs_for_date(date: str):
    """获取指定日期的日志"""
    logs = logger.get_logs_for_date(date)
    if not logs:
        raise HTTPException(status_code=404, detail=f"日志文件 {date} 不存在")

    return {
        "date": date,
        "count": len(logs),
        "logs": logs,
    }


@router.delete("/{date}", response_model=Dict[str, Any])
async def delete_log_file(date: str):
    """删除指定日期的日志文件"""
    success = logger.delete_log_file(date)
    if not success:
        raise HTTPException(status_code=404, detail=f"日志文件 {date} 不存在")

    return {"message": f"日志文件 {date} 删除成功"}