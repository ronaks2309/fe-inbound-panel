import os
import logging
from dotenv import load_dotenv
from supabase import create_client, Client

# Load environment variables
load_dotenv()
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '..', '.env'))

SUPABASE_URL = os.getenv("SUPABASE_URL") or os.getenv("VITE_SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

supabase: Client | None = None

if SUPABASE_URL and SUPABASE_KEY:
    try:
        supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    except Exception as e:
        print(f"Error initializing Supabase client: {e}")

def get_user_by_id(user_id: str):
    """
    Fetches user details from Supabase Auth by ID.
    Returns the user object or None found/error.
    """
    if not supabase:
        print("Supabase client not initialized.")
        return None

    try:
        # admin.get_user_by_id returns a UserResponse object
        response = supabase.auth.admin.get_user_by_id(user_id)
        return response.user
    except Exception as e:
        print(f"Error fetching user {user_id}: {e}")
        return None
