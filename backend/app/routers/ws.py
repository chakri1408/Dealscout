import asyncio
import contextlib

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.core.log_bus import log_bus

router = APIRouter()


@router.websocket("/ws/logs")
async def logs_ws(websocket: WebSocket):
    """
    Stream log events (agent activity) to the connected client as JSON text
    frames, until it disconnects.

    Forwarding runs in a separate task while this handler blocks on
    receive(): that's what surfaces disconnects — including the close
    handshake uvicorn initiates on shutdown. If the handler awaited
    queue.get() directly it would never observe the disconnect, and graceful
    shutdown would hang forever on this task (Ctrl+C appearing to do nothing
    while a browser tab holds the socket open).
    """
    await websocket.accept()
    queue = log_bus.subscribe()

    async def forward() -> None:
        while True:
            event = await queue.get()
            await websocket.send_json(event)

    forward_task = asyncio.create_task(forward())
    try:
        while True:
            message = await websocket.receive()
            if message["type"] == "websocket.disconnect":
                break
    except WebSocketDisconnect:
        pass
    finally:
        forward_task.cancel()
        with contextlib.suppress(asyncio.CancelledError):
            await forward_task
        log_bus.unsubscribe(queue)
