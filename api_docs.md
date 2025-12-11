# 📚 API Documentation – VAPI Inbound Call Dashboard

Base URL (local):

- `http://localhost:8000`

---

## 🔐 Multi-Tenancy

Most endpoints are **scoped by client** via the `client_id` path parameter.

Example:

- `demo-client`
- `acme-agency`
- `senior-life`

---

## 🔁 WebSocket – Dashboard Updates

### `GET /ws/dashboard` (WebSocket)

Real-time updates for calls.

- **Protocol:** WebSocket
- **URL (local):** `ws://localhost:8000/ws/dashboard`

#### Messages sent from server → client

Currently one main type:

```json
{
  "type": "call-upsert",
  "clientId": "demo-client",
  "call": {
    "id": "abc123",
    "status": "in-progress",
    "phoneNumber": "+18005550000",
    "startedAt": "2025-12-10T07:05:14.195889",
    "endedAt": null,
    "listenUrl": null
  }
}
```

Client behavior:

If call.id is new → insert row.

If call.id exists → update row in-place.

Avoid duplicates.

📞 Calls API
GET /api/{client_id}/calls

Fetch list of calls for a given client (used to bootstrap the dashboard UI).

Method: GET

Path: /api/{client_id}/calls

Auth: None (for now)

Params:

client_id (path) – string

Response: 200 OK
[
  {
    "id": "debug-1765332952",
    "client_id": "demo-client",
    "phone_number": "+15555550123",
    "status": "in-progress",
    "started_at": "2025-12-10T07:05:14.195889",
    "ended_at": null,
    "created_at": "2025-12-10T07:05:14.195889",
    "updated_at": "2025-12-10T07:05:14.195889",
    "listen_url": null
  }
]

🧪 Debug APIs (for local testing)

These simulate VAPI behavior so the dashboard can be tested without real traffic.

1. POST /api/debug/create-test-call/{client_id}

Create or update a fake call and broadcast to dashboards.

Method: POST

Path: /api/debug/create-test-call/{client_id}

Auth: None

Params:

client_id (path) – string

Request body (JSON)
{
  "call_id": "optional-call-id",
  "phone_number": "+18885550111",
  "status": "in-progress",
  "event_payload": {
    "note": "optional debug info"
  }
}


Fields:

call_id (optional) – if supplied, upserts this call; if omitted/empty → auto-generates debug-{timestamp}

phone_number (optional) – defaults to +15555550123

status (optional) – defaults to "in-progress"

event_payload (optional) – arbitrary JSON stored with CallStatusEvent

Behavior

Resolve call_id (either from body or generated).

If call exists:

Update status, phone_number, updated_at.

Else:

Insert new Call.

Insert new CallStatusEvent row for this status.

Broadcast call-upsert to all connected dashboards.

Response: 200 OK
{
  "ok": true,
  "call_id": "call-xyz-1",
  "updated": false,
  "status_event_id": 12
}

2. POST /api/debug/log-status-event/{client_id}/{call_id}

Manually log a CallStatusEvent entry for testing.

Method: POST

Path: /api/debug/log-status-event/{client_id}/{call_id}

Request body (JSON)
{
  "status": "in-progress",
  "payload": {
    "source": "debug"
  }
}

Response: 200 OK
{
  "ok": true,
  "event_id": 42
}

3. GET /api/debug/status-events/{client_id}/{call_id}

Retrieve chronological status events for a call.

Method: GET

Path: /api/debug/status-events/{client_id}/{call_id}

Response: 200 OK
[
  {
    "id": 40,
    "call_id": "call-xyz-1",
    "client_id": "demo-client",
    "status": "ringing",
    "created_at": "2025-12-10T07:30:00.123456",
    "payload": { "source": "initial" }
  },
  {
    "id": 41,
    "call_id": "call-xyz-1",
    "client_id": "demo-client",
    "status": "in-progress",
    "created_at": "2025-12-10T07:30:05.654321",
    "payload": { "source": "connected" }
  }
]

📡 (Planned) VAPI Webhook
POST /webhooks/vapi/{client_id} (planned)

Receives real VAPI status webhooks.

Extracts:

call.id

status

listenUrl

controlUrl

Upserts Call, logs CallStatusEvent, broadcasts call-upsert.

Exact payload structure to be finalized based on VAPI docs / your config.