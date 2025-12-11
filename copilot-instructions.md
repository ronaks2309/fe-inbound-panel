# Copilot Instructions for fe-inbound-panel

## Project snapshot
- Stack: FastAPI + SQLModel + SQLite backend; React + Vite + TypeScript + Tailwind v4 frontend.
- Key paths: `backend/app.py` (routes + WebSocket), `backend/models.py`, `backend/websocket_manager.py`, `frontend/src/components/CallDashboard.tsx` (main UI), `frontend/.env` for `VITE_BACKEND_URL`.
- Default dev endpoints: REST `http://localhost:8000`, dashboard WS `ws://localhost:8000/ws/dashboard`, fake audio WS `ws://localhost:8000/ws/fake-audio`.

## Getting started (local dev)
- Backend: `cd backend && python -m venv .venv && .venv\Scripts\activate && pip install fastapi "uvicorn[standard]" sqlmodel sqlalchemy httpx`.
- Run backend: `uvicorn app:app --reload --port 8000` (auto-creates SQLite `backend/vapi_dashboard.db` and seeds `demo-client`).
- Frontend: `cd frontend && npm install` (uses Vite). Ensure `.env` has `VITE_BACKEND_URL=http://localhost:8000`. Start with `npm run dev`.
- Demo data: POST to `/api/debug/create-test-call/demo-client` to seed calls; WebSocket pushes will update the UI live.

## Data + contracts
- Models (backend/models.py):
  - Client{id, name, created_at}
  - Call{id, client_id, phone_number?, status?, started_at?, ended_at?, listen_url?, control_url?, live_transcript?, final_transcript?, recording_url?, summary JSON?, created_at, updated_at}
  - CallStatusEvent{id, call_id, client_id, status, payload JSON?, created_at}
- Core routes (backend/app.py):
  - GET `/api/{client_id}/calls` bootstrap calls.
  - POST `/api/debug/create-test-call/{client_id}` upsert fake call + broadcast; accepts optional `call_id`, `phone_number`, `status`, `event_payload`.
  - POST `/api/debug/log-status-event/{client_id}/{call_id}` add CallStatusEvent.
  - GET `/api/debug/status-events/{client_id}/{call_id}` list events.
  - POST `/api/{client_id}/calls/{call_id}/force-transfer` uses stored `control_url`; body `{ agent_phone_number, content? }`; logs event.
  - POST `/webhooks/vapi/{client_id}` dispatcher for VAPI payloads; handles `status-update`, `transcript`, `end-of-call-report`, else logs generic.
  - WS `/ws/dashboard` registers dashboards; emits `hello` + live events; expects any text to keep alive.
  - WS `/ws/fake-audio` sends hello then binary chunks for 10s for Listen modal testing.
- WebSocket message shapes sent to UI:
  - `call-upsert`: `{ type: "call-upsert", clientId, call: { id, status, phoneNumber, startedAt, endedAt, listenUrl, finalTranscript?, liveTranscript?, recordingUrl?, hasTranscript?, hasLiveTranscript?, hasRecording? } }`.
  - `transcript-update`: `{ type: "transcript-update", clientId, callId, append?, fullTranscript }`.

## Frontend behavior (CallDashboard)
- On mount: fetches `GET /api/demo-client/calls`, normalizes snake_case to camelCase, sets `hasTranscript/hasLiveTranscript/hasRecording` flags.
- WebSocket: connects to `/ws/dashboard`; on `call-upsert` merges call by id; on `transcript-update` marks `hasLiveTranscript` and updates `live_transcript`.
- Actions: force transfer uses hardcoded agent `+16504848853` and only works for `in-progress|ringing|queued`; ended calls show "Call Recording" and "View Transcript" buttons gated by flags.
- Pending UI (placeholders): listen modal audio, transcript modal, recording playback; keep payload fields aligned with backend flags before wiring.

## Copilot guidance (backend)
- Always route through `get_session` dependency and commit+refresh before broadcasting so dashboard sees persisted values.
- Validate `call_id` early in webhook handlers; gracefully handle missing/unknown fields instead of throwing.
- When mutating Call, update `updated_at` and set `ended_at` when marking completed/ended/hangup.
- Broadcast with `manager.broadcast_dashboard` using the existing shapes; if adding fields, update both broadcast payloads and frontend normalization.
- Use `httpx.AsyncClient` with timeouts for external calls; surface errors via `HTTPException` with meaningful status codes.
- Keep SQLModel models source-of-truth; prefer optional fields over silent defaults; store raw VAPI artifacts in `summary`/`payload` rather than discarding.

## Copilot guidance (frontend)
- Preserve `Call` type shape; add new optional props when backend gains fields and normalize server responses in one place.
- Keep WS lifecycle clean: open once, handle JSON parse errors, close on unmount; if adding reconnection, debounce to avoid flooding.
- Derive UI flags (`hasTranscript`, etc.) in state so buttons stay in sync; avoid duplicating status text parsing.
- Use Tailwind utility classes (v4 via `@tailwindcss/vite`); keep styles colocated in components rather than new global CSS unless necessary.
- Handle network errors with user-facing messages (existing `error`, `forceTransferError` state patterns).

## Debugging + manual tests
- Create/update fake call: `curl -X POST http://localhost:8000/api/debug/create-test-call/demo-client -H "Content-Type: application/json" -d "{\"status\":\"in-progress\"}"`.
- Append transcript-like event via webhook: send `message.type":"transcript"` payload to `/webhooks/vapi/demo-client` with `call.id` and `transcript` to see live transcript update in UI.
- Test force transfer failure path: call endpoint without `control_url` to confirm 400 and UI error handling.
- Use `GET /api/debug/status-events/demo-client/{call_id}` to inspect audit trail when debugging state mismatches.

