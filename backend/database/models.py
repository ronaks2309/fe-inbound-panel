
# models.py
from sqlmodel import SQLModel, Field, Column
from sqlalchemy.dialects.sqlite import JSON
from typing import Optional
from datetime import datetime
from sqlalchemy import func


class Client(SQLModel, table=True):
    id: str = Field(primary_key=True)
    name: str
    created_at: datetime = Field(default_factory=datetime.utcnow)


class Call(SQLModel, table=True):
    id: str = Field(primary_key=True)
    client_id: str = Field(foreign_key="client.id")

    phone_number: Optional[str] = None
    status: Optional[str] = None
    started_at: Optional[datetime] = None
    ended_at: Optional[datetime] = None
    cost: Optional[float] = None

    # User Assignment
    user_id: Optional[str] = None
    username: Optional[str] = None
    duration: Optional[int] = None

    # Streaming / live listening
    listen_url: Optional[str] = None
    control_url: Optional[str] = None

    # NEW: Live, incremental transcript (for in-progress calls)
    live_transcript: Optional[str] = None

    # NEW: Final transcript from end-of-call report
    final_transcript: Optional[str] = None

    # Final recording URL from end-of-call report
    recording_url: Optional[str] = None

    # NEW: end-of-call summary / metrics (JSON blob)
    summary: Optional[dict] = Field(
        default=None,
        sa_column=Column(JSON)
    )

    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(
    default_factory=datetime.utcnow,
    sa_column_kwargs={"onupdate": func.now()}  # Auto-update on each UPDATE
    )


class CallStatusEvent(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    call_id: str = Field(foreign_key="call.id")
    client_id: str = Field(foreign_key="client.id")
    # Added for consistency with Call model
    user_id: Optional[str] = None
    
    status: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

    payload: Optional[dict] = Field(
        default=None,
        sa_column=Column(JSON)
    )
