# API Documentation — VAPI Inbound Call Dashboard

Base URL (local): `http://localhost:8000`  
Auth: none (development). Add auth + tenant isolation + tighter CORS for production.

## Multi-Tenancy
`client_id` is always a path parameter (example: `demo-client`). `CallStatusEvent.client_id` is required by the backend.

## Health
- `GET /` → `{"message": "Vapi dashboard backend is running"}`
- `GET /health` → `{"status": "ok"}`

## REST + Webhook Endpoints

### List Calls
- `GET /api/{client_id}/calls`
- Returns calls ordered by `created_at` descending (used by the dashboard bootstrap).
- Response (example):
```json
[
  {
    "id": "debug-1765332952",
    "client_id": "demo-client",
    "phone_number": "+15555550123",
    "status": "in-progress",
    "started_at": "2025-12-10T07:05:14.195889",
    "ended_at": null,
    "listen_url": null,
    "control_url": null,
    "live_transcript": null,
    "final_transcript": null,
    "recording_url": null
  }
]
```

### Force Transfer a Live Call
- `POST /api/{client_id}/calls/{call_id}/force-transfer`
- Body:
```json
{
  "agent_phone_number": "+16504848853",
  "content": "Transferring your call now"
}
```
- Requires the Call to have a `control_url`; otherwise returns `400`. Returns `404` if the call does not exist for the client. On success, posts a Vapi transfer payload to `control_url` and logs `CallStatusEvent(status="force-transfer")`.

### Vapi Webhook Ingest
- `POST /webhooks/vapi/{client_id}`
- Switches on `message.type` (case-insensitive):
  - `status-update`: upsert Call (id, phoneNumber/from, listenUrl, controlUrl, status, started/ended), insert `CallStatusEvent`, broadcast `call-upsert`.
  - `transcript`: append to `Call.live_transcript`, insert `CallStatusEvent`, broadcast `transcript-update` with `append` + `fullTranscript`.
  - `end-of-call-report`: set `status="ended"`, `ended_at`, `final_transcript` (artifact.transcript), `recording_url` (artifact.recording url fields), `summary` (messages + endedReason); insert `CallStatusEvent`; broadcast `call-upsert`.
  - any other value: log generic `CallStatusEvent` (no broadcast).
- Required field: `message.call.id`. Optional fields read from `message.call`: `phoneNumber|from`, `listenUrl|listen_url`, `controlUrl|control_url`.

### Debug Helpers
- `POST /api/debug/create-test-call/{client_id}`  
  Body (optional): `call_id`, `phone_number`, `status`, `event_payload`. Upserts Call, inserts `CallStatusEvent`, broadcasts `call-upsert`.
- `POST /api/debug/log-status-event/{client_id}/{call_id}`  
  Body: `status` (default `"in-progress"`), optional `payload`. Inserts `CallStatusEvent`.
- `GET /api/debug/status-events/{client_id}/{call_id}`  
  Lists events ordered by `created_at` ascending.

## WebSockets

### Dashboard Updates
- `GET /ws/dashboard` (WebSocket)
- On connect: sends `{"type": "hello", "message": "Dashboard WebSocket connected"}`.
- Broadcast messages:
  - `call-upsert`
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
        "listenUrl": "wss://...",
        "hasTranscript": true,
        "hasLiveTranscript": false,
        "hasRecording": true,
        "finalTranscript": "optional",
        "liveTranscript": "optional",
        "recordingUrl": "optional"
      }
    }
    ```
  - `transcript-update`
    ```json
    {
      "type": "transcript-update",
      "clientId": "demo-client",
      "callId": "abc123",
      "append": "new line",
      "fullTranscript": "complete text so far"
    }
    ```

### Fake Audio Stream (for testing ListenModal)
- `GET /ws/fake-audio` (WebSocket)
- Sends a hello text frame, then ~10 seconds of random 1280-byte binary chunks (pretend PCM 16-bit mono at 32000 Hz), then closes.

## Data Model (SQLModel)
- Client: `id`, `name`, `created_at`
- Call: `id`, `client_id`, `phone_number`, `status`, `started_at`, `ended_at`, `listen_url`, `control_url`, `live_transcript`, `final_transcript`, `recording_url`, `summary` (JSON), `created_at`, `updated_at`
- CallStatusEvent: `id`, `call_id`, `client_id`, `status`, `payload` (JSON), `created_at`

## Notes and Constraints
- `client_id` must always be provided; `CallStatusEvent.client_id` is NOT NULL.
- Force transfer requires `control_url` on the Call; otherwise the backend responds with `400`.
- Security and rate limiting are not implemented; add both before production.
