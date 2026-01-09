from services.supabase_service import supabase
from fastapi import HTTPException
from typing import Optional
from pydantic import BaseModel
from database.models import Profile

class UserContext(BaseModel):
    id: str
    client_id: str
    role: str
    username: Optional[str] = None
    display_name: Optional[str]
    token: Optional[str] = None

    @property
    def is_admin(self) -> bool:
        return self.role == "admin"

def validate_supabase_token(token: str):
    """
    Validates a Supabase JWT token and returns the user object.
    Raises ValueError if invalid.
    """
    if not supabase:
        raise ValueError("Auth service unavailable")

    try:
        user_response = supabase.auth.get_user(token)
        user = user_response.user
        if not user:
            raise ValueError("No user found")
        return user
    except Exception as e:
        print(f"Auth validation error: {e}")
        raise ValueError("Invalid authentication credentials")

def authenticate_user(session, token: str) -> UserContext:
    """
    Core authentication flow: Token Validation -> DB Profile Lookup -> UserContext.
    Synchronous function. Callers should wrap in threadpool if needed.
    """
    # 1. Validate Token
    user = validate_supabase_token(token)

    # 2. Lookup Profile
    profile = session.get(Profile, user.id)
    if not profile:
        raise ValueError("User profile not found")

    return UserContext(
        id=str(profile.id),
        client_id=profile.client_id,
        role=profile.role,
        username=profile.username,
        display_name=profile.display_name,
        token=token
    )
