
from fastapi import APIRouter, Body, Depends
from sqlmodel import Session
from database.connection import get_session
from services.call_service import CallService

router = APIRouter()

@router.post("/webhooks/vprod/{client_id}")
async def vprod_server_webhook(
    client_id: str,
    payload: dict = Body(...),
    session: Session = Depends(get_session),
):
    """
    Vprod Server URL handler.

    We branch logic by message.type:

    1. status-update    -> call state changes (ringing, in-progress, completed)
    2. transcript       -> incremental transcript updates (live transcript)
    3. end-of-call-*    -> final report (final transcript, recording URL, summary)
    """

    message = payload.get("message", payload)
    msg_type = (message.get("type") or "").lower()

    if msg_type == "status-update":
        return await CallService.handle_status_update(client_id, message, payload, session)

    elif msg_type == "transcript":
        return await CallService.handle_transcript_update(client_id, message, payload, session)

    elif msg_type in {"end-of-call-report"}:
        return await CallService.handle_end_of_call_report(client_id, message, payload, session)

    # Fallback: unknown type -> just log payload
    print(f"\n[Vprod] Unknown message.type='{msg_type}', logging as generic event.")
    return await CallService.handle_generic_event(client_id, message, payload, session)
