"""SQLite 持久化层 — 用户数据、交互记录、推荐记录的持久化存储。"""

import json
import logging
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional

logger = logging.getLogger(__name__)

DB_DIR = Path(__file__).parent.parent / "data"
DB_PATH = DB_DIR / "aetherfi.db"

# 延迟初始化，避免导入时阻塞
_conn = None


def _get_conn():
    """获取数据库连接（延迟初始化）"""
    global _conn
    if _conn is not None:
        return _conn
    try:
        import sqlite3
        DB_DIR.mkdir(parents=True, exist_ok=True)
        _conn = sqlite3.connect(str(DB_PATH), check_same_thread=False)
        _conn.row_factory = sqlite3.Row
        _conn.execute("PRAGMA journal_mode=WAL")
        _conn.execute("PRAGMA foreign_keys=ON")
        _init_tables(_conn)
        logger.info("SQLite 数据库已连接: %s", DB_PATH)
        return _conn
    except Exception as e:
        logger.error("SQLite 连接失败: %s", e)
        raise


def _init_tables(conn) -> None:
    """初始化数据库表"""
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS users (
            user_id TEXT PRIMARY KEY,
            risk_profile TEXT DEFAULT 'neutral',
            preferred_assets TEXT DEFAULT '["BTC","ETH","SOL"]',
            capital_base REAL DEFAULT 10000.0,
            investment_horizon TEXT DEFAULT 'mid_term',
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS interactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL,
            query TEXT NOT NULL,
            decision_json TEXT DEFAULT '{}',
            created_at TEXT DEFAULT (datetime('now')),
            FOREIGN KEY (user_id) REFERENCES users(user_id)
        );

        CREATE TABLE IF NOT EXISTS recommendations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            run_id TEXT UNIQUE NOT NULL,
            user_id TEXT NOT NULL,
            query TEXT DEFAULT '',
            action TEXT DEFAULT 'hold',
            confidence REAL DEFAULT 0.0,
            risk_score REAL DEFAULT 0.5,
            risk_profile TEXT DEFAULT 'neutral',
            capital REAL DEFAULT 0.0,
            allocations TEXT DEFAULT '{}',
            prices_at_recommendation TEXT DEFAULT '{}',
            reasoning TEXT DEFAULT '[]',
            created_at TEXT DEFAULT (datetime('now')),
            tracked INTEGER DEFAULT 1
        );

        CREATE INDEX IF NOT EXISTS idx_interactions_user ON interactions(user_id);
        CREATE INDEX IF NOT EXISTS idx_interactions_time ON interactions(created_at);
        CREATE INDEX IF NOT EXISTS idx_recommendations_user ON recommendations(user_id);
        CREATE INDEX IF NOT EXISTS idx_recommendations_time ON recommendations(created_at);
    """)
    conn.commit()


# ── 用户操作 ──────────────────────────────────────────────────────────────

_DEFAULT_PROFILE = {
    "risk_profile": "neutral",
    "investment_horizon": "mid_term",
    "preferred_assets": ["BTC", "ETH", "SOL"],
    "capital_base": 10000.0,
}


def get_user_profile(user_id: str) -> dict:
    """获取用户画像，不存在则创建默认画像"""
    conn = _get_conn()
    row = conn.execute(
        "SELECT * FROM users WHERE user_id = ?", (user_id,)
    ).fetchone()
    if row:
        return {
            "user_id": row["user_id"],
            "risk_profile": row["risk_profile"],
            "preferred_assets": json.loads(row["preferred_assets"]),
            "capital_base": row["capital_base"],
            "investment_horizon": row["investment_horizon"],
        }
    # 创建默认用户
    conn.execute(
        """INSERT OR IGNORE INTO users (user_id, risk_profile, preferred_assets, capital_base, investment_horizon)
           VALUES (?, ?, ?, ?, ?)""",
        (
            user_id,
            _DEFAULT_PROFILE["risk_profile"],
            json.dumps(_DEFAULT_PROFILE["preferred_assets"]),
            _DEFAULT_PROFILE["capital_base"],
            _DEFAULT_PROFILE["investment_horizon"],
        ),
    )
    conn.commit()
    return dict(_DEFAULT_PROFILE)


def update_user_profile(user_id: str, data: dict) -> None:
    """更新用户画像字段"""
    conn = _get_conn()
    # 确保用户存在
    get_user_profile(user_id)

    allowed_fields = {"risk_profile", "preferred_assets", "capital_base", "investment_horizon"}
    updates = []
    values = []
    for k, v in data.items():
        if k in allowed_fields:
            updates.append(f"{k} = ?")
            if isinstance(v, (list, dict)):
                values.append(json.dumps(v))
            else:
                values.append(v)
    if not updates:
        return
    updates.append("updated_at = datetime('now')")
    values.append(user_id)
    conn.execute(
        f"UPDATE users SET {', '.join(updates)} WHERE user_id = ?",
        values,
    )
    conn.commit()


# ── 交互记录 ──────────────────────────────────────────────────────────────

def add_interaction(user_id: str, query: str, decision: dict) -> None:
    """记录用户交互"""
    conn = _get_conn()
    conn.execute(
        "INSERT INTO interactions (user_id, query, decision_json) VALUES (?, ?, ?)",
        (user_id, query, json.dumps(decision, ensure_ascii=False)),
    )
    conn.commit()


def get_interactions(user_id: str, limit: int = 20) -> list[dict]:
    """获取用户历史交互"""
    conn = _get_conn()
    rows = conn.execute(
        "SELECT * FROM interactions WHERE user_id = ? ORDER BY created_at DESC LIMIT ?",
        (user_id, limit),
    ).fetchall()
    return [
        {
            "id": row["id"],
            "user_id": row["user_id"],
            "query": row["query"],
            "decision": json.loads(row["decision_json"]),
            "created_at": row["created_at"],
        }
        for row in rows
    ]


# ── 推荐记录 ──────────────────────────────────────────────────────────────

def save_recommendation(
    run_id: str,
    user_id: str,
    decision: dict,
    portfolio: dict,
    capital: float,
    risk_profile: str,
    query: str,
) -> dict:
    """保存推荐记录"""
    conn = _get_conn()

    allocations = portfolio.get("allocation", {})
    prices = {}
    for sym, details in allocations.items():
        if isinstance(details, dict):
            price = details.get("current_price", 0)
            if price:
                prices[sym] = price

    conn.execute(
        """INSERT OR REPLACE INTO recommendations
           (run_id, user_id, query, action, confidence, risk_score, risk_profile,
            capital, allocations, prices_at_recommendation, reasoning)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (
            run_id,
            user_id,
            query,
            decision.get("action", "hold"),
            decision.get("confidence", 0),
            decision.get("risk_score", 0.5),
            risk_profile,
            capital,
            json.dumps(allocations, ensure_ascii=False),
            json.dumps(prices),
            json.dumps(decision.get("reasoning", []), ensure_ascii=False),
        ),
    )
    conn.commit()
    logger.info("推荐记录已保存: rec_%s", run_id[:8])
    return {"run_id": run_id, "action": decision.get("action", "hold")}


def get_recommendations(user_id: str | None = None, limit: int = 50) -> list[dict]:
    """获取推荐记录"""
    conn = _get_conn()
    if user_id:
        rows = conn.execute(
            "SELECT * FROM recommendations WHERE user_id = ? ORDER BY created_at DESC LIMIT ?",
            (user_id, limit),
        ).fetchall()
    else:
        rows = conn.execute(
            "SELECT * FROM recommendations ORDER BY created_at DESC LIMIT ?",
            (limit,),
        ).fetchall()

    return [
        {
            "id": f"rec_{row['run_id'][:8]}",
            "run_id": row["run_id"],
            "user_id": row["user_id"],
            "query": row["query"],
            "action": row["action"],
            "confidence": row["confidence"],
            "risk_score": row["risk_score"],
            "risk_profile": row["risk_profile"],
            "capital": row["capital"],
            "allocations": json.loads(row["allocations"]),
            "prices_at_recommendation": json.loads(row["prices_at_recommendation"]),
            "reasoning": json.loads(row["reasoning"]),
            "created_at": row["created_at"],
            "tracked": bool(row["tracked"]),
        }
        for row in rows
    ]


def get_recommendation_by_run_id(run_id: str) -> Optional[dict]:
    """根据 run_id 获取单条推荐记录"""
    conn = _get_conn()
    row = conn.execute(
        "SELECT * FROM recommendations WHERE run_id = ?", (run_id,)
    ).fetchone()
    if not row:
        return None
    return {
        "id": f"rec_{row['run_id'][:8]}",
        "run_id": row["run_id"],
        "user_id": row["user_id"],
        "query": row["query"],
        "action": row["action"],
        "confidence": row["confidence"],
        "risk_score": row["risk_score"],
        "risk_profile": row["risk_profile"],
        "capital": row["capital"],
        "allocations": json.loads(row["allocations"]),
        "prices_at_recommendation": json.loads(row["prices_at_recommendation"]),
        "reasoning": json.loads(row["reasoning"]),
        "created_at": row["created_at"],
        "tracked": bool(row["tracked"]),
    }


def close_db():
    """关闭数据库连接"""
    global _conn
    if _conn:
        _conn.close()
        _conn = None
        logger.info("SQLite 数据库连接已关闭")
