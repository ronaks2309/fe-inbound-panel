
from fastapi import APIRouter, Body, Depends
from sqlmodel import Session, select
from datetime import datetime
from database.connection import get_session
from database.models import Call, CallStatusEvent
from services.call_service import CallService
from services.websocket_manager import manager

router = APIRouter()

@router.post("/api/debug/create-test-call/{client_id}")
async def create_test_call(
    client_id: str,
    data: dict = Body(default={}),
    session: Session = Depends(get_session)
):
    """
    Debug helper: create or update (upsert) a fake call for a client
    and broadcast the update to all connected dashboards.
    Also logs a CallStatusEvent row for each invocation.
    """

    phone_number = data.get("phone_number", "+15555550123")
    status = data.get("status", "in-progress")

    # Optional: extra info to store in the event payload
    event_payload = data.get("event_payload")

    # ---- CLEAN, SAFE call_id selection ----
    raw_id = (data.get("call_id") or "").strip()
    call_id = raw_id if raw_id else f"debug-{int(datetime.utcnow().timestamp())}"
    
    call = Call(
        id=call_id,
        client_id=client_id,
        phone_number=phone_number,
        status=status,
        started_at=datetime.utcnow(),
    )
    session.add(call)

    # ---- INSERT CallStatusEvent ----
    status_event = CallStatusEvent(
        call_id=call_id,
        client_id=client_id,
        status=status,
        payload=event_payload,
    )

    session.add(status_event)
    session.commit()
    session.refresh(call)
    session.refresh(status_event)

    # ---- Broadcast to dashboards ----
    await manager.broadcast_dashboard({
        "type": "call-upsert",
        "clientId": client_id,
        "call": {
            "id": call.id,
            "status": call.status,
            "phoneNumber": call.phone_number,
            "startedAt": call.started_at.isoformat() if call.started_at else None,
            "endedAt": call.ended_at.isoformat() if call.ended_at else None,
            "hasListenUrl": False, # debug calls usually don't have real listen URLs
        }
    })

    return {
        "ok": True,
        "call_id": call.id,
        "status_event_id": status_event.id,
    }

@router.post("/api/debug/log-status-event/{client_id}/{call_id}")
async def debug_log_status_event(
    client_id: str,
    call_id: str,
    data: dict = Body(default={}),
    session: Session = Depends(get_session)
):
    """
    Debug helper: manually log a status event for a call.
    This is for testing the CallStatusEvent table.
    """
    status = data.get("status", "in-progress")
    payload = data.get("payload")  # optional arbitrary JSON

    event = CallStatusEvent(
        call_id=call_id,
        client_id=client_id,
        status=status,
        payload=payload,
    )

    session.add(event)
    session.commit()
    session.refresh(event)

    return {"ok": True, "event_id": event.id}


@router.get("/api/debug/status-events/{client_id}/{call_id}")
def debug_get_status_events(
    client_id: str,
    call_id: str,
    session: Session = Depends(get_session)
):
    """
    List all status events for a given call.
    Ordered by creation time.
    """
    stmt = (
        select(CallStatusEvent)
        .where(CallStatusEvent.client_id == client_id)
        .where(CallStatusEvent.call_id == call_id)
        .order_by(CallStatusEvent.created_at.asc())
    )
    events = session.exec(stmt).all()
    return events
