# Architecture Diagrams (Mermaid)

## 1. High-Level System Components
Overview of how Frontend, Backend, Database, and vprod interact.

```mermaid
flowchart TD
    User[Agent/Supervisor] -->|HTTPS + WSS| FE[React Frontend]
    FE -->|Auth| Supabase[Supabase Auth]
    FE -->|REST API| BE[FastAPI Backend]
    
    subgraph Backend
        Router[API Routers]
        WS[WebSocket Manager]
        Auth[Auth Dependency]
        Service[Call Service]
    end
    
    BE -->|SQLModel + RLS| DB[(Postgres DB)]
    BE -->|Admin API| Storage[Supabase Storage]
    
    vprod[vprod.ai] -->|Webhooks| BE
    vprod -->|Audio Stream| BE
```

## 2. Authentication & RLS Flow
How requests are authenticated and authorized using Row Level Security.

```mermaid
sequenceDiagram
    participant FE as Frontend
    participant S as Supabase Auth
    participant BE as Backend
    participant DB as Postgres DB

    FE->>S: Login (Email/Pass)
    S-->>FE: JWT (Access Token)
    FE->>BE: Request + Header "Authorization: Bearer JWT"
    BE->>S: Verify JWT Signature (Public Key)
    BE->>BE: Extract user_id & client_id
    BE->>DB: SESSION SET "request.jwt.claim.sub" = user_id
    BE->>DB: SESSION SET "role" = 'authenticated'
    BE->>DB: SELECT * FROM Calls
    DB-->>BE: Return only rows matching user's client_id (RLS)
    BE-->>FE: JSON Response
```

## 3. WebSocket Dashboard Connection
Establishing the real-time link for call updates.

```mermaid
sequenceDiagram
    participant FE as Frontend (ActiveCallContext)
    participant BE as Backend (WS Endpoint)
    participant WM as BroadcastManager

    FE->>BE: WS /ws/dashboard?token=JWT
    BE->>BE: Validate JWT (Sync in Threadpool)
    alt Invalid Token
        BE-->>FE: Close 1008 (Policy Violation)
    else Valid Token
        BE->>WM: Register Client (WebSocket, user_id, tenant_id)
        BE-->>FE: Accept Connection
        BE-->>FE: { type: "hello" }
    end
```

## 4. New Call Lifecycle (Incoming)
A new call starts ringing at vprod.

```mermaid
sequenceDiagram
    participant V as vprod
    participant BE as Backend
    participant DB as Postgres
    participant WM as BroadcastManager
    participant FE as Frontend

    V->>BE: POST /webhooks (status-update: ringing)
    BE->>DB: INSERT Call (Status=ringing)
    BE->>DB: INSERT CallStatusEvent
    BE->>WM: broadcast_dashboard(call_data)
    WM->>WM: Filter clients by Call.client_id
    WM-->>FE: { type: "call-upsert", call: { status: "ringing", ... } }
    FE->>FE: ActiveCallContext triggers Toast & Sound Alert
```

## 5. Status Update Flow (In-Progress)
Call is answered and becomes active.

```mermaid
sequenceDiagram
    participant V as vprod
    participant BE as Backend
    participant DB as Postgres
    participant WM as BroadcastManager
    participant FE as Frontend (LiveCallTile)

    V->>BE: POST /webhooks (status: in-progress)
    BE->>DB: UPDATE Call (status=in-progress)
    BE->>WM: broadcast_dashboard(call)
    WM-->>FE: { type: "call-upsert", call: { status: "in-progress" } }
    FE->>FE: LiveCallTile updates badge to "Live"
```

## 6. Live Transcript Streaming
Real-time text updates during the call.

```mermaid
sequenceDiagram
    participant V as vprod
    participant BE as Backend
    participant DB as Postgres
    participant WM as BroadcastManager
    participant FE as Frontend (LiveCallTile)

    V->>BE: POST /webhooks (type: transcript)
    BE->>DB: UPDATE Call (list_append(live_transcript, payload))
    BE->>WM: broadcast_transcript(segment)
    WM-->>FE: { type: "transcript-update", transcript: [...] }
    FE->>FE: LiveCallTile renders new chat bubble & scrolls
```

## 7. Audio Streaming (Listen In)
Low-latency audio monitoring via Web Audio API.

```mermaid
sequenceDiagram
    participant V as vprod
    participant BE as Backend
    participant FE as Frontend (LiveAudioStreamer)

    FE->>BE: WS /ws/listen/{call_id}?token=JWT
    V->>BE: Send Audio (RTP/WS Stream)
    BE->>BE: Buffer & Conversion (if needed)
    BE-->>FE: Binary PCM Chunk (16-bit)
    FE->>FE: Web Audio API (decode & schedule play)
```

## 8. End of Call Report & Recording
Finalizing the call and securing artifacts.

```mermaid
sequenceDiagram
    participant V as vprod
    participant BE as Backend
    participant S as Supabase Storage
    participant DB as Postgres
    participant FE as Frontend

    V->>BE: POST /webhooks (type: end-of-call-report)
    BE->>S: Upload Recording File
    BE->>DB: UPDATE Call (status=ended, recording_url, final_transcript, summary)
    BE->>WM: broadcast_dashboard(call)
    WM-->>FE: { type: "call-upsert", call: { status: "ended", ... } }
    FE->>FE: Remove from Active View -> Available in Call History
```

## 9. Force Transfer Flow (Supervisor Action)
Manually taking over a call.

```mermaid
sequenceDiagram
    participant Supervisor (FE)
    participant BE as Backend
    participant V as vprod

    Supervisor->>BE: POST /api/calls/{id}/force-transfer
    BE->>BE: Verify Admin/Supervisor Permissions
    BE->>V: POST controlUrl { type: "transfer", dest: "+1..." }
    V-->>BE: 200 OK
    BE->>DB: Log "force-transfer" event
    BE-->>Supervisor: 200 OK (Success Message)
```
