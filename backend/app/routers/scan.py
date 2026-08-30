import logging

from fastapi import APIRouter, BackgroundTasks, Request, status

from app.core.framework import DealScoutEngine
from app.core.log_bus import log_bus
from app.db import async_session_maker
from app.models import OpportunityRead

router = APIRouter()


async def _run_scan_job(engine: DealScoutEngine) -> None:
    """
    Run one DealScoutEngine planning cycle in the background, persist the
    result (handled inside engine.run), and publish a final run_complete
    event on the log bus so WebSocket clients learn the outcome without
    polling.
    """
    opportunity = None
    async with async_session_maker() as session:
        try:
            opportunity = await engine.run(session)
        except Exception:
            logging.exception("Scan run failed")

    payload = None
    if opportunity is not None:
        payload = OpportunityRead.model_validate(opportunity).model_dump(mode="json")
    log_bus.publish({"type": "run_complete", "opportunity": payload})


@router.post("/scan/run", status_code=status.HTTP_202_ACCEPTED)
async def run_scan(request: Request, background_tasks: BackgroundTasks):
    """
    Kick off one planning cycle (RSS scan + pricing + possible notification)
    as a background job, since it can take a while. The eventual result is
    both persisted to the DB and broadcast on the log bus (ws/logs) as a
    run_complete event.
    """
    engine: DealScoutEngine = request.app.state.engine
    background_tasks.add_task(_run_scan_job, engine)
    return {"status": "started"}
