from datetime import datetime
from typing import Optional

from sqlmodel import SQLModel, Field


class Opportunity(SQLModel, table=True):
    """
    A persisted deal opportunity: a Deal where we estimate it should cost
    more than it's being offered for.
    """

    id: Optional[int] = Field(default=None, primary_key=True)
    deal_description: str
    deal_price: float
    deal_url: str
    estimate: float
    discount: float
    created_at: datetime = Field(default_factory=datetime.utcnow)


class OpportunityRead(SQLModel):
    """
    Response schema mirroring Opportunity's fields.
    """

    id: int
    deal_description: str
    deal_price: float
    deal_url: str
    estimate: float
    discount: float
    created_at: datetime


class AgentMessage(SQLModel, table=True):
    """
    A persisted alert message crafted by the Messaging Agent for a surfaced
    deal. Replaces the original Pushover push notification - messages are
    stored here and displayed in the frontend instead.
    """

    id: Optional[int] = Field(default=None, primary_key=True)
    content: str
    deal_url: str
    deal_price: float
    estimate: float
    discount: float
    created_at: datetime = Field(default_factory=datetime.utcnow)


class AgentMessageRead(SQLModel):
    """
    Response schema mirroring AgentMessage's fields.
    """

    id: int
    content: str
    deal_url: str
    deal_price: float
    estimate: float
    discount: float
    created_at: datetime
