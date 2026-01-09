import os
import sys
from dotenv import load_dotenv
from supabase import create_client, Client

# Load environment variables
load_dotenv()
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '..', '.env'))

SUPABASE_URL = os.getenv("SUPABASE_URL") or os.getenv("VITE_SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("Error: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not found.")
    print("Ensure you have a .env file with Supabase credentials.")
    sys.exit(1)

try:
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
except Exception as e:
    print(f"Error initializing Supabase client: {e}")
    sys.exit(1)

def create_user():
    print("\n--- Create New User (Admin Script) ---")
    
    # 1. User ID (Username)
    user_id = input("Enter User ID (username, e.g. ronaks-demo-client): ").strip()
    if not user_id:
        print("Error: User ID is required.")
        return

    # 2. Password
    password = input("Enter Password: ").strip()
    if len(password) < 6:
        print("Error: Password must be at least 6 characters.")
        return

    # 3. Display Name
    display_name = input("Enter Display Name (e.g. Ronak Patel): ").strip()
    
    # 4. Client ID
    client_id = input("Enter Client ID: ").strip()
    if not client_id:
        print("Error: Client ID is required.")
        return
        
    # 5. User Type
    role = input("Enter User Type (admin/user): ").strip().lower()
    if role not in ['admin', 'user']:
        print("Error: Role must be 'admin' or 'user'.")
        return

    # Construct fake email for Supabase Auth
    email = f"{user_id}@fe-inbound.internal"
    
    print(f"\nCreating user...")
    print(f"  Username: {user_id}")
    print(f"  Email:    {email}")
    print(f"  Role:     {role}")
    print(f"  Client:   {client_id}")
    
    try:
        # 1. Create user in Supabase Auth
        print("  - Creating in Auth...")
        response = supabase.auth.admin.create_user({
            "email": email,
            "password": password,
            "email_confirm": True,
            "user_metadata": {
                # We still keep metadata for convenience/debugging, 
                # but DB profile is the authority.
                "username": user_id,
                "display_name": display_name,
                "client_id": client_id,
                "role": role
            }
        })
        
        user_uuid = response.user.id
        print(f"    -> Auth Success. UUID: {user_uuid}")

        # 2. Create Profile in Postgres
        print("  - Creating Profile row...")
        profile_data = {
            "id": user_uuid,
            "client_id": client_id,
            "role": role,
            "username": user_id,
            "display_name": display_name
        }
        
        # Upsert into profiles table
        supabase.table("profiles").upsert(profile_data).execute()
        print("    -> Profile Success.")
        
        print("\nSUCCESS! User fully created.")
        print(f"User UUID: {user_uuid}")
        
    except Exception as e:
        print(f"\nFAILED to create user: {e}")
        # Note: If auth succeeded but profile failed, we have a zombie user.
        # In a real script we might try to delete the auth user or warn.
        print("WARNING: If 'Auth Success' happened but 'Profile Success' failed, you may need to delete the user manually.")

if __name__ == "__main__":
    create_user()
