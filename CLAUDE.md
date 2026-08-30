# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

DealScout is an autonomous multi-agent deal-hunting system: it scans deal RSS feeds, estimates the "true value" of each item using three independent pricing strategies, and records an alert message (crafted by Claude, stored in SQLite, shown in the frontend's Messages tab) when it finds a real bargain. It's a standalone extraction of the "Price is Right" capstone from Ed Donner's *LLM Engineering* course (weeks 6-8), rebuilt as a FastAPI backend + React frontend instead of the original single-process Gradio/notebook app.

FastAPI backend (`backend/`) + React/TypeScript frontend (`frontend/`), talking over REST + a WebSocket log stream. No test suite exists in this repo yet.

The `uv` project (`.venv`, `pyproject.toml`, `uv.lock`, `.python-version` = `3.12.12`) and the `.env` file live at the **repo root**, not inside `backend/`, even though the FastAPI app code lives in `backend/app/`. Root `run.py` launches uvicorn with `app_dir="backend"`, which prepends `backend/` to `sys.path` so `app.main:app` resolves and all `app.xxx`-qualified imports inside `backend/app/**` work unchanged. Always run backend commands (`uv run ...`) from the repo root, not from inside `backend/`.

## Commands

### Backend (repo root, uses `uv`)
```bash
uv sync            # install deps into the root .venv (Python 3.12.12)
uv run run.py       # run dev server (equivalent to: uv run uvicorn app.main:app --reload --app-dir backend)
./dev.sh            # run backend + frontend together (Ctrl+C stops both)
```
Requires a repo-root `.env` (copy from `.env.example`) with `OPENAI_API_KEY` and `ANTHROPIC_API_KEY`, and a Modal account authenticated (`modal token set`) with the `pricer-service` app deployed.

### Frontend (`frontend/`, uses `npm`)
```bash
npm install
npm run dev       # vite dev server
npm run build     # tsc -b && vite build
npm run lint      # oxlint
npm run preview
```

## Architecture

```
Scan (RSS feeds)  →  AutonomousPlanningAgent (tool-calling LLM)
                         ├─ Specialist agent    → fine-tuned Llama-3.2-3B, deployed on Modal (GPU)
                         ├─ Frontier agent      → RAG (Chroma vector store) + frontier LLM
                         └─ Neural network agent → classic PyTorch DNN, local inference
                     → best discount surfaces as an Opportunity → persisted (SQLite) → in-app alert message (AgentMessage row, shown in the UI)
```

### Backend layout (`backend/app/`)
- `main.py` — FastAPI app + lifespan setup. A single `DealScoutEngine` instance (`engine`) is created at import time and shared across all requests (agents inside it are lazily initialized on first use via `init_agents_as_needed()`, since they're expensive to construct — loading models, connecting to Chroma/Modal, etc).
- `core/framework.py` — `DealScoutEngine`, ported from the original course's `deal_agent_framework.py`. Owns the Chroma client/collection and the `AutonomousPlanningAgent`. `run()` reconstructs planner memory from persisted `Opportunity` rows, runs one planning cycle in a thread (`asyncio.to_thread`, since the planner's OpenAI/requests/Modal calls are synchronous/blocking), and persists any resulting Opportunity plus the Messaging Agent's crafted alert text (an `AgentMessage` row, read from `planner.message` — sync agent code never touches the async DB session).
- `core/log_bus.py` — pub/sub `LogBus` that lets agent code (running in worker threads) publish structured log events, consumed by WebSocket clients. `WebSocketLogHandler` is a `logging.Handler` that taps every `logging.info(...)` call and republishes it; agents identify themselves via a `[Agent Name] message` prefix convention (see `agents/base.py Agent.log()`), which `log_bus.parse_log_message()` parses back out.
- `agents/` — ported near-verbatim from the course repo:
  - `base.py` — `Agent` superclass; just provides colored `self.log()`.
  - `deals.py` — `ScrapedDeal` (RSS scraping via feedparser/BeautifulSoup from dealnews.com feeds), and pydantic models `Deal`, `DealSelection`, `Opportunity` (agent-facing, distinct from `app/models.py`'s DB-facing `Opportunity`).
  - `scanner_agent.py` — fetches RSS deals, uses OpenAI structured outputs to pick the 5 best.
  - `autonomous_planning_agent.py` — the orchestrator. Gives an OpenAI model 3 tools (scan / estimate / notify) and loops on tool calls until it replies with plain text. This is the key departure from the original course's rule-based `PlanningAgent` — here the LLM decides the flow itself rather than following a hardcoded scan→price→decide sequence.
  - `ensemble_agent.py` — runs `preprocessor` then all three pricing agents and combines them with fixed weights (`frontier*0.8 + specialist*0.1 + neural_network*0.1`).
  - `specialist_agent.py` — calls the fine-tuned model on Modal (`modal.Cls.from_name("pricer-service", "Pricer")`).
  - `frontier_agent.py` — RAG: embeds the description (SentenceTransformer), queries the Chroma `products` collection for 5 similar items, asks an OpenAI model to estimate price given that context.
  - `neural_network_agent.py` / `deep_neural_network.py` — local PyTorch DNN inference using the repo-root `data/deep_neural_network.pth`.
  - `preprocessor.py` — rewrites/normalizes a product description via `litellm.completion` (gpt-5.1, `reasoning_effort="none"`) before pricing.
  - `messaging_agent.py` — crafts an alert message via `litellm.completion` (Claude) and returns the text; persistence happens in `core/framework.py` (no Pushover — replaced by the in-app messages table).
- `routers/` — thin FastAPI routers: `opportunities.py` (CRUD reads on persisted opportunities), `scan.py` (kicks off one `DealScoutEngine.run()` cycle as a `BackgroundTasks` job and publishes a `run_complete` event on the log bus when done — not returned synchronously, since a run can take a while), `messages.py` (reads persisted `AgentMessage` alert rows), `ws.py` (`/ws/logs` — streams `log_bus` events to connected clients).
- `models.py` — SQLModel `Opportunity` and `AgentMessage` (DB tables) with `OpportunityRead`/`AgentMessageRead` response schemas. `Opportunity` is distinct from `agents/deals.py`'s pydantic `Opportunity`, which is the agent-facing/in-memory shape; `core/framework.py` converts between the two.
- `config.py` — `pydantic-settings` `Settings`, loaded from the repo-root `.env` (resolved via an absolute path computed from `config.py`'s own location, so it works regardless of CWD; not committed). Also holds `frontend_origin`, used for CORS.
- `db.py` — async SQLModel/SQLAlchemy engine + session factory (SQLite by default, repo-root `data/dealscout.db`).

Data artifacts (repo-root `data/products_vectorstore/`, `data/*.pth`, `data/dealscout.db`) are gitignored — the vectorstore/weights are normally copied from the course repo rather than regenerated; `scripts/build_vectorstore.py` exists only to rebuild the vector store from scratch if needed (run from repo root: `uv run python backend/scripts/build_vectorstore.py`). `modal_app/pricer_service.py` defines the remote Modal app/class that `specialist_agent.py` calls into — it's deployed separately (`modal deploy`) and isn't run as part of the FastAPI backend.

### Frontend layout (`frontend/src/`)
- `api.ts` — all backend I/O: REST fetch helpers (`fetchOpportunities`, `runScan`, `fetchMessages`) hitting `API_BASE` (from `VITE_API_BASE`, default `http://localhost:8000`), plus `connectLogSocket` for the log WebSocket (`WS_URL` derived from `API_BASE`). Types here (`Opportunity`, `AgentMessage`, `LogEvent`, `RunCompleteEvent`) mirror the backend's Pydantic/SQLModel schemas.
- `useLogSocket.ts` — hook wrapping the log WebSocket with auto-reconnect (exponential backoff) and a capped in-memory log buffer (`MAX_LOG_ENTRIES = 500`); also dispatches `run_complete` events to a caller-supplied callback rather than treating them as log lines.
- `App.tsx` — top-level layout wiring `useLogSocket`'s `onRunComplete` to prepend newly-discovered opportunities into local state (the scan endpoint returns immediately with `{status: "started"}`; the actual result arrives later over the log socket). Also derives the pyramid's `activeAgent`/`visitedAgents` from the latest log event's agent name via `AGENT_NODE_MAP`.
- `components/` — `AgentPyramid` (compact SVG diagram of the 7-agent hierarchy; the currently-working agent's circular icon node pulses in its own color, driven purely by the log stream — no dedicated backend events; sits side-by-side with the activity panel in App's dashboard grid), `OpportunitiesTable`, `RunScanButton`, `ActivityPanel` (tabbed panel: Activity Log / Messages), `LogPanel` (log stream body), `MessagesPanel` (fetches `/api/messages` on tab open and on each completed run), `RunCompleteModal` (celebration popup showing the crafted alert when a run surfaces a deal).

`API_BASE`/`WS_URL` default to localhost:8000 for dev but can be overridden via `VITE_API_BASE` (Vite only exposes `VITE_`-prefixed vars, and only from `frontend/.env`, not the repo-root one — the backend's and frontend's env files are independent).

## Key things to know when changing code here

- Agent code (`app/agents/**`) is largely a direct port of the original notebook-based course project, kept close to its original form; when modifying it, preserve the `Agent.log()` `[Agent Name] message` convention since `log_bus.py` depends on parsing it.
- The two `Opportunity` types (`app.models.Opportunity` = DB row, `app.agents.deals.Opportunity` = agent-facing pydantic model) are not interchangeable — conversions happen explicitly in `core/framework.py`.
- LLM calls are split across providers/SDKs depending on the agent: `openai` SDK directly in `scanner_agent.py`/`frontier_agent.py`/`autonomous_planning_agent.py`, `litellm.completion` in `preprocessor.py` (gpt-5.1) and `messaging_agent.py` (Claude).
- Planner and pricing calls are synchronous/blocking (OpenAI SDK, `requests`, Modal `.remote()`), so anything invoking them from an async FastAPI path must go through `asyncio.to_thread` (see `DealScoutEngine.run`) to avoid blocking the event loop.
