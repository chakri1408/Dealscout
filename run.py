"""
Entry point for local development: `uv run run.py`

Equivalent to `uv run uvicorn app.main:app --reload --app-dir backend`, just
shorter to type. `app_dir="backend"` prepends backend/ to sys.path so
`app.main:app` resolves without needing backend/ to be a separate uv project.
"""

import uvicorn

if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host="127.0.0.1",
        port=8000,
        reload=True,
        app_dir="backend",
        reload_dirs=["backend"],
        # Bound Ctrl+C: force-close any connection still open (e.g. a browser
        # tab holding /ws/logs) instead of waiting on it forever.
        timeout_graceful_shutdown=3,
    )
