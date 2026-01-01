

from fastapi import APIRouter, Depends, HTTPException, Body
from sqlmodel import Session, select
from database.connection import get_session
from database.models import Call, CallStatusEvent
from services.call_service import CallService
import httpx
import os
from pydantic import BaseModel
from pydantic import BaseModel
from services.supabase_service import supabase, create_signed_url
from typing import Optional, List
from datetime import datetime, timezone
from dependencies.auth import get_current_user, UserContext, get_secure_session

router = APIRouter()

def ensure_utc(dt: Optional[datetime]) -> Optional[datetime]:
    """Ensure datetime is timezone-aware UTC. If naive, assume UTC."""
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt


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
    
    # New fields
    sentiment: Optional[str] = None
    disposition: Optional[str] = None
    notes: Optional[str] = None
    feedback_rating: Optional[int] = None
    feedback_text: Optional[str] = None
    
    # Heavy fields (now included in list)
    final_transcript: Optional[str] = None
    summary: Optional[dict] = None
    
    # Computed boolean flags (not in DB model)
    hasListenUrl: bool
    hasLiveTranscript: bool
    hasFinalTranscript: bool
    
    # Export-only fields
    signed_recording_url: Optional[str] = None


class CallDetailResponse(CallListResponse):
    """Response model for single call endpoint - includes full transcript and summary"""
    live_transcript: Optional[str] = None


@router.get("/api/{client_id}/calls", response_model=List[CallListResponse])
def listCalls(
    client_id: str, 
    include_content: bool = False,
    user_id: Optional[str] = None, 
    session: Session = Depends(get_secure_session),
    current_user: UserContext = Depends(get_current_user)
):
    """
    List calls for a specific client.
    Returns lightweight call summaries without heavy transcript/summary fields.
    Use include_content=True to get full transcript/summary data (slower).
    """
    # 1. Strict Tenant/Client Check
    if current_user.client_id != client_id:
        raise HTTPException(status_code=403, detail="Access denied to this client")

    stmt = (
        select(Call)
        .where(Call.client_id == current_user.client_id)
    )
    
    # Authorization Logic is now handled by RLS via get_secure_session
    # We just need to query the table, and Postgres filters it for us.
    stmt = stmt.order_by(Call.created_at.desc())
    calls = session.exec(stmt).all()
    
    # Build response list with explicit fields
    response = []
    bucket_name = os.getenv("SUPABASE_BUCKET", "recordings")
    
    for c in calls:
        # Calculate heavy fields only if requested
        signed_url = None
        if include_content and c.recording_url:
             # 7 days expiry for exports
             signed_url = create_signed_url(c.recording_url, bucket_name, 3600 * 24 * 7, token=current_user.token)

        response.append(CallListResponse(
            # Explicitly include only the fields we want
            id=c.id,
            client_id=c.client_id,
            phone_number=c.phone_number,
            status=c.status,
            started_at=ensure_utc(c.started_at),
            ended_at=ensure_utc(c.ended_at),
            cost=c.cost,
            user_id=str(c.user_id) if c.user_id else None,
            username=c.username,
            duration=c.duration,
            recording_url=c.recording_url,
            created_at=ensure_utc(c.created_at),
            updated_at=ensure_utc(c.updated_at),
            # New fields
            sentiment=c.sentiment,
            disposition=c.disposition,
            notes=c.notes,
            feedback_rating=c.feedback_rating,
            feedback_text=c.feedback_text,
            # Heavy fields (conditional)
            final_transcript=c.final_transcript if include_content else None,
            summary=c.summary if include_content else None,
            signed_recording_url=signed_url,
            # Computed flags
            hasListenUrl=bool(c.listen_url),
            hasLiveTranscript=bool(c.live_transcript),
            hasFinalTranscript=bool(c.final_transcript),
        ))
    
    return response


@router.get("/api/calls/{call_id}", response_model=CallDetailResponse)
def detailCall(
    call_id: str, 
    session: Session = Depends(get_secure_session),
    current_user: UserContext = Depends(get_current_user)
):
    """
    Get full details for a single call.
    Includes complete transcript and summary data.
    """
    call = session.get(Call, call_id)
    if not call:
        raise HTTPException(status_code=404, detail="Call not found")

    # Strict Access Check
    if call.client_id != current_user.client_id:
         raise HTTPException(status_code=404, detail="Call not found") # Hide existence
    
    # Cast user_id to string for comparison (DB returns UUID obj)
    if current_user.role != "admin" and str(call.user_id) != current_user.id:
         raise HTTPException(status_code=403, detail="Access denied")
    
    # Build response with explicit fields
    response = CallDetailResponse(
        # Explicitly include all fields we want to return
        id=call.id,
        client_id=call.client_id,
        phone_number=call.phone_number,
        status=call.status,
        started_at=ensure_utc(call.started_at),
        ended_at=ensure_utc(call.ended_at),
        cost=call.cost,
        user_id=str(call.user_id) if call.user_id else None,
        username=call.username,
        duration=call.duration,
        recording_url=call.recording_url,
        created_at=ensure_utc(call.created_at),
        updated_at=ensure_utc(call.updated_at),
        # New fields
        sentiment=call.sentiment,
        disposition=call.disposition,
        notes=call.notes,
        feedback_rating=call.feedback_rating,
        feedback_text=call.feedback_text,
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
    session: Session = Depends(get_secure_session),
    current_user: UserContext = Depends(get_current_user)
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
    
    # 1. ID checks
    if not call or call.client_id != client_id:
        raise HTTPException(
            status_code=404,
            detail="Call not found for this client.",
        )
        
    # 2. Auth checks
    if current_user.client_id != client_id:
        raise HTTPException(status_code=403, detail="Access denied")
        
    # Only admins or the owner should transfer? Assuming yes.
    if current_user.role != "admin" and str(call.user_id) != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

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


@router.get("/api/calls/{call_id}/recording")
def get_call_recording(
    call_id: str, 
    session: Session = Depends(get_secure_session),
    current_user: UserContext = Depends(get_current_user)
):
    """
    Get a secure, temporary signed URL for the call recording.
    """
    call = session.get(Call, call_id)
    if not call or not call.recording_url:
        raise HTTPException(status_code=404, detail="Recording not found")
        
    # Strictly enforce client boundary
    if call.client_id != current_user.client_id:
         raise HTTPException(status_code=404, detail="Recording not found")

    if current_user.role != "admin" and str(call.user_id) != current_user.id:
         raise HTTPException(status_code=403, detail="Access denied")

    bucket = os.getenv("SUPABASE_BUCKET", "recordings")
    signed_url = create_signed_url(call.recording_url, bucket, 3600 * 24, token=current_user.token) # 24 hours

    if not signed_url:
         # Fallback or error
         # If checking if it was just failure to sign vs not knowing
         if not supabase:
             raise HTTPException(status_code=503, detail="Supabase client not configured")
         
         # Assuming failure to sign
         raise HTTPException(status_code=500, detail="Failed to generate signed URL")

    return {"url": signed_url}


@router.patch("/api/calls/{call_id}")
def update_call(
    call_id: str, 
    payload: dict = Body(...), 
    session: Session = Depends(get_secure_session),
    current_user: UserContext = Depends(get_current_user)
):
    """
    Update call details like notes and feedback.
    """
    call = session.get(Call, call_id)
    if not call:
        raise HTTPException(status_code=404, detail="Call not found")
        
    # Permission Check
    if call.client_id != current_user.client_id:
        raise HTTPException(status_code=404, detail="Call not found")
        
    if current_user.role != "admin" and str(call.user_id) != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
        
    # Update fields if present in payload
    if "notes" in payload:
        call.notes = payload["notes"]
    if "feedback_rating" in payload:
        call.feedback_rating = payload["feedback_rating"]
    if "feedback_text" in payload:
        call.feedback_text = payload["feedback_text"]
        
    session.add(call)
    session.commit()
    session.refresh(call)
    
    return {"ok": True, "call": call}
