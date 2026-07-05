import json
import os
import time
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Dict, List, Optional

DATA_DIR = Path(__file__).resolve().parent.parent / "data" / "journal"
DATA_DIR.mkdir(parents=True, exist_ok=True)

RETENTION_DAYS = 90

# 内存缓存：{date_str: (timestamp, entries)}
_cache: Dict[str, tuple[float, List[Dict[str, Any]]]] = {}
CACHE_TTL = 30  # 秒


def _get_date_str(date: Optional[datetime] = None) -> str:
    if date is None:
        date = datetime.now()
    return date.strftime("%Y-%m-%d")


def _get_file_path(date_str: str) -> Path:
    return DATA_DIR / f"journal_{date_str}.jsonl"


def _cleanup_old_files():
    cutoff = datetime.now() - timedelta(days=RETENTION_DAYS)
    for file_path in DATA_DIR.glob("journal_*.jsonl"):
        try:
            date_str = file_path.stem.replace("journal_", "")
            file_date = datetime.strptime(date_str, "%Y-%m-%d")
            if file_date < cutoff:
                file_path.unlink()
        except (ValueError, OSError):
            continue


def create_journal_entry(
    user_id: str,
    query: str,
    market_context: Dict[str, Any],
    strategy_suggestion: Dict[str, Any],
    reasoning: str,
    risk_profile: str = "neutral",
    capital: float = 1000.0,
) -> Dict[str, Any]:
    entry = {
        "entry_id": f"journal_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{user_id}",
        "timestamp": datetime.now().isoformat(),
        "user_id": user_id,
        "query": query,
        "risk_profile": risk_profile,
        "capital": capital,
        "market_snapshot": market_context,
        "ai_reasoning": reasoning,
        "strategy_suggestion": strategy_suggestion,
        "user_decision": None,
        "user_action": "pending",
        "actual_outcome": None,
        "reflection": None,
        "iteration_notes": [],
        "status": "created",
    }

    date_str = _get_date_str()
    file_path = _get_file_path(date_str)
    with open(file_path, "a", encoding="utf-8") as f:
        f.write(json.dumps(entry, ensure_ascii=False) + "\n")

    _cleanup_old_files()
    return entry


def update_user_decision(
    entry_id: str,
    user_action: str,
    user_decision: Optional[Dict[str, Any]] = None,
) -> Optional[Dict[str, Any]]:
    return _update_entry(
        entry_id,
        {
            "user_action": user_action,
            "user_decision": user_decision,
            "status": "user_responded",
        },
    )


def add_reflection(
    entry_id: str,
    reflection: str,
    actual_outcome: Optional[Dict[str, Any]] = None,
    accuracy_score: Optional[float] = None,
    iteration_notes: Optional[List[str]] = None,
) -> Optional[Dict[str, Any]]:
    updates = {
        "reflection": reflection,
        "status": "reviewed",
    }
    if actual_outcome:
        updates["actual_outcome"] = actual_outcome
    if accuracy_score is not None:
        updates["accuracy_score"] = accuracy_score
    if iteration_notes:
        updates["iteration_notes"] = iteration_notes

    return _update_entry(entry_id, updates)


def _update_entry(entry_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    found = None
    found_date = None

    date_str = _get_date_str()
    file_path = _get_file_path(date_str)
    if file_path.exists():
        lines = file_path.read_text(encoding="utf-8").strip().split("\n")
        updated_lines = []
        for line in lines:
            if not line.strip():
                continue
            entry = json.loads(line)
            if entry.get("entry_id") == entry_id:
                entry.update(updates)
                entry["updated_at"] = datetime.now().isoformat()
                found = entry
            updated_lines.append(json.dumps(entry, ensure_ascii=False))
        if found:
            file_path.write_text("\n".join(updated_lines) + "\n", encoding="utf-8")
            _cache.pop(date_str, None)  # 清除缓存
            return found

    for day_offset in range(1, RETENTION_DAYS):
        date = datetime.now() - timedelta(days=day_offset)
        date_str = _get_date_str(date)
        file_path = _get_file_path(date_str)
        if not file_path.exists():
            continue
        lines = file_path.read_text(encoding="utf-8").strip().split("\n")
        updated_lines = []
        found_any = False
        for line in lines:
            if not line.strip():
                continue
            entry = json.loads(line)
            if entry.get("entry_id") == entry_id:
                entry.update(updates)
                entry["updated_at"] = datetime.now().isoformat()
                found = entry
                found_any = True
            updated_lines.append(json.dumps(entry, ensure_ascii=False))
        if found_any:
            file_path.write_text("\n".join(updated_lines) + "\n", encoding="utf-8")
            _cache.pop(date_str, None)  # 清除缓存
            return found

    return found


def list_journal_entries(
    date_str: Optional[str] = None,
    user_id: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = 50,
) -> List[Dict[str, Any]]:
    entries = []

    if date_str:
        # 检查缓存
        now = time.time()
        if date_str in _cache:
            cached_ts, cached_entries = _cache[date_str]
            if now - cached_ts < CACHE_TTL:
                entries = cached_entries.copy()
        
        if not entries:
            file_path = _get_file_path(date_str)
            if file_path.exists():
                with open(file_path, "r", encoding="utf-8") as f:
                    for line in f:
                        line = line.strip()
                        if not line:
                            continue
                        entry = json.loads(line)
                        entries.append(entry)
            _cache[date_str] = (now, entries)
        
        # 过滤
        if user_id:
            entries = [e for e in entries if e.get("user_id") == user_id]
        if status:
            entries = [e for e in entries if e.get("status") == status]
    else:
        for day_offset in range(RETENTION_DAYS):
            date = datetime.now() - timedelta(days=day_offset)
            ds = _get_date_str(date)
            
            # 检查缓存
            now = time.time()
            if ds in _cache:
                cached_ts, cached_entries = _cache[ds]
                if now - cached_ts < CACHE_TTL:
                    day_entries = cached_entries.copy()
                else:
                    day_entries = []
            else:
                day_entries = []
            
            if not day_entries:
                file_path = _get_file_path(ds)
                if file_path.exists():
                    with open(file_path, "r", encoding="utf-8") as f:
                        for line in f:
                            line = line.strip()
                            if not line:
                                continue
                            entry = json.loads(line)
                            day_entries.append(entry)
                    _cache[ds] = (now, day_entries)
            
            if user_id:
                day_entries = [e for e in day_entries if e.get("user_id") == user_id]
            if status:
                day_entries = [e for e in day_entries if e.get("status") == status]
            
            entries.extend(day_entries)
            if len(entries) >= limit:
                break

    entries.sort(key=lambda e: e.get("timestamp", ""), reverse=True)
    return entries[:limit]


def get_journal_entry(entry_id: str) -> Optional[Dict[str, Any]]:
    for day_offset in range(RETENTION_DAYS):
        date = datetime.now() - timedelta(days=day_offset)
        date_str = _get_date_str(date)
        file_path = _get_file_path(date_str)
        if not file_path.exists():
            continue
        with open(file_path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                entry = json.loads(line)
                if entry.get("entry_id") == entry_id:
                    return entry
    return None


def delete_journal_entry(entry_id: str) -> bool:
    for day_offset in range(RETENTION_DAYS):
        date = datetime.now() - timedelta(days=day_offset)
        date_str = _get_date_str(date)
        file_path = _get_file_path(date_str)
        if not file_path.exists():
            continue
        lines = file_path.read_text(encoding="utf-8").strip().split("\n")
        new_lines = []
        found = False
        for line in lines:
            if not line.strip():
                continue
            entry = json.loads(line)
            if entry.get("entry_id") == entry_id:
                found = True
            else:
                new_lines.append(line)
        if found:
            if new_lines:
                file_path.write_text("\n".join(new_lines) + "\n", encoding="utf-8")
            else:
                file_path.unlink()
            return True
    return False


def generate_daily_summary(date_str: Optional[str] = None) -> Dict[str, Any]:
    if date_str is None:
        date_str = _get_date_str()

    entries = list_journal_entries(date_str=date_str)

    total = len(entries)
    user_responded = sum(1 for e in entries if e.get("status") == "user_responded")
    reviewed = sum(1 for e in entries if e.get("status") == "reviewed")

    avg_accuracy = None
    reviewed_with_score = [e for e in entries if e.get("accuracy_score") is not None]
    if reviewed_with_score:
        avg_accuracy = sum(e["accuracy_score"] for e in reviewed_with_score) / len(reviewed_with_score)

    return {
        "date": date_str,
        "total_entries": total,
        "user_responded": user_responded,
        "reviewed": reviewed,
        "average_accuracy": avg_accuracy,
        "entries": entries,
    }
