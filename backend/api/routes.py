import json
import logging

from fastapi import APIRouter, Request
from fastapi.responses import StreamingResponse

from core.orchestrator import run_agent
from schemas.models import AgentRequest

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/agent", tags=["agent"])


@router.post("/run")
async def run_agent_stream(request: AgentRequest):
    """运行 AetherFi Agent，以 SSE 流式返回每步状态和最终决策。"""

    async def event_generator():
        async for event in run_agent(request):
            yield f"data: {json.dumps(event, ensure_ascii=False)}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.post("/run/sync")
async def run_agent_sync(request: AgentRequest):
    """同步版本 — 返回完整 AgentResponse（用于调试 / Swagger UI）"""
    final_data = None
    steps = []
    async for event in run_agent(request):
        if event.get("type") == "step_update":
            steps.append(event)
        elif event.get("type") == "final_result":
            final_data = event.get("data")

    return {"steps": steps, "result": final_data}
