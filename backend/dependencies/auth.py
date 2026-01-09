import os
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from sqlmodel import Session, select
from typing import Optional

from services.supabase_service import supabase
from database.connection import get_session, engine
from database.models import Profile
from sqlalchemy import text

# ... (rest of imports)



security = HTTPBearer()

from .auth_utils import UserContext, authenticate_user

def get_current_user(
    creds: HTTPAuthorizationCredentials = Depends(security),
    session: Session = Depends(get_session)
) -> UserContext:
    token = creds.credentials
    if not supabase:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Auth service unavailable"
        )

    try:
        return authenticate_user(session, token)
    except ValueError as e:
        # Map internal errors to HTTP exceptions
        if "profile not found" in str(e).lower():
             raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=str(e)
            )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e),
            headers={"WWW-Authenticate": "Bearer"},
        )

def get_secure_session(current_user: UserContext = Depends(get_current_user)):
    """
    Returns a Database Session that is RLS-protected.
    It 'impersonates' the current user so that the Database policies
    automatically filter access to rows.
    """
    with Session(engine) as session:
        # 1. "Put on the Mask" - Set the Claims for RLS
        # We use a transaction-local setting ("SET LOCAL") so it doesn't leak.
        # Postgres RLS policies use `auth.uid()` which reads `request.jwt.claim.sub`.
        
        session.exec(text(f"SET LOCAL request.jwt.claim.sub = '{current_user.id}'"))
        session.exec(text("SET LOCAL role = 'authenticated'"))
        
        # 2. Hand over the session
        yield session

def verify_webhook_token(
    creds: HTTPAuthorizationCredentials = Depends(security)
) -> str:
    """
    Simple Bearer token check for Webhooks.
    """
    token = creds.credentials
    secret = os.getenv("WEBHOOK_SECRET")
    
    if not secret:
        # If no secret is configured, lock it down by default or log warning?
        # For security, let's deny access if not configured.
        print("Warning: WEBHOOK_SECRET not configured in .env")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE, 
            detail="Webhook auth not configured"
        )

    if token != secret:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid webhook token"
        )
    return token
