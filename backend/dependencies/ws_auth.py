from fastapi import WebSocket, WebSocketDisconnect, status
from typing import Optional
import os
from database.connection import engine
from sqlmodel import Session
from starlette.concurrency import run_in_threadpool
from .auth_utils import UserContext, authenticate_user

def authenticate_ws_sync(token: str) -> UserContext:
    """Synchronous wrapper to handle session lifecycle for WS auth."""
    with Session(engine) as session:
        return authenticate_user(session, token)

async def get_current_user_ws(
    websocket: WebSocket,
    token: Optional[str] = None
) -> UserContext:
    """
    Validates Supabase JWT from Query Param 'token' (or manual param).
    Used for WebSockets where Headers are not accessible.
    """
    if not token:
        # Try to find in query params manually if not injected
        token = websocket.query_params.get("token")
    
    if not token:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Missing authentication token")
        raise WebSocketDisconnect("Missing auth token")

    try:
        # Run the entire Auth + DB lookup in a threadpool to avoid blocking the async loop
        return await run_in_threadpool(authenticate_ws_sync, token)
    except ValueError as e:
        print(f"WS Auth error: {e}")
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Invalid authentication credentials")
        raise WebSocketDisconnect("Invalid credentials")
