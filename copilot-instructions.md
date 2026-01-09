# Copilot Instructions for fe-inbound-panel

## Project Snapshot
- **Stack**: 
  - **Backend**: FastAPI + SQLModel + **PostgreSQL (Supabase)**.
  - **Frontend**: React + Vite + TypeScript + **Tailwind v4**.
  - **Auth**: Supabase Auth (JWT) + Row Level Security (RLS).
- **Key Backend Paths**:
  - `backend/app.py`: Entry point.
  - `backend/database/models.py`: **Source of Truth** for Data Models.
  - `backend/dependencies/auth.py`: Handles RLS context (`SET LOCAL role...`).
  - `backend/routers/*.py`: `webhooks`, `calls`, `websockets`.
  - `backend/services/*.py`: `call_service`, `websocket_manager`, `supabase_service`.
- **Key Frontend Paths**:
  - `frontend/src/context/ActiveCallContext.tsx`: **Singleton** WebSocket manager & Global State.
  - `frontend/src/components/LiveCallTile.tsx`: Active call card + Audio Streamer.
  - `frontend/src/components/Sidebar.tsx`: Navigation + Active Call Badge.
  - `frontend/src/pages/LiveMonitorPage.tsx`: Main active calls dashboard.

## Getting Started (Local Dev)
### Backend
1. `cd backend`
2. `source .venv/bin/activate` (or Windows equivalent)
3. Ensure `.env` has:
   - `DATABASE_URL` (Postgres connection string)
   - `SUPABASE_URL` & `SUPABASE_SERVICE_ROLE_KEY`
4. Run: `python -m uvicorn app:app --reload --port 8000`
5. Docs: `http://localhost:8000/docs` (Basic Auth defaults: admin/admin).

### Frontend
1. `cd frontend`
2. `npm install`
3. Ensure `.env` has:
   - `VITE_BACKEND_URL=http://localhost:8000`
   - `VITE_SUPABASE_URL` & `VITE_SUPABASE_ANON_KEY`
4. Run: `npm run dev`

### User Creation
- Use `python -m services.create_user` to create new tenants/users with proper profiles.

## Data Models (`backend/database/models.py`)
- **Client**: `{ id (PK), name, created_at }`
- **Profile**: `{ id (PK/UUID), client_id, role, username, display_name }` - Links Auth to Client.
- **Call**: 
  - `{ id (PK), client_id, phone_number, status, started_at, ended_at, duration, cost, user_id, username }`
  - **Live Data**: `{ listen_url, control_url, live_transcript (JSON Array) }`
  - **Post-Call**: `{ recording_url, final_transcript, summary (JSON), sentiment, disposition, notes }`
- **CallStatusEvent**: `{ id, call_id, client_id, user_id, status, payload (JSON) }`

## Core Routes & WebSocket Protocol
- **REST**:
  - `POST /webhooks/vprod/{client_id}`: VAPI Event Ingest.
  - `GET /api/{client_id}/calls`: List calls (Filtered by RLS).
  - `POST /api/{client_id}/calls/{call_id}/force-transfer`: Supervisor Take Owner.
- **WebSockets**:
  - **`/ws/dashboard?token={jwt}`**: 
    - **In**: `{ type: "ping" }`
    - **Out**: 
      - `call-upsert`: `{ type: "call-upsert", call: { ... } }` (Full Call Object)
      - `transcript-update`: `{ type: "transcript-update", callId, transcript: [...] }`
  - **`/ws/listen/{call_id}?token={jwt}`**:
    - **Out**: Binary PCM 16-bit audio chunks (for Web Audio API).

## Copilot Guidance (Backend)
1. **Security First**: ALWAYS use `Depends(get_secure_session)` for DB access to enforce RLS. Never use raw `Session(engine)` in routers unless absolutely necessary (e.g., public webhooks).
2. **WebSockets**: Use `BroadcastManager` (`backend/services/websocket_manager.py`) for all push updates. Ensure messages are filtered by `tenant_id`.
3. **Supabase**: Use `supabase_service.py` for Storage operations. Use `create_user.py` logic for user management.

## Copilot Guidance (Frontend)
1. **State Management**: 
   - Use `useActiveCalls()` for **Global** state (Badge counts, Connection status).
   - Use Local State (`useState`) for UI-specifics (Modals, filters).
2. **Styling**: Use **Tailwind v4** semantics. Use `clsx` or `cn` helper for class merging.
3. **Audio**: `LiveAudioStreamer.tsx` expects raw PCM data. Do not change decoding logic unless backend encoding changes.
4. **Components**: Keep `LiveCallTile` focused on the *individual* call state.
