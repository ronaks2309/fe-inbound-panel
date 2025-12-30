import sys
import os
from sqlalchemy import text

# Add parent directory to path so we can import locally
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database.connection import engine

def migrate():
    print("Starting migration for Notes and Feedback...")
    try:
        with engine.connect() as conn:
            print("Adding 'notes' column...")
            try:
                conn.execute(text("ALTER TABLE call ADD COLUMN notes TEXT;"))
            except Exception as e:
                if "duplicate column" in str(e).lower():
                    print("Column 'notes' already exists.")
                else:
                    print(f"Error adding 'notes': {e}")

            print("Adding 'feedback_rating' column...")
            try:
                conn.execute(text("ALTER TABLE call ADD COLUMN feedback_rating INTEGER;"))
            except Exception as e:
                if "duplicate column" in str(e).lower():
                    print("Column 'feedback_rating' already exists.")
                else:
                    print(f"Error adding 'feedback_rating': {e}")
            
            print("Adding 'feedback_text' column...")
            try:
                conn.execute(text("ALTER TABLE call ADD COLUMN feedback_text TEXT;"))
            except Exception as e:
                if "duplicate column" in str(e).lower():
                    print("Column 'feedback_text' already exists.")
                else:
                    print(f"Error adding 'feedback_text': {e}")
            
            conn.commit()
        print("Migration complete: Notes and Feedback columns added.")
    except Exception as e:
        print(f"Migration failed details: {e}")

if __name__ == "__main__":
    migrate()
