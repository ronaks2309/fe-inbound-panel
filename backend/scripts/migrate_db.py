import sqlite3
import os

# Adjust path to database file
DB_PATH = os.path.join(os.path.dirname(__file__), '..', 'database', 'call_dashboard.db')

def migrate():
    if not os.path.exists(DB_PATH):
        print(f"Database not found at {DB_PATH}. It will be created on next app startup.")
        return

    print(f"Migrating database at: {DB_PATH}")
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # 1. Add user_id to Call table
    try:
        cursor.execute("ALTER TABLE call ADD COLUMN user_id VARCHAR")
        print("Success: Added 'user_id' to 'call' table.")
    except sqlite3.OperationalError as e:
        if "duplicate column name" in str(e):
            print("Info: 'user_id' column already exists in 'call' table.")
        else:
            print(f"Error adding column to 'call': {e}")

    # 2. Add user_id to CallStatusEvent table
    try:
        cursor.execute("ALTER TABLE callstatusevent ADD COLUMN user_id VARCHAR")
        print("Success: Added 'user_id' to 'callstatusevent' table.")
    except sqlite3.OperationalError as e:
        if "duplicate column name" in str(e):
            print("Info: 'user_id' column already exists in 'callstatusevent' table.")
        else:
            print(f"Error adding column to 'callstatusevent': {e}")

    # 3. Add username to Call table
    try:
        cursor.execute("ALTER TABLE call ADD COLUMN username VARCHAR")
        print("Success: Added 'username' to 'call' table.")
    except sqlite3.OperationalError as e:
        if "duplicate column name" in str(e):
            print("Info: 'username' column already exists in 'call' table.")
        else:
            print(f"Error adding 'username' to 'call': {e}")

    # 4. Add duration to Call table
    try:
        cursor.execute("ALTER TABLE call ADD COLUMN duration INTEGER")
        print("Success: Added 'duration' to 'call' table.")
    except sqlite3.OperationalError as e:
        if "duplicate column name" in str(e):
            print("Info: 'duration' column already exists in 'call' table.")
        else:
            print(f"Error adding 'duration' to 'call': {e}")

    conn.commit()
    conn.close()
    print("Migration completed.")

if __name__ == "__main__":
    migrate()
