import os
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.routes import router as agent_router
from api.logs import router as logs_router
from api.review import router as review_router
from api.market_live import router as market_router
from api.journal import router as journal_router
from api.web3 import router as web3_router
from api.settings import router as settings_router
from api.backtest import router as backtest_router

load_dotenv()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print("[START] AetherFi Agent Backend starting...")
    # 初始化数据库
    try:
        from core.database import _get_conn
        _get_conn()
        print("[START] SQLite 数据库已初始化")
    except Exception as e:
        print(f"[WARN] SQLite 数据库初始化失败: {e}")
    yield
    # Shutdown
    try:
        from core.database import close_db
        close_db()
    except Exception:
        pass
    print("[STOP] AetherFi Agent Backend stopped")


app = FastAPI(
    title="AetherFi Agent",
    description="AI 驱动的 Web3 去中心化金融投资助手",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:3002",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
        "http://127.0.0.1:3002",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(agent_router)
app.include_router(logs_router)
app.include_router(review_router)
app.include_router(market_router)
app.include_router(journal_router)
app.include_router(web3_router)
app.include_router(settings_router)
app.include_router(backtest_router)


@app.get("/health")
async def health_check():
    return {"status": "ok"}


if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
