"""
One-off migration script: seeds the DealScout SQLite database from the
memory.json file used by the original week8 Gradio app (JSON-file
persistence), so history captured during course development isn't lost.

Run from repo root:
    uv run python backend/scripts/migrate_memory_json.py

Idempotent: does nothing if the opportunity table already has rows.
"""

import asyncio
import json
import sys
from pathlib import Path

# Hardcoded path to the source course repo's memory.json - this is a one-off
# migration from llm_engineering/week8, not something the app depends on at
# runtime.
SOURCE_MEMORY_JSON = Path(
    "/Users/chakri/courses/llm_engineering/week8/memory.json"
)

# Make the `app` package importable when this script is run directly via
# `uv run python scripts/migrate_memory_json.py` from backend/.
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlmodel import select  # noqa: E402

from app.db import async_session_maker, engine, init_db  # noqa: E402
from app.models import Opportunity  # noqa: E402


async def main() -> None:
    if not SOURCE_MEMORY_JSON.exists():
        print(f"Source file not found: {SOURCE_MEMORY_JSON} - nothing to migrate.")
        return

    await init_db()

    async with async_session_maker() as session:
        result = await session.exec(select(Opportunity))
        existing_count = len(result.all())
        if existing_count > 0:
            print(
                f"Opportunity table already has {existing_count} row(s) - "
                "skipping migration (idempotent)."
            )
            return

        with SOURCE_MEMORY_JSON.open("r") as f:
            data = json.load(f)

        inserted = 0
        for entry in data:
            deal = entry["deal"]
            opportunity = Opportunity(
                deal_description=deal["product_description"],
                deal_price=deal["price"],
                deal_url=deal["url"],
                estimate=entry["estimate"],
                discount=entry["discount"],
            )
            session.add(opportunity)
            inserted += 1

        await session.commit()
        print(f"Migrated {inserted} opportunity row(s) from {SOURCE_MEMORY_JSON}.")

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
