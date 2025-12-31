from fastapi import WebSocket, WebSocketDisconnect, HTTPException, status
from typing import Optional
from supabase import create_client, Client
import os
from .auth import UserContext
from database.models import Profile
from database.connection import get_session
from sqlmodel import Session, select

SUPABASE_URL = os.getenv("SUPABASE_URL") or os.getenv("VITE_SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if SUPABASE_URL and SUPABASE_KEY:
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
else:
    supabase = None

async def get_current_user_ws(
    websocket: WebSocket,
    token: Optional[str] = None
) -> UserContext:
    """
    Validates Supabase JWT from Query Param 'token'.
    Used for WebSockets where Headers are not accessible.
    """
    if not token:
        # Try to find in query params manually if not injected
        token = websocket.query_params.get("token")
    
    if not token:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Missing authentication token")
        raise WebSocketDisconnect("Missing auth token")

    if not supabase:
         # Fail open or closed? Closed.
         await websocket.close(code=status.WS_1011_INTERNAL_ERROR, reason="Auth service unavailable")
         raise WebSocketDisconnect("Auth service unavailable")

    try:
        user_response = supabase.auth.get_user(token)
        user = user_response.user
        if not user:
            raise ValueError("No user found")
    except Exception as e:
        print(f"WS Auth error: {e}")
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Invalid authentication credentials")
        raise WebSocketDisconnect("Invalid credentials")

    # DB Lookup
    # We need a session. We can construct one or use a context manager.
    # Since dependency injection for Session works in WS, we should probably rely on the caller to pass session
    # OR we can create a new session here. 
    # But ideally this function returns UserContext.
    # We'll instantiate a session briefly.
    from database.connection import engine
    with Session(engine) as session:
        profile = session.get(Profile, user.id)
        if not profile:
             await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="User profile not found")
             raise WebSocketDisconnect("Profile not found")
        
        return UserContext(
            id=str(profile.id),
            client_id=profile.client_id,
            role=profile.role,
            display_name=profile.display_name
        )
