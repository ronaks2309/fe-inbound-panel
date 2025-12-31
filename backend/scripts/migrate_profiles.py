import os
import asyncio
from supabase import create_client, Client
from dotenv import load_dotenv

# Load env vars
load_dotenv()
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '..', '.env'))

SUPABASE_URL = os.getenv("SUPABASE_URL") or os.getenv("VITE_SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") # Must use service role for admin tasks

if not SUPABASE_URL or not SUPABASE_KEY:
    print("Error: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
    exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def run_migration():
    print("Running SQL migration...")
    try:
        with open("backend/database/migrations/profiles_table.sql", "r") as f:
            sql = f.read()
            # Split by statement if needed, or run as one block if pg-driver supports it.
            # Supabase-py doesn't expose raw SQL exec easily via rest normally, 
            # BUT we can use the 'rpc' or just try to use a postgres driver.
            # Since we have alchemy in the project, let's use that for SQL execution.
            pass
    except Exception as e:
        print(f"Error reading SQL: {e}")
        return

    # Using sqlalchemy for DDL
    from sqlalchemy import create_engine, text
    DATABASE_URL = os.getenv("DATABASE_URL")
    if not DATABASE_URL:
        print("Error: DATABASE_URL not set")
        return
        
    engine = create_engine(DATABASE_URL)
    with engine.connect() as conn:
        # Split statements manually since some drivers don't like multiple statements
        statements = sql.split(';')
        for stmt in statements:
            if stmt.strip():
                try:
                    conn.execute(text(stmt))
                    print(f"Executed: {stmt[:50]}...")
                except Exception as e:
                    # Ignore "relation already exists" etc if idempotent
                    print(f"Notice during SQL exec: {e}")
        conn.commit()
    print("Migration finished.")

def backfill_profiles():
    print("Backfilling profiles from Auth Users...")
    try:
        # Fetch all users (pagination might be needed if > 50)
        # supabase-py admin.list_users defaults to page 1, per_page 50
        page = 1
        while True:
            response = supabase.auth.admin.list_users(page=page, per_page=50)
            # Check what we got. If it's a list, use it. If it behaves like an object with .users, use that.
            if isinstance(response, list):
                users = response
            elif hasattr(response, "users"):
                users = response.users
            else:
                print(f"Unknown response type: {type(response)}")
                break
                
            if not users:
                break
            
            for user in users:
                uid = user.id
                meta = user.user_metadata or {}
                
                # Extract fields
                # We expect 'client_id' or 'tenant_id' in meta. Prioritize client_id as we are moving to that.
                client_id = meta.get("client_id") or meta.get("tenant_id")
                
                if not client_id:
                    print(f"Skipping user {uid} (no email specified?): No client_id found in metadata.")
                    continue
                    
                role = meta.get("role", "user")
                display_name = meta.get("display_name") or meta.get("name") or user.email
                
                # Insert into profiles
                # We use supabase.table because we can (it supports upsert)
                data = {
                    "id": uid,
                    "client_id": client_id,
                    "role": role,
                    "display_name": display_name
                }
                
                try:
                    # Upsert
                    res = supabase.table("profiles").upsert(data).execute()
                    print(f"Upserted profile for {uid} ({display_name})")
                except Exception as e:
                    print(f"Error upserting profile for {uid}: {e}")

            page += 1
            
    except Exception as e:
        print(f"Error fetching users: {e}")

if __name__ == "__main__":
    run_migration()
    backfill_profiles()
