import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.core.framework import DealScoutEngine, init_logging
from app.core.log_bus import WebSocketLogHandler, log_bus
from app.db import init_db
from app.routers import messages, opportunities, scan, ws

# Expensive to initialize (Frontier/NeuralNetwork/Specialist agents are only
# created lazily on first use, via engine.init_agents_as_needed()), so a
# single instance is shared across all requests - matches the original's
# lazy-singleton pattern.
engine = DealScoutEngine()


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_logging()
    log_bus.bind_loop()
    logging.getLogger().addHandler(WebSocketLogHandler())
    await init_db()
    app.state.engine = engine
    yield


app = FastAPI(title="DealScout", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_origin],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(opportunities.router, prefix="/api")
app.include_router(scan.router, prefix="/api")
app.include_router(messages.router, prefix="/api")
app.include_router(ws.router)
