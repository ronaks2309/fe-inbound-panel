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

class UserContext(BaseModel):
    id: str
    client_id: str
    role: str
    username: Optional[str] = None
    display_name: Optional[str]

    @property
    def is_admin(self) -> bool:
        return self.role == "admin"

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

    # 1. Verify JWT with Supabase Auth
    try:
        # get_user validates the token signature and expiration with the auth server
        user_response = supabase.auth.get_user(token)
        user = user_response.user
        if not user:
            raise ValueError("No user found")
    except Exception as e:
        print(f"Auth error: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # 2. Strict DB Check: Get Profile
    # We use the DB session to be sure (bypassing potentially stale JWT claims if we used them)
    profile = session.get(Profile, user.id)

    if not profile:
        # Fail closed
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User profile not found. Access denied."
        )

    # 3. Return Context
    return UserContext(
        id=str(profile.id),
        client_id=profile.client_id,
        role=profile.role,
        username=profile.username,
        display_name=profile.display_name
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
