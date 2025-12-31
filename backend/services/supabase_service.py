import os
import logging
from dotenv import load_dotenv
from supabase import create_client, Client

# Load environment variables
load_dotenv()
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '..', '.env'))

SUPABASE_URL = os.getenv("SUPABASE_URL") or os.getenv("VITE_SUPABASE_URL")
# Support various naming conventions
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("supabase_service_role_key") or os.getenv("SUPABASE_KEY")

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


def create_signed_url(file_path: str, bucket_name: str = "recordings", expiry: int = 3600) -> str | None:
    """
    Generates a signed URL for a file in a Supabase storage bucket.
    Handles 'http' checks and dict/str response types.
    """
    if not file_path:
        return None
        
    # If it's already a full URL, return as is
    if file_path.startswith("http"):
        return file_path

    if not supabase:
        logging.warning("Supabase client not initialized, cannot sign URL.")
        return None
        
    try:
        res = supabase.storage.from_(bucket_name).create_signed_url(file_path, expiry)
        
        if isinstance(res, dict):
             return res.get("signedURL")
        elif isinstance(res, str):
             return res
        return None
    except Exception as e:
        logging.error(f"Error signing URL for {file_path}: {e}")
        return None
