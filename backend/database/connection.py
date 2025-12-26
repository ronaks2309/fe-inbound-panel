# db.py
from sqlmodel import SQLModel, create_engine, Session

import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    # Fallback to sqlite for dev if not set, or raise error. 
    # Raising error is safer to ensure migration intent is met.
    # But for smoother transition, let's warn. 
    # User asked for migration, so let's default to Empty/Error if missing?
    # Actually, let's keep it robust.
    # If no env var, we can't connect to postgres.
    raise ValueError("DATABASE_URL environment variable is not set")

engine = create_engine(DATABASE_URL, echo=False)

def init_db():
    # Create tables
    SQLModel.metadata.create_all(engine)

def get_session():
    # Dependency for FastAPI routes
    with Session(engine) as session:
        yield session

