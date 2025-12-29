import sys
import os
from sqlalchemy import text

# Add parent directory to path so we can import locally
# Current file: backend/scripts/add_missing_columns.py
# Parent: backend/
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database.connection import engine

def migrate():
    print("Starting migration...")
    try:
        with engine.connect() as conn:
            print("Adding 'sentiment' column...")
            conn.execute(text("ALTER TABLE call ADD COLUMN IF NOT EXISTS sentiment TEXT;"))
            
            print("Adding 'disposition' column...")
            conn.execute(text("ALTER TABLE call ADD COLUMN IF NOT EXISTS disposition TEXT;"))
            
            conn.commit()
        print("Migration complete: Added sentiment and disposition columns.")
    except Exception as e:
        print(f"Migration failed: {e}")

if __name__ == "__main__":
    migrate()
