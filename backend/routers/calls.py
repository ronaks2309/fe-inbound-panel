
from fastapi import APIRouter, Depends, HTTPException, Body
from sqlmodel import Session, select
from database.connection import get_session
from database.models import Call, CallStatusEvent
from services.call_service import CallService
import httpx

router = APIRouter()

@router.get("/api/{client_id}/calls")
def list_calls(client_id: str, session: Session = Depends(get_session)):
    """
    List calls for a specific client.
    Masks sensitive internal URLs for privacy.
    """
    stmt = (
        select(Call)
        .where(Call.client_id == client_id)
        .order_by(Call.created_at.desc())
    )
    calls = session.exec(stmt).all()
    # Mask sensitive fields to prevent leak
    public_calls = []
    for c in calls:
        c_dict = c.model_dump()
        c_dict["hasListenUrl"] = bool(c.listen_url)
        
        # Compute if we have a transcript BEFORE removing the fields
        c_dict["hasLiveTranscript"] = bool(c.live_transcript)
        c_dict["hasFinalTranscript"] = bool(c.final_transcript)
        
        # Exclude heavy fields for list view
        c_dict.pop("listen_url", None)
        c_dict.pop("control_url", None)
        c_dict.pop("live_transcript", None)
        c_dict.pop("final_transcript", None)
        c_dict.pop("summary", None)
        public_calls.append(c_dict)
    return public_calls


@router.get("/api/calls/{call_id}")
def get_call(call_id: str, session: Session = Depends(get_session)):
    """
    Get full details for a single call.
    Masks sensitive internal URLs.
    """
    call = session.get(Call, call_id)
    if not call:
        raise HTTPException(status_code=404, detail="Call not found")
    
    # Return full details including transcript/summary
    # But still mask sensitive internal URLs if needed, or proxy them.
    # For now, just scrubbing listen/control URL properties directly
    # and using hasListenUrl is consistent.
    
    c_dict = call.model_dump()
    c_dict["hasListenUrl"] = bool(call.listen_url)
    c_dict.pop("listen_url", None)
    c_dict.pop("control_url", None)
    
    return c_dict


@router.post("/api/{client_id}/calls/{call_id}/force-transfer")
async def force_transfer_call(
    client_id: str,
    call_id: str,
    data: dict = Body(...),
    session: Session = Depends(get_session),
):
    """
    Force-transfer a live vprod call to a human agent using the call's control_url.

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
