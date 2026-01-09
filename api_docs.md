# API Documentation — CallMark AI Inbound Panel

**Base URL**: `http://localhost:8000` (Development)

---

## 1. Authentication & Security

### Overview
This API uses **Supabase Auth (JWT)** for authentication and **PostgreSQL Row Level Security (RLS)** for authorization. 
All requests to protected endpoints MUST include the JWT in the `Authorization` header.

**Header Format:**
```http
Authorization: Bearer <your_access_token>
```

### Multi-Tenancy & RLS
- **Isolation**: Data access is strictly isolated by `client_id` (Tenant ID).
- **Enforcement**: The backend extracts the `client_id` from the JWT's `app_metadata` (via custom claims or profile lookup) and sets a Postgres Session variable.
- **Rule**: `SELECT * FROM calls` only returns rows where `client_id` matches the user's `client_id`.

---

## 2. Webhooks (VAPI Ingestion)

### `POST /webhooks/vprod/{client_id}`
Dispatcher for all VAPI.ai server events. This endpoint is generally **publicly accessible** (or protected by a Service Key in production) to allow VAPI servers to push data.

**Headers:**
- `Content-Type`: `application/json`

#### Scenario A: Status Update
Sent when call state changes (e.g., `ringing` -> `in-progress` -> `ended`).

**Sample Payload:**
```json
{
  "message": {
    "type": "status-update",
    "status": "in-progress",
    "call": {
      "id": "vapi-call-uuid-123",
      "customer": { "number": "+15550001234" },
      "listenUrl": "wss://vapi.ai/listen/...",
      "controlUrl": "https://vapi.ai/control/..."
    },
    "timestamp": "2024-01-01T12:00:00Z"
  }
}
```

#### Scenario B: Live Transcript
Sent incrementally as the AI or user speaks.

**Sample Payload:**
```json
{
  "message": {
    "type": "transcript",
    "transcript": "Hello, how can I help you today?",
    "transcriptType": "partial", 
    "call": { "id": "vapi-call-uuid-123" }
  }
}
```

#### Scenario C: End of Call Report
Sent after the call finishes processing.

**Sample Payload:**
```json
{
  "message": {
    "type": "end-of-call-report",
    "call": { "id": "vapi-call-uuid-123" },
    "artifact": {
      "transcript": "Full final transcript...",
      "recordingUrl": "https://vapi.ai/recordings/file.wav"
    },
    "analysis": {
      "summary": "User asked about billing.",
      "sentiment": "positive"
    },
    "endedReason": "customer-ended-call"
  }
}
```

---

## 3. REST API (Calls)

### List Calls
**`GET /api/{client_id}/calls`**

Retrieve a paginated/filtered list of calls.

**Query Parameters:**
- `status` (optional): Filter by comma-separated status (e.g., `in-progress,ringing`).
- `include_content` (optional): `true` to return full transcripts and summaries. Defaults to `false`.

**Example Request:**
```bash
curl -X GET "http://localhost:8000/api/demo-client/calls?status=in-progress" \
     -H "Authorization: Bearer <your_jwt>"
```

**Response (200 OK):**
```json
[
  {
    "id": "vapi-call-uuid-123",
    "client_id": "demo-client",
    "phone_number": "+15550001234",
    "status": "in-progress",
    "started_at": "2024-01-01T12:00:00Z",
    "duration": 45,
    "hasListenUrl": true,
    "hasLiveTranscript": true,
    "hasFinalTranscript": false
  }
]
```

### Get Call Details
**`GET /api/calls/{call_id}`**

Retrieve full details for a single call, including the live transcript array and analysis.

**Example Request:**
```bash
curl -X GET "http://localhost:8000/api/calls/vapi-call-uuid-123" \
     -H "Authorization: Bearer <your_jwt>"
```

**Response (200 OK):**
```json
{
  "id": "vapi-call-uuid-123",
  "client_id": "demo-client",
  "status": "in-progress",
  "live_transcript": [
    { "role": "ai", "text": "Hello!" },
    { "role": "user", "text": "Hi there." }
  ],
  "final_transcript": null,
  "summary": null,
  "sentiment": "neutral"
}
```

### Force Transfer (Take Over)
**`POST /api/{client_id}/calls/{call_id}/force-transfer`**

Triggers a transfer event to the VAPI `controlUrl`. Requires **Admin** role or Call Ownership.

**Example Request:**
```bash
curl -X POST "http://localhost:8000/api/demo-client/calls/vapi-uuid-123/force-transfer" \
     -H "Authorization: Bearer <your_jwt>" \
     -H "Content-Type: application/json" \
     -d '{
           "agent_phone_number": "+15559998888",
           "content": "Transferring you to a specialist."
         }'
```

**Response (200 OK):**
```json
{
  "ok": true,
  "call_id": "vapi-uuid-123",
  "forwarded_to": "+15559998888"
}
```

### Get Recording URL
**`GET /api/calls/{call_id}/recording`**

Generates a secure, time-limited Signed URL for the recording file stored in Supabase Storage.

**Example Request:**
```bash
curl -X GET "http://localhost:8000/api/calls/vapi-uuid-123/recording" \
     -H "Authorization: Bearer <your_jwt>"
```

**Response (200 OK):**
```json
{
  "url": "https://<supabase-project>.supabase.co/storage/v1/object/sign/recordings/file.wav?token=..."
}
```

### Update Call Metadata
**`PATCH /api/calls/{call_id}`**

Updates editable fields like notes or feedback ratings.

**Example Request:**
```bash
curl -X PATCH "http://localhost:8000/api/calls/vapi-uuid-123" \
     -H "Authorization: Bearer <your_jwt>" \
     -H "Content-Type: application/json" \
     -d '{ "notes": "Customer was frustrated.", "feedback_rating": 2 }'
```

---

## 4. WebSockets (Real-Time)

### Dashboard Updates
**URL**: `ws://localhost:8000/ws/dashboard?token=<JWT>`

**Protocol:**
1.  **Connect**: Client sends JWT in query param.
2.  **Server Hello**: Server sends `{ "type": "hello" }`.
3.  **Subscriptions**: Client can send `{ "type": "subscribe", "callId": "..." }` to get granular transcript updates.
4.  **Broadcasts**:
    -   **`call-upsert`**: Pushed whenever a call's status or metadata changes.
    -   **`transcript-update`**: Pushed when new speech is transcribed.

**Sample `transcript-update` Message:**
```json
{
  "type": "transcript-update",
  "clientId": "demo-client",
  "callId": "vapi-uuid-123",
  "append": " I would like to order...",
  "fullTranscript": "Hello... I would like to order..." 
}
```

### Audio Streaming (Listen In)
**URL**: `ws://localhost:8000/ws/listen/{call_id}?token=<JWT>`

**Protocol:**
-   **Binary Stream**: The server proxies binary messages from VAPI's `listenUrl`.
-   **Format**: Raw **PCM 16-bit Little Endian**.
-   **Sample Rate**: Typically 24kHz or 32kHz (depends on VAPI configuration).
-   **Client Side**: Use Web Audio API `AudioContext` to decode and play.

---

## 5. Error Codes

| Status Code | Description |
| :--- | :--- |
| `200 OK` | Request succeeded. |
| `400 Bad Request` | Missing required fields or invalid JSON. |
| `401 Unauthorized` | Missing or invalid Bearer token. |
| `403 Forbidden` | Valid token, but user does not have access to the resource (Tenant mismatch). |
| `404 Not Found` | Resource does not exist or user is hidden from it via RLS. |
| `500 Internal Error` | Server-side exception. |
