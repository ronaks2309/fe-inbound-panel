import os
import sys
from dotenv import load_dotenv
from sqlalchemy import text
from supabase import create_client, Client

# Add backend directory to path to allow imports
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from database.connection import engine

# Load env vars
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '..', '.env'))

SUPABASE_URL = os.getenv("SUPABASE_URL") or os.getenv("VITE_SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("Error: Supabase credentials not found in environment.")
    sys.exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def add_username_column():
    print("--- Adding 'username' column to 'profiles' table ---")
    
    with engine.connect() as conn:
        try:
            # Check if column exists (Postgres specific)
            # But "ADD COLUMN IF NOT EXISTS" is easier
            print("Executing ALTER TABLE...")
            conn.execute(text("ALTER TABLE profiles ADD COLUMN IF NOT EXISTS username TEXT;"))
            conn.commit()
            print("Column added (or already existed).")
        except Exception as e:
            print(f"Error adding column: {e}")
            return False
            
    return True

def backfill_usernames():
    print("\n--- Backfilling usernames from Auth Metadata ---")
    
    try:
        # 1. Fetch all users from Auth
        # Note: list_users returns a UserList object, usually paginated. 
        # For this script we'll assume a reasonable number or just grab first page. 
        # If userbase is huge, we'd need loop.
        page = 1
        per_page = 100
        
        # Depending on supabase-py version, list_users might work differently.
        # It seems list_users() returns a list directly in this version
        users = supabase.auth.admin.list_users() 
        
        # If it's a UserResponse (older) it has .users, but error says it is a list
        # We will handle both cases broadly or just trust the error
        if hasattr(users, 'users'):
            users = users.users
        
        print(f"Found {len(users)} users in Auth.")
        
        count = 0
        for user in users:
            uid = user.id
            username = user.user_metadata.get("username")
            
            if not username:
                print(f"Skipping user {uid}: No 'username' in metadata.")
                continue
                
            # Update profile
            # We can use supabase client or sql engine. unique "upsert" or "update"
            # Since profile should exist, update is safer.
            
            print(f"Updating profile for {username} ({uid})...")
            
            # Using supabase-py to update
            res = supabase.table("profiles").update({"username": username}).eq("id", uid).execute()
            
            # Check if update happened
            if hasattr(res, 'data') and len(res.data) > 0:
                count += 1
            else:
                print(f"  -> Warning: No profile found for {username} or update failed.")

        print(f"\nBackfill complete. Updated {count} profiles.")
        
    except Exception as e:
        print(f"Error during backfill: {e}")

if __name__ == "__main__":
    if add_username_column():
        backfill_usernames()
