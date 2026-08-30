from fastapi import APIRouter, Depends
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.db import get_session
from app.models import AgentMessage, AgentMessageRead

router = APIRouter()


@router.get("/messages", response_model=list[AgentMessageRead])
async def list_messages(session: AsyncSession = Depends(get_session)):
    """
    Return all persisted agent alert messages, most recent first.
    """
    result = await session.exec(select(AgentMessage).order_by(AgentMessage.created_at.desc()))
    return result.all()
