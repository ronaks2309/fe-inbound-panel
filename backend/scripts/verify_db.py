
import os
import sys
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

# Force reload of .env
load_dotenv('backend/.env', override=True)

url = os.getenv("DATABASE_URL")
if not url:
    print("Error: DATABASE_URL not set in backend/.env")
    sys.exit(1)

print(f"Testing connection to: {url.split('@')[-1]}")

try:
    engine = create_engine(url)
    with engine.connect() as conn:
        result = conn.execute(text("SELECT 1"))
        print("Connection successful! Result:", result.scalar())
except Exception as e:
    print(f"Connection failed: {e}")
    sys.exit(1)
