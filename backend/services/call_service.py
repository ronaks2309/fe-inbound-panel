
from datetime import datetime, timezone
from typing import Optional
import os
import httpx
from sqlmodel import Session
from database.models import Call, CallStatusEvent
from services.websocket_manager import manager
from services.supabase_service import get_user_by_id, supabase


def to_iso_utc(dt: Optional[datetime]) -> Optional[str]:
    """Helper to convert naive datetime to UTC ISO string with Z suffix logic (or aware)."""
    if not dt:
        return None
    # If naive, assume UTC
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.isoformat()

class CallService:
    """
    Service class to handle business logic for Vprod calls.
    Encapsulates database operations and WebSocket broadcasting.
    """

    @staticmethod
    def get_or_create_call(
        session: Session,
        client_id: str,
        call_id: str,
    ) -> tuple[Call, bool]:
        """
        Retrieves an existing call or creates a new one.

        Args:
            session (Session): Database session.
            client_id (str): The client identifier.
            call_id (str): The unique call identifier.

        Returns:
            tuple[Call, bool]: A tuple containing the Call object and a boolean 
            indicating if it was created (True if newly created, False if existing).
        """
        now = datetime.utcnow()
        existing = session.get(Call, call_id)
        
        created = False
        if existing:
            call = existing
        else:
            call = Call(
                id=call_id,
                client_id=client_id,
            )
            session.add(call)
            created = True
            
        call.updated_at = now
        return call, created

    @staticmethod
    async def handle_status_update(
        client_id: str,
        message: dict,
        full_payload: dict,
        session: Session,
        user_id: Optional[str] = None,
    ):
        """
        Handles 'status-update' messages from Vprod.
        Updates call status and broadcasts changes to the dashboard.
        """
        status = message.get("status")
        call_data = message.get("call", {})
        call_id = call_data.get("id")
        created_at = call_data.get("createdAt")

        if not call_id:
            print("[CallMark AI][status-update] Missing call.id, ignoring.")
            return {"ok": False, "error": "missing call.id"}

        # Extract phone number from various possible fields
        customer = message.get("customer", {}) or {}
        phone_number = customer.get("number")

        # Extract URLs
        monitor = call_data.get("monitor") or {}
        listen_url = monitor.get("listenUrl")
        control_url = monitor.get("controlUrl")

        # Get or create call (no field updates)
        call, created = CallService.get_or_create_call(
            session,
            client_id,
            call_id,
        )

        # Update fields directly
        if phone_number:
            call.phone_number = phone_number
        if listen_url:
            call.listen_url = listen_url
        if control_url:
            call.control_url = control_url
        if status:
            call.status = status
        
        # Capture startedAt if present
        started_at_str = call_data.get("startedAt")
        if started_at_str:
            try:
                # Vapi sends ISO format, usually with Z. handling replace just in case.
                call.started_at = datetime.fromisoformat(started_at_str.replace("Z", "+00:00"))
            except Exception as e:
                print(f"Error parsing startedAt: {e}")

        # Update user_id if provided
        if user_id:
            call.user_id = user_id
            
            # If username is missing, fetch it
            if not call.username:
                try:
                    user = get_user_by_id(user_id)
                    if user:
                        # Try username, then display_name, then email
                        username = user.user_metadata.get("username")
                        if not username:
                            username = user.user_metadata.get("display_name")
                        if not username:
                            username = user.email
                        
                        if username:
                            call.username = username
                except Exception as e:
                    print(f"Failed to resolve username for {user_id}: {e}")

        now = datetime.utcnow()
        # Mark as ended if status indicates completion
        #if status and status.lower() in {"ended"}:
        #    call.ended_at = call.ended_at or now

        call.updated_at = now

        # Create status event record
        status_event = CallStatusEvent(
            call_id=call.id,
            client_id=client_id,
            status="status-update: " + (status or "unknown"),
            payload=full_payload,
            user_id=user_id,
        )
        session.add(status_event)
        session.commit()
        session.refresh(call)
        session.refresh(status_event)

        # Broadcast update to UI
        await manager.broadcast_dashboard({
            "type": "call-upsert",
            "clientId": client_id,
            "call": {
                "id": call.id,
                "status": call.status,
                "phoneNumber": call.phone_number,
                "startedAt": to_iso_utc(call.started_at) or to_iso_utc(call.created_at),
                "endedAt": to_iso_utc(call.ended_at),
                "hasListenUrl": bool(call.listen_url),
                "hasTranscript": bool(call.final_transcript),
                "hasFinalTranscript": bool(call.final_transcript),
                "hasLiveTranscript": bool(call.live_transcript),
                "hasRecording": bool(call.recording_url),
                "username": call.username,
                "duration": call.duration,
                "sentiment": call.sentiment,
                "disposition": call.disposition,
            }
        }, user_id=user_id)

        return {
            "ok": True,
            "type": "status-update",
            "call_id": call.id,
            "created": created,
            "status_event_id": status_event.id,
        }


    @staticmethod
    async def handle_transcript_update(
        client_id: str,
        message: dict,
        full_payload: dict,
        session: Session,
        user_id: Optional[str] = None,
    ):
        """
        Handles 'transcript' messages (live transcript).
        Updates `call.live_transcript` and broadcasts real-time updates.
        """
    
        call_data = message.get("call", {})
        call_id = call_data.get("id")
        if not call_id:
            print("[CallMark AI][transcript] Missing call.id, ignoring.")
            return {"ok": False, "error": "missing call.id"}

        raw_text = (message.get("transcript"))

        role = (message.get("role") or "").lower()
        prefix = ""
        if role == "assistant":
            prefix = "AI: "
        elif role == "user":
            prefix = "User: "

        # Get or create call (no field updates)
        call, created = CallService.get_or_create_call(
            session,
            client_id,
            call_id
        )

        # Append logic
        transcript_text = None
        if raw_text:
            if call.live_transcript:
                lines = call.live_transcript.splitlines()
                last_line = lines[-1] if lines else ""
                last_role = None
                if last_line.startswith("AI: "):
                    last_role = "assistant"
                elif last_line.startswith("User: "):
                    last_role = "user"

                if last_role == role:
                    # Append to same line
                    append_chunk = raw_text
                    call.live_transcript = call.live_transcript + append_chunk
                    transcript_text = append_chunk
                else:
                    # New line with prefix
                    append_chunk = (prefix + raw_text).strip()
                    call.live_transcript = call.live_transcript + "\n" + append_chunk
                    transcript_text = append_chunk
            else:
                # First line
                append_chunk = (prefix + raw_text).strip()
                call.live_transcript = append_chunk
                transcript_text = append_chunk

        #call.updated_at = datetime.utcnow()
        
        if user_id:
            call.user_id = user_id

        status_event = CallStatusEvent(
            call_id=call.id,
            client_id=client_id,
            status="transcript-update",
            payload=full_payload,
            user_id=user_id,
        )
        session.add(status_event)
        session.commit()
        session.refresh(call)
        session.refresh(status_event)

        # WebSocket broadcast for transcript
        await manager.broadcast_transcript({
            "type": "transcript-update",
            "clientId": client_id,
            "callId": call.id,
            "append": transcript_text,
            "fullTranscript": call.live_transcript,
        }, call_id=call.id)
        
        # If first chunk, notify dashboard to show "View Transcript"
        if transcript_text and call.live_transcript and len(call.live_transcript) == len(transcript_text):
             await manager.broadcast_dashboard({
                "type": "call-upsert",
                "clientId": client_id,
                "call": {
                    "id": call.id,
                    "status": call.status,
                    "phoneNumber": call.phone_number,
                    "startedAt": to_iso_utc(call.started_at) or to_iso_utc(call.created_at),
                    "created_at": to_iso_utc(call.created_at),
                    "endedAt": to_iso_utc(call.ended_at),
                    "hasListenUrl": bool(call.listen_url),
                    "hasTranscript": bool(call.final_transcript),
                    "hasFinalTranscript": bool(call.final_transcript),
                    "hasLiveTranscript": True,
                    "hasRecording": bool(call.recording_url),
                    "username": call.username,
                    "duration": call.duration,
                    "sentiment": call.sentiment,
                    "disposition": call.disposition,
                }
            }, user_id=user_id)

        return {
            "ok": True,
            "type": "transcript",
            "call_id": call.id,
            "created": created,
            "status_event_id": status_event.id,
        }

    @staticmethod
    async def handle_end_of_call_report(
        client_id: str,
        message: dict,
        full_payload: dict,
        session: Session,
        user_id: Optional[str] = None,
    ):
        """
        Handles 'end-of-call-report'.
        Finalizes call data, downloads recording, and saves final transcript.
        """
        call_data = message.get("call", {}) or {}
        call_id = call_data.get("id")
        if not call_id:
            print("[CallMark AI][end-of-call-report] Missing call.id, ignoring.")
            return {"ok": False, "error": "missing call.id"}

        # Extract call info
        customer = message.get("customer", {}) or {}
        phone_number = customer.get("number")

        # Extract URLs
        monitor = call_data.get("monitor") or {}
        listen_url = monitor.get("listenUrl")
        control_url = monitor.get("controlUrl")

        # Get or create call (no field updates)
        call, created = CallService.get_or_create_call(
            session,
            client_id,
            call_id,
        )

        # Update fields directly
        if phone_number:
            call.phone_number = phone_number
        if listen_url:
            call.listen_url = listen_url
        if control_url:
            call.control_url = control_url

        # Update status and other end-of-call fields
        call.status = "ended"
        
        # Extract additional end-of-call data
        artifact = message.get("artifact") or {}
        analysis = message.get("analysis") or {}
        final_transcript = message.get("transcript") or artifact.get("transcript")
        
        # Download Recording
        original_recording_url = message.get("recordingUrl") or artifact.get("recordingUrl")
        recording_url = None

        if original_recording_url:
            try:
                filename = f"{call_id}.mp3"
                
                async with httpx.AsyncClient() as http_client:
                    resp = await http_client.get(original_recording_url)
                    if resp.status_code == 200:
                        file_bytes = resp.content
                        
                        if supabase:
                            try:
                                bucket_name = os.environ.get("SUPABASE_BUCKET", "recordings")
                                
                                # Upload to Supabase
                                supabase.storage.from_(bucket_name).upload(
                                    path=filename,
                                    file=file_bytes,
                                    file_options={"content-type": "audio/mpeg", "upsert": "true"}
                                )
                                # Store FILENAME only (to be signed on retrieval)
                                recording_url = filename 
                                print(f"[end-of-call] Uploaded recording to Supabase: {filename}")
                            except Exception as sup_err:
                                print(f"[end-of-call] Supabase upload error: {sup_err}")
                        else:
                            print("[end-of-call] Supabase credentials missing. Skipping upload.")
                    else:
                        print(f"[end-of-call] Failed to download recording: {resp.status_code}")
            except Exception as e:
                print(f"[end-of-call] Error processing recording: {e}")

        summary_text = message.get("summary") or analysis.get("summary")
        summary = {"summary": summary_text}
        
        cost = message.get("cost")
        started_at_str = message.get("startedAt")
        ended_at_str = message.get("endedAt")
        
        now = datetime.utcnow()

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
        
        call.ended_at = call.ended_at or now

        # Extract sentiment and disposition from structuredOutputs (Primary)
        # Logic: message -> artifact -> structuredOutputs
        # We ignore 'analysis' fields as per user request.
        sentiment = None
        disposition = None
        
        artifact = message.get("artifact") or {}
        structured_outputs = artifact.get("structuredOutputs") or {}
        
        if structured_outputs:
            print(f"[CallService] Found structuredOutputs: {structured_outputs.keys()}")
            
            # structuredOutputs is a dict of UUID -> Object
            for output in structured_outputs.values():
                if not isinstance(output, dict):
                    continue
                    
                name = (output.get("name") or "").lower().strip()
                result = output.get("result")
                
                # Loose matching for robustness
                if name == "call disposition" or "disposition" in name:
                    disposition = result
                elif name == "customer sentiment" or "sentiment" in name:
                    sentiment = result
        else:
            print(f"[CallService] No structuredOutputs found in artifact. Artifact keys: {artifact.keys()}")

        if sentiment:
            call.sentiment = sentiment
        if disposition:
            call.disposition = disposition


        if cost is not None:
            call.cost = cost
        if final_transcript:
            call.final_transcript = final_transcript.strip()
        if recording_url:
            call.recording_url = recording_url
        if summary is not None:
            call.summary = summary
            
        # Duration from payload (if available)
        duration_seconds = message.get("durationSeconds") or analysis.get("durationSeconds")
        if duration_seconds is not None:
             call.duration = int(duration_seconds)
        # Fallback: calc from start/end
        elif call.started_at and call.ended_at:
             delta = call.ended_at - call.started_at
             call.duration = int(delta.total_seconds())

        if user_id:
            call.user_id = user_id
            # Also populate username if missing (late binding)
            if not call.username:
                try:
                    user = get_user_by_id(user_id)
                    if user:
                         # Try username, then display_name, then email
                        username = user.user_metadata.get("username")
                        if not username:
                            username = user.user_metadata.get("display_name")
                        if not username:
                            username = user.email
                        
                        if username:
                            call.username = username
                except:
                    pass

        call.updated_at = now

        status_event = CallStatusEvent(
            call_id=call.id,
            client_id=client_id,
            status="end-of-call-report",
            payload=full_payload,
            user_id=user_id,
        )
        session.add(call) # Ensure call updates are tracked
        session.add(status_event)
        session.commit()
        session.refresh(call)
        session.refresh(status_event)

        await manager.broadcast_dashboard({
            "type": "call-upsert",
            "clientId": client_id,
            "call": {
                "id": call.id,
                "status": call.status,
                "phoneNumber": call.phone_number,
                "startedAt": to_iso_utc(call.started_at),
                "endedAt": to_iso_utc(call.ended_at),
                "hasListenUrl": bool(call.listen_url),
                "finalTranscript": call.final_transcript,
                "liveTranscript": call.live_transcript,
                "recordingUrl": call.recording_url,
                "hasTranscript": bool(call.final_transcript),
                "hasFinalTranscript": bool(call.final_transcript),
                "hasLiveTranscript": bool(call.live_transcript),
                "hasRecording": bool(call.recording_url),
                "username": call.username,
                "duration": call.duration,
                "sentiment": call.sentiment,
                "disposition": call.disposition,
            }
        }, user_id=user_id)

        return {
            "ok": True,
            "type": "end-of-call-report",
            "call_id": call.id,
            "created": created,
            "status_event_id": status_event.id,
        }

    @staticmethod
    async def handle_generic_event(
        client_id: str,
        message: dict,
        full_payload: dict,
        session: Session,
        user_id: Optional[str] = None,
    ):
        """
        Handles generic or unknown events.
        Logs the event without broadcasting specific updates.
        """
        call_data = message.get("call", {})
        call_id = call_data.get("id")
        if not call_id:
            print("[CallMark AI][generic] Missing call.id. Just logging payload.")
            return {"ok": False, "error": "missing call.id"}

        # Extract call info from various possible field names
        phone_number = call_data.get("phoneNumber") or call_data.get("from")
        listen_url = call_data.get("listenUrl") or call_data.get("listen_url")
        control_url = call_data.get("controlUrl") or call_data.get("control_url")

        # Get or create call (no field updates)
        call, created = CallService.get_or_create_call(
            session,
            client_id,
            call_id,
        )

        # Update fields directly
        if phone_number:
            call.phone_number = phone_number
        if listen_url:
            call.listen_url = listen_url
        if control_url:
            call.control_url = control_url

        status = message.get("status") or (message.get("type") or "generic")

        status_event = CallStatusEvent(
            call_id=call.id,
            client_id=client_id,
            status=status,
            payload=full_payload,
            user_id=user_id,
        )
        session.add(status_event)
        session.commit()
        session.refresh(call)
        session.refresh(status_event)

        return {
            "ok": True,
            "type": "generic",
            "call_id": call.id,
            "created": created,
            "status_event_id": status_event.id,
        }
