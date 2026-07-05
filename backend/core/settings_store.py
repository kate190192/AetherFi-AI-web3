import json
import os
from pathlib import Path
from typing import Optional

from schemas.settings import AppSettings, default_settings

SETTINGS_FILE = Path(__file__).parent.parent / "data" / "app_settings.json"

_settings: Optional[AppSettings] = None


def _ensure_data_dir():
    SETTINGS_FILE.parent.mkdir(parents=True, exist_ok=True)


def load_settings() -> AppSettings:
    global _settings
    if _settings:
        return _settings
    _ensure_data_dir()
    if SETTINGS_FILE.exists():
        try:
            with open(SETTINGS_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
            _settings = AppSettings(**data)
            return _settings
        except Exception:
            pass
    _settings = AppSettings(**default_settings.model_dump())
    return _settings


def save_settings(settings: AppSettings) -> AppSettings:
    global _settings
    _ensure_data_dir()
    with open(SETTINGS_FILE, "w", encoding="utf-8") as f:
        json.dump(settings.model_dump(), f, indent=2, ensure_ascii=False)
    _settings = settings
    return settings


def get_settings() -> AppSettings:
    return load_settings()
