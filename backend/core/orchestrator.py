"""Agent Orchestrator — 顺序流水线编排器，以 SSE 事件流方式逐步产出结果。"""

import logging
import time
from typing import Any, AsyncGenerator
from uuid import uuid4

from agents.memory import UserMemory
from agents.planner import parse_intent
from agents.reasoning import analyze_investment
from core.logging import logger as op_logger
from core.journal import create_journal_entry
from core.backtest import save_recommendation
from schemas.models import AgentRequest, AgentResponse, Decision, PortfolioState, StepUpdate, Web3Simulation
from tools.market import get_market_data
from tools.news import get_news_sentiment
from tools.portfolio import simulate_portfolio
from tools.web3_sim import simulate_web3_execution

logger = logging.getLogger(__name__)


def _determine_overall_quality(sources: dict) -> str:
    """根据各数据源质量判断整体数据质量"""
    if not sources:
        return "unknown"
    qualities = [s.get("quality", "unknown") for s in sources.values()]
    if all(q == "real" for q in qualities):
        return "real"
    if all(q == "fallback" for q in qualities):
        return "fallback"
    if any(q == "fallback" for q in qualities):
        return "mixed"
    return "real"


def _step_event(step: str, status: str, data: dict[str, Any] | None = None) -> dict:
    """构造一个 SSE 兼容的 step_update 事件字典。"""
    return {
        "type": "step_update",
        "step": step,
        "status": status,
        "data": data or {},
    }


async def run_agent(request: AgentRequest) -> AsyncGenerator[dict, None]:
    """
    主编排函数 — 顺序执行 6 个步骤并逐步 yield SSE 事件字典。

    数据流: 用户查询 → LLM意图解析 → 真实市场数据 → 真实新闻情绪
           → 动态组合模拟 → LLM综合分析决策 → Web3模拟
    """
    user_id = request.user_id
    risk_profile = request.risk_profile.value
    capital = request.capital
    query = request.query
    skip_web3 = request.skip_web3
    run_id = str(uuid4())
    start_time = time.time()

    # 获取用户画像（优雅降级）
    try:
        user_profile = UserMemory.get_profile(user_id)
    except Exception:
        user_profile = {"risk_profile": risk_profile}
        logger.warning("获取用户画像失败，使用请求中的风险偏好")

    # ── Step 1: LLM 意图解析 ────────────────────────────────────────────────
    intent = None
    try:
        yield _step_event("parse_intent", "running", {"message": "AI 正在理解您的查询..."})
        intent = await parse_intent(query)
        op_logger.log_tool_call(user_id, run_id, "parse_intent", {"query": query}, intent, time.time() - start_time)
        yield _step_event("parse_intent", "completed", {
            "symbols": intent["symbols"],
            "query_type": intent["query_type"],
            "capital_from_query": intent.get("capital"),
            "user_intent": intent.get("user_intent", ""),
            "message": f"识别到 {len(intent['symbols'])} 个资产，查询类型: {intent['query_type']}",
        })
    except Exception as e:
        logger.error("意图解析失败: %s", e)
        intent = {"symbols": ["BTC", "ETH"], "query_type": "general", "capital": None,
                  "risk_hint": None, "user_intent": query, "original_query": query}
        yield _step_event("parse_intent", "error", {"message": f"意图解析失败，使用默认: {e}"})

    symbols = intent.get("symbols", ["BTC", "ETH"])
    effective_capital = intent.get("capital") or capital
    # 如果 LLM 识别出风险偏好提示，覆盖请求中的设置
    if intent.get("risk_hint"):
        risk_profile = intent["risk_hint"]

    # ── Step 2: 获取真实市场数据 ────────────────────────────────────────────
    market_data: dict[str, Any] = {}
    try:
        yield _step_event("market_data", "running", {"message": "正在获取实时市场数据…"})
        # 并行获取所有币种数据
        import asyncio
        tasks = [get_market_data(sym) for sym in symbols]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        for sym, result in zip(symbols, results):
            if isinstance(result, Exception):
                logger.warning("获取 %s 市场数据失败: %s", sym, result)
            elif result:
                market_data[sym] = result

        # 收集数据源元信息
        market_sources = {}
        for sym, d in market_data.items():
            if isinstance(d, dict):
                market_sources[sym] = {
                    "provider": d.get("source", ""),
                    "is_real": d.get("is_real_data", False),
                    "quality": d.get("data_quality", "unknown"),
                }

        yield _step_event("market_data", "completed", {
            "symbols": list(market_data.keys()),
            "message": f"已获取 {len(market_data)} 个资产的实时市场数据",
            "data": market_data,
            "data_sources": market_sources,
            "overall_quality": _determine_overall_quality(market_sources),
        })
        op_logger.log_tool_call(user_id, run_id, "get_market_data", {"symbols": symbols}, market_data, time.time() - start_time)
    except Exception as e:
        logger.error("市场数据获取失败: %s", e)
        yield _step_event("market_data", "error", {"message": f"市场数据获取失败: {e}"})

    # ── Step 3: 真实新闻情绪分析 ────────────────────────────────────────────
    news_sentiment: dict[str, Any] = {}
    try:
        yield _step_event("news_sentiment", "running", {"message": "正在分析最新新闻情绪…"})
        tasks = [get_news_sentiment(sym) for sym in symbols]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        for sym, result in zip(symbols, results):
            if isinstance(result, Exception):
                logger.warning("获取 %s 新闻情绪失败: %s", sym, result)
            elif result:
                news_sentiment[sym] = result

        # 收集新闻数据源元信息
        news_sources = {}
        for sym, d in news_sentiment.items():
            if isinstance(d, dict):
                news_sources[sym] = {
                    "provider": d.get("source", ""),
                    "quality": d.get("data_quality", "unknown"),
                }

        yield _step_event("news_sentiment", "completed", {
            "symbols": list(news_sentiment.keys()),
            "message": f"已完成 {len(news_sentiment)} 个资产的新闻情绪分析",
            "data": news_sentiment,
            "data_sources": news_sources,
            "overall_quality": _determine_overall_quality(news_sources),
        })
        op_logger.log_tool_call(user_id, run_id, "get_news_sentiment", {"symbols": symbols}, news_sentiment, time.time() - start_time)
    except Exception as e:
        logger.error("新闻情绪分析失败: %s", e)
        yield _step_event("news_sentiment", "error", {"message": f"新闻情绪分析失败: {e}"})

    # ── Step 4: 动态投资组合模拟 ────────────────────────────────────────────
    portfolio_result: dict[str, Any] = {}
    try:
        yield _step_event("portfolio_simulation", "running", {"message": "正在根据市场数据动态生成投资组合…"})
        portfolio_result = await simulate_portfolio(
            capital=effective_capital,
            risk_profile=risk_profile,
            market_data=market_data,
            news_sentiment=news_sentiment,
            user_intent=intent.get("user_intent", ""),
        )
        yield _step_event("portfolio_simulation", "completed", {
            "message": "投资组合动态模拟完成",
            "data": portfolio_result,
        })
        op_logger.log_tool_call(user_id, run_id, "simulate_portfolio",
                               {"capital": effective_capital, "risk_profile": risk_profile},
                               portfolio_result, time.time() - start_time)
    except Exception as e:
        logger.error("投资组合模拟失败: %s", e)
        yield _step_event("portfolio_simulation", "error", {"message": f"投资组合模拟失败: {e}"})

    # ── Step 5: LLM 综合推理（基于真实数据） ───────────────────────────────
    decision: Decision | None = None
    try:
        yield _step_event("llm_reasoning", "running", {"message": "AI 正在综合分析并生成决策…"})

        # 计算总体情绪评分供推理使用
        overall_sentiment_score = 0.5
        if news_sentiment:
            scores = []
            for v in news_sentiment.values():
                if isinstance(v, dict):
                    bull = v.get("bullish_signals", 0)
                    bear = v.get("bearish_signals", 0)
                    total = bull + bear
                    if total > 0:
                        scores.append(bull / total)
            if scores:
                overall_sentiment_score = sum(scores) / len(scores)

        news_summary = {
            "overall_score": overall_sentiment_score,
            "details": news_sentiment,
        }

        decision = await analyze_investment(
            query=query,
            market_data=market_data,
            news_sentiment=news_summary,
            portfolio_state=portfolio_result,
            risk_profile=risk_profile,
        )

        yield _step_event("llm_reasoning", "completed", {
            "message": "AI 综合分析完成",
            "action": decision.action,
            "confidence": decision.confidence,
            "reasoning": decision.reasoning,
        })
        op_logger.log_decision(user_id, run_id, decision.model_dump() if decision else {},
                               decision.confidence if decision else 0,
                               decision.risk_score if decision else 0.5)
    except Exception as e:
        logger.error("LLM 推理失败: %s", e)
        yield _step_event("llm_reasoning", "error", {"message": f"LLM 推理失败: {e}"})

    # ── Step 6: Web3 模拟 ──────────────────────────────────────────────────
    web3_result: dict[str, Any] = {}
    if skip_web3:
        yield _step_event("web3_simulation", "pending", {
            "message": "等待用户确认执行 Web3 模拟",
            "pending": True,
            "run_id": run_id,
        })
    else:
        try:
            yield _step_event("web3_simulation", "running", {"message": "正在模拟链上交易…"})
            allocation = portfolio_result.get("allocation", {})
            if allocation:
                token_prices: dict[str, float] = {}
                for symbol, data in market_data.items():
                    if isinstance(data, dict):
                        price = data.get("price", 0)
                        if price:
                            token_prices[symbol] = price
                for asset in allocation.keys():
                    if asset not in token_prices:
                        try:
                            extra_data = await get_market_data(asset)
                            if isinstance(extra_data, dict) and extra_data.get("price"):
                                token_prices[asset] = extra_data["price"]
                                market_data[asset] = extra_data
                        except Exception:
                            pass
                web3_result = await simulate_web3_execution(
                    allocation=allocation, capital=effective_capital,
                    token_prices=token_prices if token_prices else None,
                )
            yield _step_event("web3_simulation", "completed", {
                "message": "Web3 链上模拟完成", "data": web3_result,
            })
        except Exception as e:
            logger.error("Web3 模拟失败: %s", e)
            yield _step_event("web3_simulation", "error", {"message": f"Web3 模拟失败: {e}"})

    # ── 记录交互到用户记忆 ────────────────────────────────────────────────
    try:
        decision_dict = decision.model_dump() if decision else {}
        UserMemory.add_interaction(user_id, query, decision_dict)
    except Exception as e:
        logger.warning("记录用户交互失败: %s", e)

    # ── 构建最终响应 ──────────────────────────────────────────────────────
    portfolio_model: PortfolioState | None = None
    if portfolio_result:
        portfolio_model = PortfolioState(
            wallet_state=web3_result.get("new_wallet_state", portfolio_result.get("allocation", {})),
            projected_return=portfolio_result.get("expected_return", ""),
            risk_level=portfolio_result.get("risk_level", risk_profile),
            allocation=portfolio_result.get("allocation", {}),
            capital=portfolio_result.get("capital", effective_capital),
        )

    allocation_flat: dict[str, float] = {}
    allocation_list = []
    if portfolio_result:
        alloc = portfolio_result.get("allocation", {})
        for asset, details in alloc.items():
            if isinstance(details, dict):
                pct = details.get("percentage", 0)
                allocation_flat[asset] = pct / 100
                allocation_list.append({
                    "symbol": asset, "percentage": pct, "name": details.get("name", asset),
                    "current_price": details.get("current_price"),
                    "change_24h": details.get("change_24h"),
                    "expected_annual_return": details.get("expected_annual_return"),
                })
            else:
                allocation_flat[asset] = float(details)
                allocation_list.append({"symbol": asset, "percentage": float(details) * 100})

    simulation_model: Web3Simulation | None = None
    if web3_result:
        simulation_model = Web3Simulation(
            simulation=web3_result.get("simulation", ""),
            gas_fee=web3_result.get("total_gas", ""),
            new_allocation=allocation_flat,
            tx_hash=web3_result.get("wallet_address", ""),
        )

    final_response = AgentResponse(
        decision=decision,
        portfolio=portfolio_model,
        simulation=simulation_model,
        risk_score=decision.risk_score if decision else 0.5,
        confidence=decision.confidence if decision else 0.0,
    )

    total_duration = time.time() - start_time
    op_logger.log_agent_run(user_id, query, capital, risk_profile, run_id,
                            final_response.model_dump(), total_duration)

    # ── 创建交易日记 ────────────────────────────────────────────────────
    try:
        market_snapshot = {
            "coins": {},
            "btc_price": None, "eth_price": None, "overall_change_24h": None,
        }
        for symbol, data in market_data.items():
            if isinstance(data, dict):
                market_snapshot["coins"][symbol] = {
                    "price": data.get("price"),
                    "price_change_24h": data.get("change_24h"),
                    "market_cap": data.get("market_cap"),
                    "volume_24h": data.get("volume_24h"),
                }
        reasoning_text = ""
        if decision and hasattr(decision, 'reasoning'):
            reasoning_text = "\n".join(decision.reasoning) if isinstance(decision.reasoning, list) else str(decision.reasoning)
        strategy_suggestion = {
            "portfolio": allocation_list,
            "expected_return": portfolio_result.get("expected_return", "") if portfolio_result else "",
            "risk_level": portfolio_result.get("risk_level", risk_profile) if portfolio_result else risk_profile,
            "action": decision.action if decision else "hold",
            "confidence": decision.confidence if decision else 0,
        }
        create_journal_entry(
            user_id=user_id, query=query, market_context=market_snapshot,
            strategy_suggestion=strategy_suggestion, reasoning=reasoning_text,
            risk_profile=risk_profile, capital=capital,
        )
    except Exception as e:
        logger.warning("创建交易日记失败: %s", e)

    # ── 保存推荐记录（用于回测追踪） ──────────────────────────────────────
    try:
        if decision and portfolio_result:
            save_recommendation(
                run_id=run_id,
                user_id=user_id,
                decision=decision.model_dump(),
                portfolio=portfolio_result,
                capital=capital,
                risk_profile=risk_profile,
                query=query,
            )
    except Exception as e:
        logger.warning("保存推荐记录失败: %s", e)

    yield {
        "type": "final_result",
        "data": final_response.model_dump(),
        "run_id": run_id,
    }
