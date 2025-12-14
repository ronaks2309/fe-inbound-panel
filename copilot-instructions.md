# Copilot Instructions for fe-inbound-panel

## Project snapshot
- Stack: FastAPI + SQLModel + SQLite backend; React + Vite + TypeScript + Tailwind v4 frontend.
- Key paths: 
  - Backend: `backend/app.py`, `backend/routers/*.py`, `backend/services/*.py`, `backend/database/models.py`.
  - Frontend: `frontend/src/components/CallDashboard.tsx` (main), `frontend/src/components/*Modal.tsx`.
- Default dev endpoints: REST `http://localhost:8000`, dashboard WS `ws://localhost:8000/ws/dashboard`, fake audio WS `ws://localhost:8000/ws/fake-audio`.

## Getting started (local dev)
- Backend: `cd backend && python -m venv .venv && .venv\Scripts\activate && pip install fastapi "uvicorn[standard]" sqlmodel sqlalchemy httpx`.
- Run backend: `uvicorn app:app --reload --port 8000` (auto-creates SQLite `backend/vapi_dashboard.db` and seeds `demo-client`).
- Frontend: `cd frontend && npm install` (uses Vite). Ensure `.env` has `VITE_BACKEND_URL=http://localhost:8000`. Start with `npm run dev`.
- Demo data: POST to `/api/debug/create-test-call/demo-client` to seed calls; WebSocket pushes will update the UI live.

## Data + contracts
- Models (`backend/database/models.py`):
  - Client{id, name, created_at}
  - Call{id, client_id, phone_number?, status?, started_at?, ended_at?, listen_url?, control_url?, live_transcript?, final_transcript?, recording_url?, summary JSON?, cost?, created_at, updated_at}
  - CallStatusEvent{id, call_id, client_id, status, payload JSON?, created_at}
- Core routes (`backend/routers/*.py`):
  - GET `/api/{client_id}/calls` list calls (lightweight).
  - GET `/api/calls/{call_id}` call detail (full).
  - GET `/api/recordings/{filename}` serve recording file.
  - POST `/api/debug/create-test-call/{client_id}` upsert fake call.
  - POST `/webhooks/vapi/{client_id}` dispatcher for VAPI payloads.
  - WS `/ws/dashboard` registers dashboards; emits `hello` + live events.
  - WS `/ws/fake-audio` sends hello then binary chunks for 10s.
- WebSocket message shapes sent to UI:
  - `call-upsert`: `{ type: "call-upsert", clientId, call: { id, status, phoneNumber, startedAt, endedAt, listenUrl, finalTranscript?, liveTranscript?, recordingUrl?, hasTranscript?, hasFinalTranscript?, hasLiveTranscript?, hasRecording?, hasListenUrl? } }`.
  - `transcript-update`: `{ type: "transcript-update", clientId, callId, append?, fullTranscript }`.

## Frontend behavior (CallDashboard)
- On mount: fetches `GET /api/demo-client/calls`, normalizes snake_case to camelCase, sets `hasTranscript/hasLiveTranscript/hasRecording` flags.
- WebSocket: connects to `/ws/dashboard`; merges updates.
- Modals: `TranscriptModal`, `ListenModal` (audio streaming), `RecordingModal` (playback).
- Actions: force transfer uses hardcoded agent `+16504848853`.

## Copilot guidance (backend)
- Always route through `get_session` dependency.
- Validate `call_id` early.
- Broadcast with `manager.broadcast_dashboard` using updated shapes.
- Keep SQLModel models source-of-truth.

## Copilot guidance (frontend)
- Preserve `Call` type shape (match backend `CallDetailResponse`).
- Use separate Modal components for cleanliness.
- Use Tailwind v4.
