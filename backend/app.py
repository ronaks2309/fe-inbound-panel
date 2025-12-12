#app.py
# To run the app, use:
#  python -m uvicorn app:app --reload --port 8000   

import os
import asyncio
import random

import httpx
from fastapi import HTTPException

from fastapi import FastAPI, Depends, WebSocket, WebSocketDisconnect, Body, Request
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import Session, select
from datetime import datetime
import json

from db import init_db, get_session, engine
from models import Client, Call, CallStatusEvent
from websocket_manager import manager #from websocket_manager.py


app = FastAPI()

# CORS so frontend can call it later
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # we’ll tighten later
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create tables on startup and seed demo client
@app.on_event("startup")
def on_startup():
    init_db()
    from db import engine
    from sqlmodel import Session

    with Session(engine) as session:
        existing = session.get(Client, "demo-client")
        if not existing:
            demo = Client(id="demo-client", name="Demo Client")
            session.add(demo)
            session.commit()
    
    # Ensure recordings directory exists
    os.makedirs("recordings", exist_ok=True)

@app.get("/")
def read_root():
    return {"message": "Vapi dashboard backend is running"}

# --- File Serving: Recordings --- #
@app.get("/api/recordings/{filename}")
async def get_recording(filename: str):
    file_path = os.path.join("recordings", filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Recording not found")
    return FileResponse(file_path)

@app.get("/health")
def health():
    return {"status": "ok"}


# --- VAPI Webhook Handler --- #
@app.post("/webhooks/vapi/{client_id}")
async def vapi_server_webhook(
    client_id: str,
    payload: dict = Body(...),
    session: Session = Depends(get_session),
):
    """
    VAPI Server URL handler.

    We branch logic by message.type:

    1. status-update    -> call state changes (ringing, in-progress, completed)
    2. transcript       -> incremental transcript updates (live transcript)
    3. end-of-call-*    -> final report (final transcript, recording URL, summary)
    """

    message = payload.get("message", payload)
    msg_type = (message.get("type") or "").lower()

    if msg_type == "status-update":
        return await _handle_status_update(client_id, message, payload, session)

    elif msg_type == "transcript":
        return await _handle_transcript_update(client_id, message, payload, session)

    elif msg_type == "assistant.started":
        return await _handle_assistant_started(client_id, message, payload, session)

    elif msg_type in {"end-of-call-report"}:
        return await _handle_end_of_call_report(client_id, message, payload, session)

    # Fallback: unknown type -> just log payload
    print(f"\n[VAPI] Unknown message.type='{msg_type}', logging as generic event.")
    return await _handle_generic_event(client_id, message, payload, session)


# NEW: list calls for a client
@app.get("/api/{client_id}/calls")
def list_calls(client_id: str, session: Session = Depends(get_session)):
    stmt = (
        select(Call)
        .where(Call.client_id == client_id)
        .order_by(Call.created_at.desc())
    )
    calls = session.exec(stmt).all()
    # Mask sensitive fields to prevent leak
    public_calls = []
    for c in calls:
        c_dict = c.dict()
        c_dict["hasListenUrl"] = bool(c.listen_url)
        c_dict.pop("listen_url", None)
        c_dict.pop("control_url", None) # also sensitive
        public_calls.append(c_dict)
    return public_calls

# --- DEBUG: create or update a fake call --- #
@app.post("/api/debug/create-test-call/{client_id}")
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

    # ---- UPSERT Call ----
    existing = session.get(Call, call_id)

    if existing:
        existing.status = status
        existing.phone_number = phone_number or existing.phone_number
        existing.updated_at = datetime.utcnow()
        call = existing
        is_update = True
    else:
        call = Call(
            id=call_id,
            client_id=client_id,
            phone_number=phone_number,
            status=status,
            started_at=datetime.utcnow(),
        )
        session.add(call)
        is_update = False

    # ---- INSERT CallStatusEvent ----
    status_event = CallStatusEvent(
        call_id=call_id,
        client_id=client_id,
        status=status,
        payload=event_payload,
    )

    session.add(status_event)

    # Commit both call + event together
    session.commit()

    # Refresh objects from DB
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
            "EndedAt": call.ended_at.isoformat() if call.ended_at else None,
            "hasListenUrl": False,
        }
    })

    return {
        "ok": True,
        "call_id": call.id,
        "updated": is_update,
        "status_event_id": status_event.id,
    }



# --- DEBUG: log a status event explicitly --- #
@app.post("/api/debug/log-status-event/{client_id}/{call_id}")
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


# --- DEBUG: list status events for a call --- #
@app.get("/api/debug/status-events/{client_id}/{call_id}")
def debug_get_status_events(
    client_id: str,
    call_id: str,
    session: Session = Depends(get_session)
):
    stmt = (
        select(CallStatusEvent)
        .where(CallStatusEvent.client_id == client_id)
        .where(CallStatusEvent.call_id == call_id)
        .order_by(CallStatusEvent.created_at.asc())
    )
    events = session.exec(stmt).all()
    return events


# --- WebSocket: fake audio stream for testing ListenModal --- #
@app.websocket("/ws/fake-audio")
async def fake_audio_websocket(ws: WebSocket):
    """
    Simple local WS that sends fake binary 'audio' chunks so the frontend
    ListenModal can be tested without a real Vapi listenUrl.
    """
    await ws.accept()
    print("[fake-audio] client connected")

    try:
      # send a small hello text frame
      await ws.send_text('{"type": "hello", "source": "fake-audio"}')

      # send random binary chunks for ~10 seconds or until client disconnects
      # (32kHz mono 16-bit would be ~1280 bytes for 20ms; but content doesn’t matter here)
      for i in range(500):  # 500 * 20ms ≈ 10 seconds
          # 1280 bytes "audio" data
          chunk = os.urandom(1280)
          await ws.send_bytes(chunk)
          await asyncio.sleep(0.02)

      print("[fake-audio] finished sending chunks")
    except Exception as e:
      print("[fake-audio] error:", e)
    finally:
      try:
          await ws.close()
      except Exception:
          pass
      print("[fake-audio] client disconnected")




import websockets # type: ignore

# ... imports ...

# --- WebSocket: Listen Proxy (hides upstream VAPI URL) --- #
@app.websocket("/ws/listen/{call_id}")
async def listen_proxy_websocket(websocket: WebSocket, call_id: str, session: Session = Depends(get_session)):
    await websocket.accept()
    
    # 1. Look up the call
    call = session.get(Call, call_id)
    if not call or not call.listen_url:
        print(f"[listen-proxy] Call {call_id} not found or missing listen_url")
        await websocket.close(code=1000, reason="No listen URL found")
        return

    target_url = call.listen_url
    print(f"[listen-proxy] Proxying {call_id} -> {target_url}")

    # 2. Connect to upstream VAPI
    try:
        async with websockets.connect(target_url, subprotocols=["wss", "https"]) as upstream_ws:
            
            # Create a task to forward upstream -> client
            async def upstream_to_client():
                try:
                    async for message in upstream_ws:
                        # message can be str (text) or bytes (binary)
                        if isinstance(message, str):
                            await websocket.send_text(message)
                        else:
                            await websocket.send_bytes(message)
                except Exception as e:
                    print(f"[listen-proxy] Error upstream->client: {e}")

            # Create a task to forward client -> upstream (rare, but good for heartbeat/close)
            async def client_to_upstream():
                try:
                    while True:
                        # We mostly expect the client to just listen, but we must receive to keep conn alive
                        data = await websocket.receive()
                        # data is a dict like {'type': 'websocket.receive', 'text': ...} or similar if we used raw receive
                        # but FastAPI `websocket.receive()` returns a message dict.
                        # Easier: use receive_text / receive_bytes based on what we see.
                        # But `receive()` is generic. 
                        # actually, let's use the iterator if possible, or simple receive loop
                        
                        if "text" in data:
                            await upstream_ws.send(data["text"])
                        elif "bytes" in data:
                            await upstream_ws.send(data["bytes"])
                        
                        # If client closes? FastAPI raises WebSocketDisconnect usually on receive
                except WebSocketDisconnect:
                    print("[listen-proxy] Client disconnected")
                except Exception as e:
                    print(f"[listen-proxy] Error client->upstream: {e}")

            # Run both
            # We'll stick to a simple loop for client->upstream because FastAPI handles it well,
            # but we need to run upstream_to_client in parallel.
            
            forward_task = asyncio.create_task(upstream_to_client())
            
            try:
                while True:
                     # Receive from client, forward to upstream
                     try:
                        message = await websocket.receive()
                        if message["type"] == "websocket.disconnect":
                            break
                        
                        if "text" in message:
                            await upstream_ws.send(message["text"])
                        if "bytes" in message:
                            await upstream_ws.send(message["bytes"])
                     except RuntimeError:
                         # Websocket might be closed
                         break
            except WebSocketDisconnect:
                print(f"[listen-proxy] Client disconnected {call_id}")
            except Exception as e:
                print(f"[listen-proxy] Error in main loop: {e}")
            finally:
                forward_task.cancel()
                
    except Exception as e:
        print(f"[listen-proxy] Failed to connect upstream: {e}")
        try:
             await websocket.close(code=1011, reason="Upstream connection failed")
        except:
             pass

# --- WebSocket: dashboard live connection --- #
@app.websocket("/ws/dashboard")
async def ws_dashboard(ws: WebSocket):
    await manager.register_dashboard(ws)
    print("Dashboard WS client connected")

    # send an initial hello just to verify
    await ws.send_json({"type": "hello", "message": "Dashboard WebSocket connected"})

    try:
        while True:
            # Handle incoming messages from dashboard (subscribe/unsubscribe)
            data = await ws.receive_json()
            msg_type = data.get("type")
            call_id = data.get("callId")

            if msg_type == "subscribe" and call_id:
                print(f"[WS] Client subscribed to transcript for {call_id}")
                await manager.subscribe(ws, call_id)
                
                # Send current transcript immediately if available
                # We need a session to query DB. "get_session" is a generator dependency.
                # We can manually create a session or assume the client will get next update.
                # BETTER: Just fetch it quickly. 
                # (Ideally, we'd refactor to have session access here, but for now let's just 
                # wait for next update OR try to fetch if we can easily. 
                # Since 'get_session' yields, we can simple use a context manager.)
                with Session(engine) as session:
                    call = session.get(Call, call_id)
                    if call and call.live_transcript:
                         await ws.send_json({
                            "type": "transcript-update",
                            "clientId": "system",
                            "callId": call.id,
                            "append": None, # Full replace or just initial load
                            "fullTranscript": call.live_transcript,
                        })

            elif msg_type == "unsubscribe" and call_id:
                print(f"[WS] Client unsubscribed form {call_id}")
                await manager.unsubscribe(ws, call_id)

    except WebSocketDisconnect:
        print("Dashboard WS client disconnected")
        await manager.unregister_dashboard(ws)
    except Exception as e:
        print(f"[WS] Error in dashboard loop: {e}")
        await manager.unregister_dashboard(ws)


# --- Force-transfer a live call to a human agent --- #
@app.post("/api/{client_id}/calls/{call_id}/force-transfer")
async def force_transfer_call(
    client_id: str,
    call_id: str,
    data: dict = Body(...),
    session: Session = Depends(get_session),
):
    """
    Force-transfer a live Vapi call to a human agent using the call's control_url.

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

    # 🔴 IMPORTANT: use Vapi's expected payload shape
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
            "[force-transfer] Vapi control_url responded with error:",
            resp.status_code,
            resp.text,
        )
        raise HTTPException(
            status_code=502,
            detail=f"Vapi control_url error {resp.status_code}: {resp.text}",
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
        "control_url": call.control_url,
    }



# --- Internal handlers for webhook message types --- #

# Helper to get or create call 
def _get_or_create_call(
    session: Session,
    client_id: str,
    call_id: str,
    *,
    phone_number: str | None = None,
    listen_url: str | None = None,
    control_url: str | None = None,
) -> tuple[Call, bool]:
    """
    Returns (call, is_update).
    Creates a new Call if not existing, otherwise updates basic fields.
    """
    now = datetime.utcnow()
    existing = session.get(Call, call_id)
    if existing:
        call = existing
        is_update = True
    else:
        call = Call(
            id=call_id,
            client_id=client_id,
            phone_number=phone_number,
            listen_url=listen_url,
            control_url=control_url,
            started_at=now,
            status="unknown",
        )
        session.add(call)
        is_update = False

    # Update common fields if provided
    if phone_number:
        call.phone_number = phone_number
    if listen_url:
        call.listen_url = listen_url
    if control_url:
        call.control_url = control_url

    call.updated_at = now
    return call, is_update


# Handler for status-update messages
async def _handle_status_update(
    client_id: str,
    message: dict,
    full_payload: dict,
    session: Session,
):
    status = message.get("status")
    call_data = message.get("call", {})
    call_id = call_data.get("id")
    if not call_id:
        print("[VAPI][status-update] Missing call.id, ignoring.")
        return {"ok": False, "error": "missing call.id"}

    # Prefer customer.number when present
    customer = message.get("customer", {}) or {}
    phone_number = (
        customer.get("number")
        or call_data.get("phoneNumber")
        or call_data.get("from")
    )

    # Monitor object may contain listen/control URLs
    monitor = call_data.get("monitor") or {}
    listen_url = (
        monitor.get("listenURL")
        or monitor.get("listenUrl")
        or monitor.get("listen_url")
        or call_data.get("listenUrl")
        or call_data.get("listen_url")
    )
    control_url = (
        monitor.get("controlURL")
        or monitor.get("controlUrl")
        or monitor.get("control_url")
        or call_data.get("controlUrl")
        or call_data.get("control_url")
    )

    call, is_update = _get_or_create_call(
        session,
        client_id,
        call_id,
        phone_number=phone_number,
        listen_url=listen_url,
        control_url=control_url,
    )

    # Preserve previous behavior: update status, handle completion
    if status:
        call.status = status

    now = datetime.utcnow()
    if status and status.lower() in {"completed", "ended", "finished", "hangup"}:
        call.ended_at = call.ended_at or now

    call.updated_at = now

    # Log event
    status_event = CallStatusEvent(
        call_id=call.id,
        client_id=client_id,
        status=status or "status-update",
        payload=full_payload,
    )
    session.add(status_event)
    session.commit()
    session.refresh(call)
    session.refresh(status_event)

    # Broadcast updated call snapshot
    await manager.broadcast_dashboard({
        "type": "call-upsert",
        "clientId": client_id,
        "call": {
            "id": call.id,
            "status": call.status,
            "phoneNumber": call.phone_number,
            "startedAt": call.started_at.isoformat() if call.started_at else None,
            "endedAt": call.ended_at.isoformat() if call.ended_at else None,
            "hasListenUrl": bool(call.listen_url),
            "hasTranscript": bool(call.final_transcript),
            "hasLiveTranscript": bool(call.live_transcript),
            "hasRecording": bool(call.recording_url),
        }
    })

    return {
        "ok": True,
        "type": "status-update",
        "call_id": call.id,
        "updated": is_update,
        "status_event_id": status_event.id,
    }



# Handler for assistant-started messages
async def _handle_assistant_started(
    client_id: str,
    message: dict,
    full_payload: dict,
    session: Session,
):
    """
    Handle VAPI 'assistant-started' events.

    Expected useful fields (various casing handled):
    - message.call.id
    - message.call.monitor.listenURL / listenUrl / listen_url
    - message.call.monitor.controlURL / controlUrl / control_url
    - message.call.status
    - message.customer.number
    """
    call_data = message.get("call", {}) or {}
    call_id = call_data.get("id")
    if not call_id:
        print("[VAPI][assistant-started] Missing call.id, ignoring.")
        return {"ok": False, "error": "missing call.id"}

    # customer phone number may be in message.customer.number
    customer = message.get("customer", {}) or {}
    phone_number = (
        customer.get("number")
        or call_data.get("phoneNumber")
        or call_data.get("from")
    )

    # Monitor object may contain listen/control URLs
    monitor = call_data.get("monitor") or {}
    listen_url = (
        monitor.get("listenURL")
        or monitor.get("listenUrl")
        or monitor.get("listen_url")
        or call_data.get("listenUrl")
        or call_data.get("listen_url")
    )
    control_url = (
        monitor.get("controlURL")
        or monitor.get("controlUrl")
        or monitor.get("control_url")
        or call_data.get("controlUrl")
        or call_data.get("control_url")
    )

    status = call_data.get("status") or message.get("status") or "assistant-started"

    call, is_update = _get_or_create_call(
        session,
        client_id,
        call_id,
        phone_number=phone_number,
        listen_url=listen_url,
        control_url=control_url,
    )

    if status:
        call.status = status

    call.updated_at = datetime.utcnow()

    # Log event in CallStatusEvent table
    status_event = CallStatusEvent(
        call_id=call.id,
        client_id=client_id,
        status="assistant-started",
        payload=full_payload,
    )
    session.add(status_event)
    session.commit()
    session.refresh(call)
    session.refresh(status_event)

    # Broadcast updated call snapshot so UI can react
    await manager.broadcast_dashboard({
        "type": "call-upsert",
        "clientId": client_id,
        "call": {
            "id": call.id,
            "status": call.status,
            "phoneNumber": call.phone_number,
            "startedAt": call.started_at.isoformat() if call.started_at else None,
            "endedAt": call.ended_at.isoformat() if call.ended_at else None,
            "hasListenUrl": bool(call.listen_url),
            "hasTranscript": bool(call.final_transcript),
            "hasLiveTranscript": bool(call.live_transcript),
            "hasRecording": bool(call.recording_url),
        }
    })

    return {
        "ok": True,
        "type": "assistant-started",
        "call_id": call.id,
        "updated": is_update,
        "status_event_id": status_event.id,
    }


# Handler for transcript messages
"""
Goal:
Populate Call.live_transcript and broadcast a transcript-update message so any open transcript panel can update in real time.
For an in-progress call, when user opens “Live Transcript” panel, we’ll subscribe to these transcript-update messages and update that panel.    
"""

async def _handle_transcript_update(
    client_id: str,
    message: dict,
    full_payload: dict,
    session: Session,
):
    call_data = message.get("call", {})
    call_id = call_data.get("id")
    if not call_id:
        print("[VAPI][transcript] Missing call.id, ignoring.")
        return {"ok": False, "error": "missing call.id"}

    raw_text = (
        message.get("transcript")
        or message.get("finalTranscript")
        or message.get("text")
    )

    role = (message.get("role") or "").lower()
    prefix = ""
    if role == "assistant":
        prefix = "AI: "
    elif role == "user":
        prefix = "User: "

    phone_number = call_data.get("phoneNumber") or call_data.get("from")
    listen_url = call_data.get("listenUrl") or call_data.get("listen_url")
    control_url = call_data.get("controlUrl") or call_data.get("control_url")

    call, is_update = _get_or_create_call(
        session,
        client_id,
        call_id,
        phone_number=phone_number,
        listen_url=listen_url,
        control_url=control_url,
    )

    # Build transcript_text to broadcast; but when consecutive fragments from
    # the same role arrive, append to the last line without adding prefix
    transcript_text = None
    if raw_text:
        # If there's existing live_transcript, inspect last line to determine role
        if call.live_transcript:
            lines = call.live_transcript.splitlines()
            last_line = lines[-1] if lines else ""
            last_role = None
            if last_line.startswith("AI: "):
                last_role = "assistant"
            elif last_line.startswith("User: "):
                last_role = "user"

            if last_role == role:
                # Same role as last line: append directly without prefix or newline
                append_chunk = raw_text
                call.live_transcript = call.live_transcript + append_chunk
                transcript_text = append_chunk
            else:
                # Different role: start a new line with prefix
                append_chunk = (prefix + raw_text).strip()
                call.live_transcript = call.live_transcript + "\n" + append_chunk
                transcript_text = append_chunk
        else:
            # No existing transcript: start with prefixed text
            append_chunk = (prefix + raw_text).strip()
            call.live_transcript = append_chunk
            transcript_text = append_chunk

    call.updated_at = datetime.utcnow()

    # Log event
    status_event = CallStatusEvent(
        call_id=call.id,
        client_id=client_id,
        status="transcript",
        payload=full_payload,
    )
    session.add(status_event)
    session.commit()
    session.refresh(call)
    session.refresh(status_event)

    # Broadcast transcript-update ONLY to subscribers
    await manager.broadcast_transcript({
        "type": "transcript-update",
        "clientId": client_id,
        "callId": call.id,
        "append": transcript_text,
        "fullTranscript": call.live_transcript,
    }, call_id=call.id)
    
    # If this is the FIRST chunk, we might want to notify general dashboard 
    # that "hasLiveTranscript" is now true. 
    # We can do a lightweight call-upsert only if needed.
    # Logic: if call.live_transcript was just created (length == len(append_chunk)), broadcast.
    if transcript_text and call.live_transcript and len(call.live_transcript) == len(transcript_text):
         # This is likely the first chunk
         await manager.broadcast_dashboard({
            "type": "call-upsert",
            "clientId": client_id,
            "call": {
                "id": call.id,
                "status": call.status,
                "phoneNumber": call.phone_number,
                "startedAt": call.started_at.isoformat() if call.started_at else None,
                "endedAt": call.ended_at.isoformat() if call.ended_at else None,
                "hasListenUrl": bool(call.listen_url),
                "hasTranscript": bool(call.final_transcript),
                "hasLiveTranscript": True, # Updated
                "hasRecording": bool(call.recording_url),
            }
        })

    return {
        "ok": True,
        "type": "transcript",
        "call_id": call.id,
        "updated": is_update,
        "status_event_id": status_event.id,
    }



# Handler for end-of-call report messages
"""
Mark status as completed (if not already)

Set ended_at
Store final_transcript
Store recording_url
Store summary JSON (raw or pre-structured)
Broadcast a call-upsert that for ended calls will drive the UI to show:
Call Recording
View Transcript
"""
async def _handle_end_of_call_report(
    client_id: str,
    message: dict,
    full_payload: dict,
    session: Session,
):
    call_data = message.get("call", {}) or {}
    call_id = call_data.get("id")
    if not call_id:
        print("[VAPI][end-of-call-report] Missing call.id, ignoring.")
        return {"ok": False, "error": "missing call.id"}

    customer = message.get("customer", {}) or {}
    phone_number = customer.get("number")
    listen_url = call_data.get("listenUrl") or call_data.get("listen_url")
    control_url = call_data.get("controlUrl") or call_data.get("control_url")

    artifact = message.get("artifact") or {}
    analysis = message.get("analysis") or {}

    # Final transcript
    final_transcript = (
        message.get("transcript") 
        or artifact.get("transcript")
    )

    # Recording
    original_recording_url = (
        message.get("recordingUrl")
        or artifact.get("recordingUrl")
    )
    recording_url = None

    if original_recording_url:
        try:
            # Download and save securely
            filename = f"{call_id}.mp3"
            filepath = os.path.join("recordings", filename)
            
            async with httpx.AsyncClient() as http_client:
                resp = await http_client.get(original_recording_url)
                if resp.status_code == 200:
                    with open(filepath, "wb") as f:
                        f.write(resp.content)
                    recording_url = f"/api/recordings/{filename}"
                    print(f"[end-of-call] Downloaded recording to {filepath}")
                else:
                    print(f"[end-of-call] Failed to download recording: {resp.status_code}")
                    # recording_url remains None
        except Exception as e:
            print(f"[end-of-call] Error downloading recording: {e}")
            # recording_url remains None

    # Summary: only the text summary
    summary_text = (
        message.get("summary")
        or analysis.get("summary")
    )
    summary = {
        "summary": summary_text
    }
    
    # Cost & Dates
    cost = message.get("cost")
    started_at_str = message.get("startedAt")
    ended_at_str = message.get("endedAt")




    call, is_update = _get_or_create_call(
        session,
        client_id,
        call_id,
        phone_number=phone_number,
        listen_url=listen_url,
        control_url=control_url,
    )

    # Ended status
    call.status = "ended"
    now = datetime.utcnow()
    
    # If Vapi provided explicit timestamps, parse them
    # Format: 2025-12-12T07:03:19.477Z
    # Python 3.7+ fromisoformat supports YYYY-MM-DDTHH:MM:SS.mmmmmm but 'Z' can be tricky on older python versions without replacement.
    # We'll replace Z with +00:00 just in case.
    if started_at_str:
        try:
            call.started_at = datetime.fromisoformat(started_at_str.replace("Z", "+00:00"))
        except:
            pass
            
    if ended_at_str:
        try:
            call.ended_at = datetime.fromisoformat(ended_at_str.replace("Z", "+00:00"))
        except:
            pass
            
    # Fallback if parsing failed or not provided
    call.ended_at = call.ended_at or now

    if cost is not None:
        call.cost = cost

    if final_transcript:
        call.final_transcript = final_transcript.strip()

    if recording_url:
        call.recording_url = recording_url

    if summary is not None:
        call.summary = summary

    call.updated_at = now

    # Log event
    status_event = CallStatusEvent(
        call_id=call.id,
        client_id=client_id,
        status="end-of-call-report",
        payload=full_payload,
    )
    session.add(status_event)
    session.commit()
    session.refresh(call)
    session.refresh(status_event)

    # Broadcast final snapshot for UI
    await manager.broadcast_dashboard({
        "type": "call-upsert",
        "clientId": client_id,
        "call": {
            "id": call.id,
            "status": call.status,
            "phoneNumber": call.phone_number,
            "startedAt": call.started_at.isoformat() if call.started_at else None,
            "endedAt": call.ended_at.isoformat() if call.ended_at else None,
            "hasListenUrl": bool(call.listen_url),

            # NEW: transcript + recording fields
            "finalTranscript": call.final_transcript,
            "liveTranscript": call.live_transcript,
            "recordingUrl": call.recording_url,

            # convenience flags
            "hasTranscript": bool(call.final_transcript),
            "hasLiveTranscript": bool(call.live_transcript),
            "hasRecording": bool(call.recording_url),
        }
    })


    return {
        "ok": True,
        "type": "end-of-call-report",
        "call_id": call.id,
        "updated": is_update,
        "status_event_id": status_event.id,
    }


# Handler for generic/unknown messages
async def _handle_generic_event(
    client_id: str,
    message: dict,
    full_payload: dict,
    session: Session,
):
    call_data = message.get("call", {})
    call_id = call_data.get("id")
    if not call_id:
        print("[VAPI][generic] Missing call.id. Just logging payload.")
        return {"ok": False, "error": "missing call.id"}

    phone_number = call_data.get("phoneNumber") or call_data.get("from")

    call, is_update = _get_or_create_call(
        session,
        client_id,
        call_id,
        phone_number=phone_number,
    )

    status = message.get("status") or (message.get("type") or "generic")

    status_event = CallStatusEvent(
        call_id=call.id,
        client_id=client_id,
        status=status,
        payload=full_payload,
    )
    session.add(status_event)
    session.commit()
    session.refresh(call)
    session.refresh(status_event)

    # We don't broadcast anything special for generics right now
    return {
        "ok": True,
        "type": "generic",
        "call_id": call.id,
        "updated": is_update,
        "status_event_id": status_event.id,
    }
