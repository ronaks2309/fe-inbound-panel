import os
import logging
from dotenv import load_dotenv
from supabase import create_client, Client, ClientOptions

# Load environment variables
load_dotenv()
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '..', '.env'))

SUPABASE_URL = os.getenv("SUPABASE_URL") or os.getenv("VITE_SUPABASE_URL")
# Support various naming conventions
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("supabase_service_role_key") or os.getenv("SUPABASE_KEY")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY") or os.getenv("VITE_SUPABASE_ANON_KEY") or os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY")

supabase: Client | None = None

if SUPABASE_URL and SUPABASE_KEY:
    try:
        supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
        # Patch storage_url to include trailing slash if missing
        if supabase.storage_url:
             s_url = str(supabase.storage_url)
             if not s_url.endswith("/"):
                 supabase.storage_url = s_url + "/"
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


def create_scoped_client(token: str) -> Client | None:
    """
    Creates a new Supabase client with the given Auth token (for RLS).
    """
    if not token or not SUPABASE_ANON_KEY or not SUPABASE_URL:
        return None
        
    try:
        client = create_client(
            SUPABASE_URL, 
            SUPABASE_ANON_KEY, 
            options=ClientOptions(headers={"Authorization": f"Bearer {token}"})
        )
        # Patch storage_url if needed
        if client.storage_url:
            s_url = str(client.storage_url)
            if not s_url.endswith("/"):
                client.storage_url = s_url + "/"
        return client
    except Exception as e:
        logging.warning(f"Failed to create scoped Supabase client: {e}")
        return None


def create_signed_url(file_path: str, bucket_name: str = "recordings", expiry: int = 3600, token: str = None, client: Client = None) -> str | None:
    """
    Generates a signed URL for a file in a Supabase storage bucket.
    If 'client' is provided, it uses it.
    If 'token' is provided (and no client), creates a scoped client to enforce RLS.
    """
    if not file_path:
        return None
        
    # If it's already a full URL, return as is
    if file_path.startswith("http"):
        return file_path

    # Determine which client to use
    if client:
        # Use the provided client (already scoped or system)
        pass
    elif token and SUPABASE_ANON_KEY and SUPABASE_URL:
        # Create a lightweight client for this request to verify RLS
        scoped = create_scoped_client(token)
        if scoped:
            client = scoped
    
    # Fallback to system client if nothing else
    if not client:
        client = supabase


    if not client:
        logging.warning("Supabase client not initialized, cannot sign URL.")
        return None
        
    try:
        res = client.storage.from_(bucket_name).create_signed_url(file_path, expiry)
        
        if isinstance(res, dict):
             return res.get("signedURL")
        elif isinstance(res, str):
             return res
        return None
    except Exception as e:
        # If this was an RLS denial, it will show here
        logging.error(f"Error signing URL for {file_path}: {e}")
        return None
