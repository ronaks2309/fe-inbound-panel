import sys
import os
import json
from sqlmodel import select, Session

# Add parent directory to path so we can import locally
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database.connection import engine
from database.models import CallStatusEvent

def inspect_latest_webhook():
    print("Connecting to DB to find latest end-of-call-report...")
    with Session(engine) as session:
        # Find latest event with status 'end-of-call-report' (or close enough match)
        stmt = select(CallStatusEvent).where(CallStatusEvent.status.contains("end-of-call-report")).order_by(CallStatusEvent.created_at.desc()).limit(1)
        event = session.exec(stmt).first()
        
        if not event:
            print("No 'end-of-call-report' found in call_status_event table.")
            return

        print(f"--- Found Event ID: {event.id} ---")
        print(f"Created At: {event.created_at}")
        print(f"Call ID: {event.call_id}")
        
        payload = event.payload
        if isinstance(payload, str):
            try:
                payload = json.loads(payload)
            except:
                pass
                
        # Pretty print specific sections we care about
        print("\n--- Message Artifact ---")
        message = payload.get("message", payload) # Sometimes payload IS the message depending on how we saved it
        artifact = message.get("artifact", {})
        print(json.dumps(artifact, indent=2))
        
        print("\n--- Analysis ---")
        analysis = message.get("analysis", {})
        print(json.dumps(analysis, indent=2))

        print("\n--- Structured Outputs (Raw Check) ---")
        structured = artifact.get("structuredOutputs")
        print(f"Existent: {structured is not None}")
        if structured:
            print(json.dumps(structured, indent=2))

if __name__ == "__main__":
    inspect_latest_webhook()
