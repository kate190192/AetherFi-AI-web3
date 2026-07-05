"""统一重试与降级工具 — 为所有外部 API 调用提供一致的重试策略。"""

import asyncio
import logging
import time
from functools import wraps
from typing import Any, Callable, TypeVar

logger = logging.getLogger(__name__)

T = TypeVar("T")


class RetryConfig:
    """重试配置"""

    def __init__(
        self,
        max_retries: int = 3,
        backoff_base: float = 1.0,
        backoff_max: float = 30.0,
        retryable_exceptions: tuple = (Exception,),
    ):
        self.max_retries = max_retries
        self.backoff_base = backoff_base
        self.backoff_max = backoff_max
        self.retryable_exceptions = retryable_exceptions


# 预定义配置
API_CONFIG = RetryConfig(max_retries=3, backoff_base=1.0)
LLM_CONFIG = RetryConfig(max_retries=2, backoff_base=2.0)
FALLBACK_CONFIG = RetryConfig(max_retries=1, backoff_base=0.5)


def with_retry_sync(
    func: Callable[..., T] | None = None,
    *,
    config: RetryConfig | None = None,
    fallback_value: Any = None,
    fallback_func: Callable[..., T] | None = None,
    log_prefix: str = "",
) -> Callable:
    """同步重试装饰器。

    用法:
        @with_retry(config=API_CONFIG, fallback_value={})
        def fetch_data(): ...

        @with_retry(fallback_func=lambda: {"status": "offline"})
        def check_health(): ...
    """
    cfg = config or API_CONFIG

    def decorator(fn: Callable[..., T]) -> Callable[..., T]:
        @wraps(fn)
        def wrapper(*args, **kwargs) -> T:
            last_error = None
            for attempt in range(cfg.max_retries):
                try:
                    return fn(*args, **kwargs)
                except cfg.retryable_exceptions as e:
                    last_error = e
                    if attempt < cfg.max_retries - 1:
                        delay = min(cfg.backoff_base * (2**attempt), cfg.backoff_max)
                        logger.warning(
                            "%s第 %d/%d 次重试失败: %s，%0.1fs 后重试",
                            f"{log_prefix} " if log_prefix else "",
                            attempt + 1,
                            cfg.max_retries,
                            e,
                            delay,
                        )
                        time.sleep(delay)
                    else:
                        logger.error(
                            "%s重试 %d 次后仍失败: %s",
                            f"{log_prefix} " if log_prefix else "",
                            cfg.max_retries,
                            e,
                        )

            if fallback_func:
                try:
                    return fallback_func()
                except Exception as fb_err:
                    logger.error("%s降级函数也失败: %s", log_prefix, fb_err)
            if fallback_value is not None:
                return fallback_value
            raise last_error

        return wrapper

    if func is not None:
        return decorator(func)
    return decorator


def with_retry_async(
    func: Callable | None = None,
    *,
    config: RetryConfig | None = None,
    fallback_value: Any = None,
    fallback_func: Callable | None = None,
    log_prefix: str = "",
) -> Callable:
    """异步重试装饰器。

    用法:
        @with_retry_async(config=API_CONFIG, fallback_value={})
        async def fetch_data(): ...
    """
    cfg = config or API_CONFIG

    def decorator(fn: Callable) -> Callable:
        @wraps(fn)
        async def wrapper(*args, **kwargs):
            last_error = None
            for attempt in range(cfg.max_retries):
                try:
                    return await fn(*args, **kwargs)
                except cfg.retryable_exceptions as e:
                    last_error = e
                    if attempt < cfg.max_retries - 1:
                        delay = min(cfg.backoff_base * (2**attempt), cfg.backoff_max)
                        logger.warning(
                            "%s第 %d/%d 次重试失败: %s，%0.1fs 后重试",
                            f"{log_prefix} " if log_prefix else "",
                            attempt + 1,
                            cfg.max_retries,
                            e,
                            delay,
                        )
                        await asyncio.sleep(delay)
                    else:
                        logger.error(
                            "%s重试 %d 次后仍失败: %s",
                            f"{log_prefix} " if log_prefix else "",
                            cfg.max_retries,
                            e,
                        )

            if fallback_func:
                try:
                    return await fallback_func()
                except Exception as fb_err:
                    logger.error("%s降级函数也失败: %s", log_prefix, fb_err)
            if fallback_value is not None:
                return fallback_value
            raise last_error

        return wrapper

    if func is not None:
        return decorator(func)
    return decorator
