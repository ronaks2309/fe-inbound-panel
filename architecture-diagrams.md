# Architecture Diagrams (Mermaid)

You can embed these in Markdown (GitHub supports Mermaid now), or use any Mermaid editor (like mermaid.live) to visualize.

## 3.1 High-Level Component Diagram
graph TD
  subgraph VAPI
    VapiWebhook[Status Webhook\n(HTTP POST)]
    VapiListen[listenUrl\nWebSocket]
    VapiControl[controlUrl\nHTTP POST]
  end

  subgraph Backend[FastAPI Backend]
    WebhookEndpoint[/POST /webhooks/vapi/{client_id}/]
    CallsAPI[/GET /api/{client_id}/calls/]
    DebugAPI[/Debug APIs/]
    DashboardWS[/WS /ws/dashboard/]
    DB[(SQLite / Postgres)]
  end

  subgraph Frontend[React + Vite + Tailwind]
    DashboardUI[CallDashboard\n(React Component)]
    ListenModal[Listen Modal\nAudio + Transcript]
  end

  VapiWebhook --> WebhookEndpoint
  WebhookEndpoint --> DB
  DebugAPI --> DB
  CallsAPI --> DB

  DB --> DashboardWS
  DashboardWS --> DashboardUI

  DashboardUI --> DashboardWS
  DashboardUI --> CallsAPI

  ListenModal --> VapiListen
  DashboardUI --> VapiControl

# 3.2 Sequence – Status Update Flow
sequenceDiagram
  participant V as VAPI
  participant B as Backend (FastAPI)
  participant DB as Database
  participant W as WS /ws/dashboard
  participant F as Frontend Dashboard

  V->>B: POST /webhooks/vapi/{client_id}\n{ status, call.id, listenUrl, ... }
  B->>DB: UPSERT Call + INSERT CallStatusEvent
  B->>W: broadcast { type: "call-upsert", call: {...} }
  W-->>F: call-upsert message (WebSocket)
  F->>F: update or insert row in CallDashboard

# 3.3 Sequence – Listen + Transcript
sequenceDiagram
  participant F as Frontend (Listen Modal)
  participant V as VAPI listenUrl WS

  F->>V: Open WebSocket (listenUrl)
  V-->>F: Binary audio frames (PCM/Opus)
  V-->>F: JSON transcript frames
  F->>F: Decode & play audio (WebAudio API)
  F->>F: Append transcript, auto-scroll
  F->>V: Close WebSocket on modal close