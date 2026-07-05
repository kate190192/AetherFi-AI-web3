from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from core.journal import (
    create_journal_entry,
    update_user_decision,
    add_reflection,
    list_journal_entries,
    get_journal_entry,
    delete_journal_entry,
    generate_daily_summary,
)

router = APIRouter(prefix="/journal", tags=["journal"])


class CreateJournalRequest(BaseModel):
    user_id: str = "user_default"
    query: str
    market_context: Dict[str, Any] = Field(default_factory=dict)
    strategy_suggestion: Dict[str, Any] = Field(default_factory=dict)
    reasoning: str = ""
    risk_profile: str = "neutral"
    capital: float = 1000.0


class UserDecisionRequest(BaseModel):
    user_action: str
    user_decision: Optional[Dict[str, Any]] = None


class ReflectionRequest(BaseModel):
    reflection: str
    actual_outcome: Optional[Dict[str, Any]] = None
    accuracy_score: Optional[float] = None
    iteration_notes: Optional[List[str]] = None


@router.post("/entries", response_model=Dict[str, Any])
async def create_entry(request: CreateJournalRequest):
    entry = create_journal_entry(
        user_id=request.user_id,
        query=request.query,
        market_context=request.market_context,
        strategy_suggestion=request.strategy_suggestion,
        reasoning=request.reasoning,
        risk_profile=request.risk_profile,
        capital=request.capital,
    )
    return entry


@router.get("/entries", response_model=Dict[str, Any])
async def list_entries(
    date: Optional[str] = None,
    user_id: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = Query(default=50, le=200),
):
    entries = list_journal_entries(
        date_str=date,
        user_id=user_id,
        status=status,
        limit=limit,
    )
    return {
        "entries": entries,
        "count": len(entries),
    }


@router.get("/entries/{entry_id}", response_model=Dict[str, Any])
async def get_entry(entry_id: str):
    entry = get_journal_entry(entry_id)
    if not entry:
        raise HTTPException(status_code=404, detail="日记条目不存在")
    return entry


@router.patch("/entries/{entry_id}/decision", response_model=Dict[str, Any])
async def patch_decision(entry_id: str, request: UserDecisionRequest):
    entry = update_user_decision(
        entry_id=entry_id,
        user_action=request.user_action,
        user_decision=request.user_decision,
    )
    if not entry:
        raise HTTPException(status_code=404, detail="日记条目不存在")
    return entry


@router.patch("/entries/{entry_id}/reflection", response_model=Dict[str, Any])
async def patch_reflection(entry_id: str, request: ReflectionRequest):
    entry = add_reflection(
        entry_id=entry_id,
        reflection=request.reflection,
        actual_outcome=request.actual_outcome,
        accuracy_score=request.accuracy_score,
        iteration_notes=request.iteration_notes,
    )
    if not entry:
        raise HTTPException(status_code=404, detail="日记条目不存在")
    return entry


@router.delete("/entries/{entry_id}", response_model=Dict[str, Any])
async def delete_entry(entry_id: str):
    success = delete_journal_entry(entry_id)
    if not success:
        raise HTTPException(status_code=404, detail="日记条目不存在")
    return {"success": True, "entry_id": entry_id}


@router.get("/summary/{date}", response_model=Dict[str, Any])
async def get_summary(date: Optional[str] = None):
    summary = generate_daily_summary(date)
    return summary
