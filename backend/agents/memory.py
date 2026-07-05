"""Memory Management — 基于 SQLite 的用户记忆管理（持久化版本）。"""

from __future__ import annotations

from copy import deepcopy

from core.database import (
    get_user_profile,
    update_user_profile,
    add_interaction,
    get_interactions,
)

_DEFAULT_PROFILE = {
    "risk_profile": "neutral",
    "investment_horizon": "mid_term",
    "preferred_assets": ["BTC", "ETH", "SOL"],
    "capital_base": 10000.0,
}


class UserMemory:
    """用户记忆管理器（SQLite 持久化版本）"""

    @staticmethod
    def get_profile(user_id: str) -> dict:
        """获取用户的风险偏好和配置"""
        try:
            profile = get_user_profile(user_id)
            return deepcopy(profile)
        except Exception:
            return deepcopy(_DEFAULT_PROFILE)

    @staticmethod
    def update_profile(user_id: str, data: dict) -> None:
        """更新用户配置，仅覆盖提供的字段"""
        try:
            update_user_profile(user_id, data)
        except Exception:
            pass

    @staticmethod
    def get_history(user_id: str, limit: int = 20) -> list[dict]:
        """获取用户历史交互记录"""
        try:
            return get_interactions(user_id, limit)
        except Exception:
            return []

    @staticmethod
    def add_interaction(user_id: str, query: str, decision: dict) -> None:
        """记录新的交互"""
        try:
            add_interaction(user_id, query, decision)
        except Exception:
            pass
