import os
import sys
from dotenv import load_dotenv
from supabase import create_client, Client

# Load environment variables
# Look for .env in current dir, then parent dir
load_dotenv()
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '..', '.env'))

# Try VITE_ prefix as well since it might be a shared env file
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
    print("\n--- Create New User (Admin) ---")
    
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
    
    # 4. Tenant ID
    tenant_id = input("Enter Tenant ID (Client ID): ").strip()
    if not tenant_id:
        print("Error: Tenant ID is required.")
        return
        
    # 5. User Type
    role = input("Enter User Type (admin/user): ").strip().lower()
    if role not in ['admin', 'user']:
        print("Error: Role must be 'admin' or 'user'.")
        return

    # Construct fake email for Supabase Auth
    # We append a fake domain so we can map 'username' to 'email'
    email = f"{user_id}@fe-inbound.internal"
    
    print(f"\nCreating user...")
    print(f"  Username: {user_id}")
    print(f"  Email:    {email}")
    print(f"  Role:     {role}")
    print(f"  Tenant:   {tenant_id}")
    
    try:
        # Create user via Admin API
        # Confirm email automatically so they can login immediately
        response = supabase.auth.admin.create_user({
            "email": email,
            "password": password,
            "email_confirm": True,
            "user_metadata": {
                "username": user_id,
                "display_name": display_name,
                "tenant_id": tenant_id,
                "role": role
            }
        })
        
        print("\nSUCCESS! User created.")
        print(f"User UUID: {response.user.id}")
        print("Share the User ID and Password with the user.")
        
    except Exception as e:
        print(f"\nFAILED to create user: {e}")

if __name__ == "__main__":
    create_user()
