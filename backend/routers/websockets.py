
import asyncio
import os
import websockets
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from sqlmodel import Session
from database.connection import get_session, engine
from database.models import Call
from services.websocket_manager import manager
from dependencies.ws_auth import get_current_user_ws, UserContext

router = APIRouter()

@router.websocket("/ws/fake-audio")
async def fake_audio_websocket(ws: WebSocket):
    """
    Simple local WS that sends fake binary 'audio' chunks so the frontend
    ListenModal can be tested without a real listenUrl.
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


@router.websocket("/ws/listen/{call_id}")
async def listen_proxy_websocket(
    websocket: WebSocket, 
    call_id: str, 
    session: Session = Depends(get_session),
    current_user: UserContext = Depends(get_current_user_ws)
):
    """
    Proxies audio from an upstream CallMark AI listenUrl to the client.
    Hides the upstream URL from the client.
    Strictly enforces access control.
    """
    await websocket.accept()
    
    # 1. Look up the call
    call = session.get(Call, call_id)
    if not call or not call.listen_url:
        print(f"[listen-proxy] Call {call_id} not found or missing listen_url")
        await websocket.close(code=1000, reason="No listen URL found")
        return

    # 2. Strict Access Control
    # Must belong to client
    if call.client_id != current_user.client_id:
         print(f"[listen-proxy] Access denied: Client {current_user.client_id} -> Call {call.client_id}")
         await websocket.close(code=4003, reason="Access denied") # 4003 isn't standard WS but used for app errors
         return
    
    # If not admin, must be user's call
    if current_user.role != "admin" and call.user_id != current_user.id:
         print(f"[listen-proxy] Access denied: User {current_user.id} -> Call {call.user_id}")
         await websocket.close(code=4003, reason="Access denied")
         return

    target_url = call.listen_url
    print(f"[listen-proxy] Proxying {call_id} -> {target_url}")

    # 2. Connect to upstream vprod-platform
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

            # Run upstream_to_client in parallel.
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


@router.websocket("/ws/dashboard")
async def ws_dashboard(
    ws: WebSocket, 
    # user_id/role/tenant_id params are redundant if we use token, 
    # BUT manager.register_dashboard uses them.
    # We should extract them from current_user.
    current_user: UserContext = Depends(get_current_user_ws)
):
    """
    Main dashboard WebSocket.
    Handles real-time updates for call lists and live transcripts.
    Strictly authenticated via Supabase JWT (Query Param: ?token=...)
    """
    # Use trusted data from UserContext
    user_id = current_user.id
    role = current_user.role
    tenant_id = current_user.client_id
    
    await manager.register_dashboard(ws, user_id=user_id, role=role, tenant_id=tenant_id)
    print(f"Dashboard WS client connected: {user_id} ({role}) @ {tenant_id}")

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
