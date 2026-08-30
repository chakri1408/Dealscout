from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.db import get_session
from app.models import Opportunity, OpportunityRead

router = APIRouter()


@router.get("/opportunities", response_model=list[OpportunityRead])
async def list_opportunities(session: AsyncSession = Depends(get_session)):
    """
    Return all persisted opportunities, most recently discovered first.
    """
    result = await session.exec(select(Opportunity).order_by(Opportunity.created_at.desc()))
    return result.all()


@router.get("/opportunities/{opportunity_id}", response_model=OpportunityRead)
async def get_opportunity(opportunity_id: int, session: AsyncSession = Depends(get_session)):
    opportunity = await session.get(Opportunity, opportunity_id)
    if not opportunity:
        raise HTTPException(status_code=404, detail="Opportunity not found")
    return opportunity
