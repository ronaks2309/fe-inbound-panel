import os
import sys
from sqlmodel import Session, select
from dotenv import load_dotenv

sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
from database.connection import engine
from database.models import Profile

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '..', '.env'))

def verify_username():
    print("--- Verifying Profile Username Field ---")
    with Session(engine) as session:
        statement = select(Profile).where(Profile.username.is_not(None))
        results = session.exec(statement).all()
        
        print(f"Found {len(results)} profiles with username set:")
        for profile in results:
            print(f"  ID: {profile.id}")
            print(f"  Username: {profile.username}")
            print(f"  Display: {profile.display_name}")
            print("  ---")

if __name__ == "__main__":
    verify_username()
