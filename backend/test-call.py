# Insert a test call record into the database

from db import engine
from sqlmodel import Session
from models import Call

from datetime import datetime

with Session(engine) as session:
    call = Call(
        id="test-call-1",
        client_id="demo-client",
        phone_number="+15555550123",
        status="in-progress",
        started_at=datetime.utcnow()
    )
    session.add(call)
    session.commit()
    print("Inserted call:", call.id)
