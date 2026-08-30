"""
Broadcasts application log records over WebSockets.

Adapted from week8/log_utils.py's `reformat()`, which stripped ANSI color
codes out of Agent.log() messages and wrapped them in colored HTML spans for
display in a Gradio textbox. Here we do the equivalent parsing, but instead
of producing HTML we build a structured dict and push it onto every
currently-subscribed asyncio.Queue via a simple pub/sub LogBus, so a
WebSocket route can forward log events to connected clients in real time.
"""

import asyncio
import logging
import re
from datetime import datetime, timezone
from typing import Optional

# Matches any ANSI escape sequence, e.g. "\x1b[40m" (== "\033[40m")
ANSI_ESCAPE_RE = re.compile(r"\x1b\[[0-9;]*m")

# Agent.log() formats messages as "<ansi><ansi>[Agent Name] the message<reset>"
# so once ANSI codes are stripped, the agent name can be recovered from the
# leading "[Agent Name]" bracket.
AGENT_PREFIX_RE = re.compile(r"^\[(?P<agent>[^\]]+)\]\s*(?P<rest>.*)$", re.DOTALL)


def parse_log_message(raw_message: str) -> tuple[str, str]:
    """
    Strip ANSI color codes from a raw log message and split out the agent
    name (if the message follows the "[Agent Name] ..." convention used by
    Agent.log()). Returns (agent_name, clean_message).
    """
    clean = ANSI_ESCAPE_RE.sub("", raw_message)
    match = AGENT_PREFIX_RE.match(clean)
    if match:
        return match.group("agent"), match.group("rest")
    return "System", clean


class LogBus:
    """
    A minimal, thread-safe-enough pub/sub broadcaster for log events.

    publish() may be called from any thread (agent code frequently runs
    inside a threadpool via asyncio.to_thread since the underlying OpenAI /
    requests / modal calls are all synchronous and blocking). To safely hand
    events to asyncio.Queue objects that are consumed from the event loop
    thread, we schedule the put via call_soon_threadsafe on the loop that
    was active when the bus was initialized.
    """

    def __init__(self) -> None:
        self._subscribers: set[asyncio.Queue] = set()
        self._loop: Optional[asyncio.AbstractEventLoop] = None

    def bind_loop(self, loop: Optional[asyncio.AbstractEventLoop] = None) -> None:
        """
        Record the running event loop so publish() (which may be called from
        worker threads) can safely schedule queue puts on it. Should be
        called once during application startup.
        """
        self._loop = loop or asyncio.get_event_loop()

    def subscribe(self) -> asyncio.Queue:
        queue: asyncio.Queue = asyncio.Queue()
        self._subscribers.add(queue)
        return queue

    def unsubscribe(self, queue: asyncio.Queue) -> None:
        self._subscribers.discard(queue)

    def publish(self, event: dict) -> None:
        if self._loop is None:
            # No event loop bound yet (e.g. publish() called before startup) - drop.
            return
        for queue in list(self._subscribers):
            try:
                self._loop.call_soon_threadsafe(queue.put_nowait, event)
            except RuntimeError:
                # Loop is closed (e.g. during shutdown) - nothing to do.
                pass


# Module-level singleton, shared across the app
log_bus = LogBus()


class WebSocketLogHandler(logging.Handler):
    """
    A logging.Handler that publishes every log record onto the LogBus as a
    structured event, so it can be streamed to WebSocket clients. This is
    attached alongside (not instead of) the console StreamHandler set up by
    init_logging(), so console logging keeps working unchanged.
    """

    def emit(self, record: logging.LogRecord) -> None:
        try:
            raw_message = record.getMessage()
            agent, message = parse_log_message(raw_message)
            event = {
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "agent": agent,
                "level": record.levelname,
                "message": message,
            }
            log_bus.publish(event)
        except Exception:
            self.handleError(record)
