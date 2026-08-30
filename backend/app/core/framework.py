"""
DealScoutEngine: ported from week8/deal_agent_framework.py's DealAgentFramework.

Behavioral changes from the original, per the migration plan:
  - The planner is AutonomousPlanningAgent (tool-calling), not the classic
    rule-based PlanningAgent.
  - Persistence goes through SQLModel/SQLite instead of memory.json.
  - init_logging() is exposed as a module-level function but is no longer
    called from the constructor - the app calls it once at startup.
"""

import asyncio
import logging
import sys
from typing import List, Optional

import chromadb
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.agents.autonomous_planning_agent import AutonomousPlanningAgent
from app.agents.deals import Deal as AgentDeal, Opportunity as AgentOpportunity
from app.config import settings
from app.models import AgentMessage, Opportunity

# Colors for logging (matches week8/deal_agent_framework.py)
BG_BLUE = "\033[44m"
WHITE = "\033[37m"
RESET = "\033[0m"


def init_logging() -> None:
    """
    Set up the root logger with a colored console handler, exactly as
    week8/deal_agent_framework.py's init_logging() did. Call this once at
    application startup.
    """
    root = logging.getLogger()
    root.setLevel(logging.INFO)

    handler = logging.StreamHandler(sys.stdout)
    handler.setLevel(logging.INFO)
    formatter = logging.Formatter(
        "[%(asctime)s] [Agents] [%(levelname)s] %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S %z",
    )
    handler.setFormatter(formatter)
    root.addHandler(handler)


class DealScoutEngine:
    def __init__(self) -> None:
        self.client = chromadb.PersistentClient(path=settings.products_vectorstore_path)
        self.collection = self.client.get_or_create_collection("products")
        self.planner: Optional[AutonomousPlanningAgent] = None

    def log(self, message: str) -> None:
        text = BG_BLUE + WHITE + "[Agent Framework] " + message + RESET
        logging.info(text)

    def init_agents_as_needed(self) -> None:
        if not self.planner:
            self.log("Initializing Agent Framework")
            self.planner = AutonomousPlanningAgent(self.collection)
            self.log("Agent Framework is ready")

    async def _load_memory(self, session: AsyncSession) -> List[AgentOpportunity]:
        """
        Reconstruct the planner-facing memory (a list of agents.deals.Opportunity,
        the shape the original code kept in memory.json) from the Opportunity
        rows already persisted in the database.
        """
        result = await session.exec(select(Opportunity))
        rows = result.all()
        memory: List[AgentOpportunity] = []
        for row in rows:
            deal = AgentDeal(
                product_description=row.deal_description,
                price=row.deal_price,
                url=row.deal_url,
            )
            memory.append(AgentOpportunity(deal=deal, estimate=row.estimate, discount=row.discount))
        return memory

    async def run(self, session: AsyncSession) -> Optional[Opportunity]:
        """
        Run one planning cycle (equivalent to the original DealAgentFramework.run()),
        and if the planner surfaces an Opportunity, persist it to the database.

        The planner's `plan()` call is synchronous and blocking (OpenAI, requests,
        and remote Modal calls), so it's run in a thread via asyncio.to_thread to
        avoid blocking the event loop.
        """
        self.init_agents_as_needed()
        memory = await self._load_memory(session)
        logging.info("Kicking off Planning Agent")
        result = await asyncio.to_thread(self.planner.plan, memory)
        logging.info(f"Planning Agent has completed and returned: {result}")
        if result:
            opportunity = Opportunity(
                deal_description=result.deal.product_description,
                deal_price=result.deal.price,
                deal_url=result.deal.url,
                estimate=result.estimate,
                discount=result.discount,
            )
            session.add(opportunity)
            # The Messaging Agent's crafted alert text (if the planner called
            # notify) is persisted here - agent code is synchronous and never
            # touches the async DB session directly.
            if self.planner.message:
                session.add(
                    AgentMessage(
                        content=self.planner.message,
                        deal_url=result.deal.url,
                        deal_price=result.deal.price,
                        estimate=result.estimate,
                        discount=result.discount,
                    )
                )
            await session.commit()
            await session.refresh(opportunity)
            return opportunity
        return None
