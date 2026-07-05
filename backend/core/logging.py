import json
import os
import shutil
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional
from uuid import uuid4


class OperationLogger:
    def __init__(self, log_dir: str = "logs", max_retention_days: int = 7):
        self.log_dir = log_dir
        self.max_retention_days = max_retention_days
        os.makedirs(log_dir, exist_ok=True)
        self._cleanup_old_logs()

    def _get_log_file_path(self, date: Optional[datetime] = None) -> str:
        if date is None:
            date = datetime.now()
        date_str = date.strftime("%Y-%m-%d")
        return os.path.join(self.log_dir, f"operations_{date_str}.jsonl")

    def _cleanup_old_logs(self) -> None:
        cutoff_date = datetime.now() - timedelta(days=self.max_retention_days)
        cutoff_str = cutoff_date.strftime("%Y-%m-%d")

        for filename in os.listdir(self.log_dir):
            if filename.startswith("operations_") and filename.endswith(".jsonl"):
                file_date_str = filename.replace("operations_", "").replace(".jsonl", "")
                if file_date_str < cutoff_str:
                    file_path = os.path.join(self.log_dir, filename)
                    os.remove(file_path)

    def _write_log_entry(self, entry: Dict[str, Any]) -> None:
        file_path = self._get_log_file_path()
        with open(file_path, "a", encoding="utf-8") as f:
            f.write(json.dumps(entry, ensure_ascii=False) + "\n")
        self._cleanup_old_logs()

    def log_agent_run(
        self,
        user_id: str,
        query: str,
        capital: float,
        risk_profile: str,
        run_id: str,
        result: Dict[str, Any],
        duration: float,
        success: bool = True,
    ) -> None:
        entry = {
            "timestamp": datetime.now().isoformat(),
            "user_id": user_id,
            "operation_type": "agent_run",
            "run_id": run_id,
            "data": {
                "query": query,
                "capital": capital,
                "risk_profile": risk_profile,
            },
            "result": result,
            "duration": duration,
            "success": success,
        }
        self._write_log_entry(entry)

    def log_tool_call(
        self,
        user_id: str,
        run_id: str,
        tool_name: str,
        tool_input: Dict[str, Any],
        tool_output: Any,
        duration: float,
    ) -> None:
        entry = {
            "timestamp": datetime.now().isoformat(),
            "user_id": user_id,
            "operation_type": "tool_call",
            "run_id": run_id,
            "data": {
                "tool_name": tool_name,
                "tool_input": tool_input,
            },
            "result": tool_output,
            "duration": duration,
            "success": True,
        }
        self._write_log_entry(entry)

    def log_decision(
        self,
        user_id: str,
        run_id: str,
        decision: Dict[str, Any],
        confidence: float,
        risk_score: float,
    ) -> None:
        entry = {
            "timestamp": datetime.now().isoformat(),
            "user_id": user_id,
            "operation_type": "decision",
            "run_id": run_id,
            "data": {
                "decision": decision,
                "confidence": confidence,
                "risk_score": risk_score,
            },
            "result": {},
            "duration": 0,
            "success": True,
        }
        self._write_log_entry(entry)

    def log_review(
        self,
        user_id: str,
        run_id: str,
        analysis: Dict[str, Any],
        recommendations: List[str],
    ) -> None:
        entry = {
            "timestamp": datetime.now().isoformat(),
            "user_id": user_id,
            "operation_type": "review",
            "run_id": run_id,
            "data": {
                "analysis": analysis,
                "recommendations": recommendations,
            },
            "result": {},
            "duration": 0,
            "success": True,
        }
        self._write_log_entry(entry)

    def get_logs_for_date(self, date_str: str) -> List[Dict[str, Any]]:
        file_path = os.path.join(self.log_dir, f"operations_{date_str}.jsonl")
        if not os.path.exists(file_path):
            return []

        logs = []
        with open(file_path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line:
                    logs.append(json.loads(line))
        return logs

    def get_recent_logs(self, limit: int = 100) -> List[Dict[str, Any]]:
        all_logs = []
        today = datetime.now()

        for i in range(self.max_retention_days):
            date = today - timedelta(days=i)
            date_str = date.strftime("%Y-%m-%d")
            logs = self.get_logs_for_date(date_str)
            all_logs.extend(logs)
            if len(all_logs) >= limit:
                break

        all_logs.sort(key=lambda x: x["timestamp"], reverse=True)
        return all_logs[:limit]

    def get_log_files(self) -> List[str]:
        files = []
        for filename in os.listdir(self.log_dir):
            if filename.startswith("operations_") and filename.endswith(".jsonl"):
                date_str = filename.replace("operations_", "").replace(".jsonl", "")
                files.append(date_str)
        files.sort(reverse=True)
        return files

    def delete_log_file(self, date_str: str) -> bool:
        file_path = os.path.join(self.log_dir, f"operations_{date_str}.jsonl")
        if os.path.exists(file_path):
            os.remove(file_path)
            return True
        return False

    def get_logs_by_run_id(self, run_id: str) -> List[Dict[str, Any]]:
        all_logs = []
        today = datetime.now()

        for i in range(self.max_retention_days):
            date = today - timedelta(days=i)
            date_str = date.strftime("%Y-%m-%d")
            logs = self.get_logs_for_date(date_str)
            for log in logs:
                if log.get("run_id") == run_id:
                    all_logs.append(log)

        all_logs.sort(key=lambda x: x["timestamp"])
        return all_logs


logger = OperationLogger()