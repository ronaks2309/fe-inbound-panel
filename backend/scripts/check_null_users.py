
import sys
import os

# Add backend directory to sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sqlmodel import Session, select, func
from database.connection import engine
from database.models import Call, CallStatusEvent

def check_nulls():
    with Session(engine) as session:
        # Check Calls
        call_stmt = select(func.count(Call.id)).where(Call.user_id == None)
        null_calls = session.exec(call_stmt).one()
        
        # Check Events
        event_stmt = select(func.count(CallStatusEvent.id)).where(CallStatusEvent.user_id == None)
        null_events = session.exec(event_stmt).one()
        
        print(f"NULL_CALLS={null_calls}")
        print(f"NULL_EVENTS={null_events}")

if __name__ == "__main__":
    check_nulls()
