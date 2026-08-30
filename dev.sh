#!/usr/bin/env bash
# Start backend + frontend together. Ctrl+C stops both.
set -e
cd "$(dirname "$0")"
trap 'kill 0' EXIT
uv run run.py &
(cd frontend && npm run dev) &
wait
