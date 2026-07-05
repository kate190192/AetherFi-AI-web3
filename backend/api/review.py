import json
import os
from datetime import datetime
from typing import Any, Dict, List

from fastapi import APIRouter, HTTPException

from core.logging import logger
from schemas.models import (
    ReviewAnalysisRequest,
    ReviewAnalysisResponse,
    ReviewIterateRequest,
    ReviewIterateResponse,
)

router = APIRouter(prefix="/review", tags=["review"])

REVIEW_RECORDS_DIR = "reviews"
os.makedirs(REVIEW_RECORDS_DIR, exist_ok=True)


def _save_review_record(record: Dict[str, Any]) -> None:
    file_path = os.path.join(REVIEW_RECORDS_DIR, f"{record['run_id']}.json")
    with open(file_path, "w", encoding="utf-8") as f:
        json.dump(record, f, ensure_ascii=False, indent=2)


def _load_review_record(run_id: str) -> Dict[str, Any] | None:
    file_path = os.path.join(REVIEW_RECORDS_DIR, f"{run_id}.json")
    if os.path.exists(file_path):
        with open(file_path, "r", encoding="utf-8") as f:
            return json.load(f)
    return None


def _get_all_review_records() -> List[Dict[str, Any]]:
    records = []
    for filename in os.listdir(REVIEW_RECORDS_DIR):
        if filename.endswith(".json"):
            file_path = os.path.join(REVIEW_RECORDS_DIR, filename)
            with open(file_path, "r", encoding="utf-8") as f:
                records.append(json.load(f))
    records.sort(key=lambda x: x["created_at"], reverse=True)
    return records


@router.post("/analyze", response_model=ReviewAnalysisResponse)
async def analyze_agent_run(request: ReviewAnalysisRequest):
    """分析之前的 Agent 运行"""
    run_logs = logger.get_logs_by_run_id(request.run_id)
    if not run_logs:
        raise HTTPException(status_code=404, detail=f"未找到 run_id: {request.run_id} 的日志记录")

    agent_run_log = None
    decisions = []
    tool_calls = []

    for log in run_logs:
        if log["operation_type"] == "agent_run":
            agent_run_log = log
        elif log["operation_type"] == "decision":
            decisions.append(log)
        elif log["operation_type"] == "tool_call":
            tool_calls.append(log)

    if not agent_run_log:
        raise HTTPException(status_code=404, detail="未找到 Agent 运行记录")

    simulated_data = agent_run_log.get("result", {})
    current_market_data = request.current_market_data

    accuracy_score = 0.75
    comparison_details = {}

    if simulated_data and current_market_data:
        if isinstance(simulated_data, dict):
            simulated_allocation = simulated_data.get("allocation", {})
            if isinstance(simulated_allocation, dict) and isinstance(current_market_data, dict):
                comparison_details = {}
                matched_coins = 0
                total_diff = 0.0
                for coin, sim_price in simulated_allocation.items():
                    if coin in current_market_data:
                        matched_coins += 1
                        real_price = current_market_data[coin]
                        diff = abs(float(sim_price) - float(real_price)) / float(real_price)
                        total_diff += diff
                        comparison_details[coin] = {
                            "simulated_price": sim_price,
                            "real_price": real_price,
                            "deviation": f"{diff * 100:.2f}%",
                        }
                if matched_coins > 0:
                    accuracy_score = max(0, 1 - (total_diff / matched_coins))

    recommendations = []
    if accuracy_score < 0.8:
        recommendations.append("建议重新获取市场数据以提高决策准确性")
    if len(tool_calls) < 3:
        recommendations.append("建议增加更多工具调用以获取更全面的市场信息")
    if not decisions:
        recommendations.append("决策记录不足，建议增强决策追踪")

    analysis = {
        "run_id": request.run_id,
        "accuracy_score": round(accuracy_score, 2),
        "comparison_details": comparison_details,
        "simulated_data_summary": {
            "total_steps": len(run_logs),
            "tool_calls_count": len(tool_calls),
            "decisions_count": len(decisions),
        },
    }

    record = {
        "run_id": request.run_id,
        "created_at": datetime.now().isoformat(),
        "analysis": analysis,
        "recommendations": recommendations,
        "iterations": [],
    }
    _save_review_record(record)
    logger.log_review(
        user_id=agent_run_log.get("user_id", "unknown"),
        run_id=request.run_id,
        analysis=analysis,
        recommendations=recommendations,
    )

    return ReviewAnalysisResponse(
        success=True,
        message="分析完成",
        analysis=analysis,
        recommendations=recommendations,
    )


@router.post("/iterate", response_model=ReviewIterateResponse)
async def create_iteration(request: ReviewIterateRequest):
    """基于审查创建迭代"""
    record = _load_review_record(request.run_id)
    if not record:
        raise HTTPException(status_code=404, detail=f"未找到 run_id: {request.run_id} 的审查记录")

    iteration = {
        "iteration_id": f"{request.run_id}-iter-{len(record['iterations']) + 1}",
        "created_at": datetime.now().isoformat(),
        "improvements": request.improvements,
        "status": "pending",
    }

    record["iterations"].append(iteration)
    _save_review_record(record)

    return ReviewIterateResponse(
        success=True,
        message="迭代创建成功",
        iteration=iteration,
    )


@router.get("/history", response_model=Dict[str, Any])
async def list_review_history():
    """列出所有审查记录"""
    records = _get_all_review_records()
    return {
        "count": len(records),
        "reviews": records,
    }


@router.get("/{run_id}", response_model=Dict[str, Any])
async def get_review(run_id: str):
    """获取特定审查记录"""
    record = _load_review_record(run_id)
    if not record:
        raise HTTPException(status_code=404, detail=f"未找到 run_id: {run_id} 的审查记录")
    return record