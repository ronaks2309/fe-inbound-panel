import requests
import json
import sys

BASE_URL = "http://localhost:8000"
CLIENT_ID = "demo-client"

def verify():
    print("1. Listing calls...")
    res = requests.get(f"{BASE_URL}/api/{CLIENT_ID}/calls")
    if res.status_code != 200:
        print(f"Failed to list calls: {res.status_code} {res.text}")
        sys.exit(1)
    
    calls = res.json()
    if not calls:
        print("No calls found to test.")
        # Try to creat a test call if none?
        # For now assume there are calls or just exit
        sys.exit(0)
        
    call_id = calls[0]['id']
    print(f"Selected Call ID: {call_id}")
    
    print("2. Patching Notes and Feedback...")
    payload = {
        "notes": "Verified via script.",
        "feedback_rating": 5,
        "feedback_text": "Great service!"
    }
    
    res = requests.patch(f"{BASE_URL}/api/calls/{call_id}", json=payload)
    if res.status_code != 200:
        print(f"Failed to PATCH call: {res.status_code} {res.text}")
        sys.exit(1)
        
    updated_call = res.json()["call"]
    print("PATCH success.")
    
    print("3. Verifying persisted data via GET...")
    res = requests.get(f"{BASE_URL}/api/calls/{call_id}")
    if res.status_code != 200:
        print(f"Failed to GET call details: {res.status_code} {res.text}")
        sys.exit(1)
        
    detail = res.json()
    
    print(f"Notes: {detail.get('notes')}")
    print(f"Feedback Rating: {detail.get('feedback_rating')}")
    print(f"Feedback Text: {detail.get('feedback_text')}")
    
    assert detail.get('notes') == "Verified via script."
    assert detail.get('feedback_rating') == 5
    assert detail.get('feedback_text') == "Great service!"
    
    print("VERIFICATION SUCCESS: Notes and Feedback features are working.")

if __name__ == "__main__":
    verify()
