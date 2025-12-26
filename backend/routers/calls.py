

from fastapi import APIRouter, Depends, HTTPException, Body
from sqlmodel import Session, select
from database.connection import get_session
from database.models import Call, CallStatusEvent
from services.call_service import CallService
import httpx
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

router = APIRouter()


# Response Models for API clarity and validation
class CallListResponse(BaseModel):
    """Response model for call list endpoint - excludes heavy fields for performance"""
    id: str
    client_id: str
    phone_number: Optional[str] = None
    status: Optional[str] = None
    started_at: Optional[datetime] = None
    ended_at: Optional[datetime] = None
    cost: Optional[float] = None
    user_id: Optional[str] = None
    username: Optional[str] = None
    duration: Optional[int] = None
    recording_url: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    
    # Computed boolean flags (not in DB model)
    hasListenUrl: bool
    hasLiveTranscript: bool
    hasFinalTranscript: bool


class CallDetailResponse(CallListResponse):
    """Response model for single call endpoint - includes full transcript and summary"""
    live_transcript: Optional[str] = None
    final_transcript: Optional[str] = None
    summary: Optional[dict] = None


@router.get("/api/{client_id}/calls", response_model=List[CallListResponse])
def listCalls(client_id: str, user_id: Optional[str] = None, session: Session = Depends(get_session)):
    """
    List calls for a specific client.
    Returns lightweight call summaries without heavy transcript/summary fields.
    """
    stmt = (
        select(Call)
        .where(Call.client_id == client_id)
    )
    
    if user_id:
        stmt = stmt.where(Call.user_id == user_id)
        
    stmt = stmt.order_by(Call.created_at.desc())
    calls = session.exec(stmt).all()
    
    # Build response list with explicit fields
    response = [
        CallListResponse(
            # Explicitly include only the fields we want
            id=c.id,
            client_id=c.client_id,
            phone_number=c.phone_number,
            status=c.status,
            started_at=c.started_at,
            ended_at=c.ended_at,
            cost=c.cost,
            user_id=c.user_id,
            username=c.username,
            duration=c.duration,
            recording_url=c.recording_url,
            created_at=c.created_at,
            updated_at=c.updated_at,
            # Computed flags
            hasListenUrl=bool(c.listen_url),
            hasLiveTranscript=bool(c.live_transcript),
            hasFinalTranscript=bool(c.final_transcript),
        )
        for c in calls
    ]
    
    return response


@router.get("/api/calls/{call_id}", response_model=CallDetailResponse)
def detailCall(call_id: str, session: Session = Depends(get_session)):
    """
    Get full details for a single call.
    Includes complete transcript and summary data.
    """
    call = session.get(Call, call_id)
    if not call:
        raise HTTPException(status_code=404, detail="Call not found")
    
    # Build response with explicit fields
    response = CallDetailResponse(
        # Explicitly include all fields we want to return
        id=call.id,
        client_id=call.client_id,
        phone_number=call.phone_number,
        status=call.status,
        started_at=call.started_at,
        ended_at=call.ended_at,
        cost=call.cost,
        user_id=call.user_id,
        username=call.username,
        duration=call.duration,
        recording_url=call.recording_url,
        created_at=call.created_at,
        updated_at=call.updated_at,
        # Heavy fields (included for detail view)
        live_transcript=call.live_transcript,
        final_transcript=call.final_transcript,
        summary=call.summary,
        # Computed flags
        hasListenUrl=bool(call.listen_url),
        hasLiveTranscript=bool(call.live_transcript),
        hasFinalTranscript=bool(call.final_transcript),
    )
    
    return response


@router.post("/api/{client_id}/calls/{call_id}/force-transfer")
async def force_transfer_call(
    client_id: str,
    call_id: str,
    data: dict = Body(...),
    session: Session = Depends(get_session),
):
    """
    Force-transfer a live CallMark AI call to a human agent using the call's control_url.

    Expected body:
    {
      "agent_phone_number": "+1XXXXXXXXXX",
      "content": "Transferring your call now"   # optional
    }
    """
    agent_phone = data.get("agent_phone_number")
    if not agent_phone:
        raise HTTPException(
            status_code=400,
            detail="Missing 'agent_phone_number' in request body.",
        )

    # Optional custom message to the caller
    content = data.get("content") or "Transferring your call now"

    call = session.get(Call, call_id)
    if not call or call.client_id != client_id:
        raise HTTPException(
            status_code=404,
            detail="Call not found for this client.",
        )

    if not call.control_url:
        raise HTTPException(
            status_code=400,
            detail="No control_url stored for this call; cannot force transfer.",
        )

    # 🔴 IMPORTANT: use vprods expected payload shape
    payload = {
        "type": "transfer",
        "destination": {
            "type": "number",
            "number": agent_phone,
        },
        "content": content,
    }

    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.post(call.control_url, json=payload)
    except Exception as e:
        print("[force-transfer] Error calling control_url:", e)
        raise HTTPException(
            status_code=502,
            detail=f"Error calling control_url: {e}",
        )

    if resp.status_code >= 400:
        print(
            "[force-transfer] vprod control_url responded with error:",
            resp.status_code,
            resp.text,
        )
        raise HTTPException(
            status_code=520, # using 520 for upstream error
            detail=f"Vprod control_url error {resp.status_code}: {resp.text}",
        )
    
    # Optional: log status event
    event = CallStatusEvent(
        call_id=call.id,
        client_id=call.client_id,      # ✅ required, NOT NULL
        status="force-transfer",       # ✅ some descriptive status
        payload={                      # ✅ actual JSON, not null
            "agent_phone_number": agent_phone,
            "content": content,
        },
    )
    session.add(event)
    session.commit()

    return {
        "ok": True,
        "call_id": call.id,
        "forwarded_to": agent_phone,
        #"control_url": call.control_url,
    }
