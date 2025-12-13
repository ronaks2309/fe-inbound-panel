# Insert a test call record into the database

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database.connection import engine
from sqlmodel import Session
from database.models import Call

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
