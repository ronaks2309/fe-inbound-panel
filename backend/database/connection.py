# db.py
from sqlmodel import SQLModel, create_engine, Session

DATABASE_URL = "sqlite:///database/call_dashboard.db"
engine = create_engine(DATABASE_URL, echo=False)

def init_db():
    # Create tables
    SQLModel.metadata.create_all(engine)

def get_session():
    # Dependency for FastAPI routes
    with Session(engine) as session:
        yield session

