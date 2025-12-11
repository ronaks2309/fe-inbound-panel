# 📞 **VAPI Inbound Call Monitoring Dashboard**  
### Real-time Call Dashboard • Listen-In Audio • Live Transcripts • Force Transfer Controls

---

## ⭐ **Overview**

This project is a **multi-tenant real-time call monitoring dashboard** for voice AI agents (VAPI).  
It allows clients to:

- View live inbound calls in a real-time dashboard  
- Observe call status changes (ringing → in-progress → completed)  
- Listen to a call through VAPI’s `listenUrl` *(coming soon)*  
- View live transcripts from the VAPI WebSocket *(coming soon)*  
- Force-transfer a live call to a human agent *(coming soon)*  

The system consists of:

- 🟦 **FastAPI backend** (Python)  
- 🟩 **React + Vite + TailwindCSS** frontend  
- 🔌 **WebSocket communication** (server → dashboard)  
- 🗄️ **SQLite + SQLModel** persistence  
- 📡 **Incoming VAPI webhook route** (to be added next)

---

# 🏗️ **System Architecture**

      ┌──────────────────────────────────────────────┐
      │                    VAPI                      │
      │  (Status Webhooks + listenUrl WebSockets)    │
      └──────────────────────────────────────────────┘
                         │ (HTTP POST)
                         ▼
             ┌────────────────────────┐
             │        FastAPI         │
             │  /webhooks/vapi        │  ← incoming call events
             │  /ws/dashboard         │  ← push updates to UI
             │  /api/...              │  ← REST for frontend
             └────────────────────────┘
                         │
                         ▼
                SQLite + SQLModel ORM
           Calls, Clients, Status Events Tables

                         │
                         ▼
       ┌──────────────────────────────────────────┐
       │                React UI                  │
       │     Live Dashboard of Calls              │
       │  WebSocket Subscription to Backend       │
       │  Tailwind-styled Table + Modals          │
       └──────────────────────────────────────────┘



---

# ✔️ **Backend (FastAPI) — Completed Features**

## **1. Project scaffolding**
- FastAPI app with CORS  
- Automatic DB initialization via `SQLModel`  
- SQLite development database  

---

## **2. Database Models**

### ✔ Client  
### ✔ Call  
### ✔ CallStatusEvent *(audit log)*  

Each **Call** stores:

- `id`  
- `client_id`  
- `phone_number`  
- `status`  
- timestamps  
- `listenUrl` (coming from VAPI)  

Each **CallStatusEvent** stores:

- `call_id`  
- `status`  
- optional `payload`  
- timestamp  

---

## **3. WebSocket Manager**

Backend WebSocket at:/ws/dashboard

Supports:

- Multiple dashboard clients  
- Broadcasting `"call-upsert"` events in real-time  
- Auto-cleaning dead sockets  
- Multi-tenant grouping via `clientId`

---

## **4. Debug / Development API Endpoints**

### ✔ POST `/api/debug/create-test-call/{client_id}`
- Accepts optional `call_id`
- Generates one if missing
- UPSERTs into `Call`
- Logs a `CallStatusEvent`
- Broadcasts WebSocket update to UI

### ✔ POST `/api/debug/log-status-event/{client_id}/{call_id}`
- Insert a manual status event for testing

### ✔ GET `/api/debug/status-events/{client_id}/{call_id}`
- Retrieve chronological event list for a call

### ✔ GET `/api/{client_id}/calls`
- Loads calls for dashboard bootstrap

Backend is mature and ready for real VAPI integration.

---

# ✔️ **Frontend (React + Vite + TailwindCSS) — Completed Features**

## **1. TailwindCSS v4 Installed (Vite Plugin Method)**

Using:

```ts
import tailwindcss from "@tailwindcss/vite"
@import "tailwindcss";

```

## **2. CallDashboard Component**

**Features:**
- Fully styled Tailwind UI  
- Table of calls  
- Status badges  
- Real-time updates via WebSocket  
- Bootstrap via REST API  
- Ready UI placeholders for **Listen** + **Force Transfer**  

---

## **3. WebSocket Live Sync**

Frontend connects to: ws://localhost:8000/ws/dashboard

Receives messages:

```json
{
  "type": "call-upsert",
  "clientId": "demo-client",
  "call": { ... }
}
```

## **UI Logic**
- Inserts new row if call ID is new  
- Updates row *in-place* for status changes  
- Avoids duplicates  

---

# ⭐ **Project Progress Summary**

| Feature                     | Status |
|-----------------------------|--------|
| Database models             | ✔ Completed |
| REST APIs                  | ✔ Completed |
| Call UPSERT logic           | ✔ Completed |
| Status event audit log      | ✔ Completed |
| WebSocket infrastructure    | ✔ Completed |
| React dashboard UI          | ✔ Completed |
| TailwindCSS integration     | ✔ Completed |
| VAPI webhook handler        | ⏳ Pending |
| Listen modal + transcript   | ⏳ Pending |
| Force transfer action       | ⏳ Pending |
| Multi-tenant filtering      | ⏳ Optional Next |
| Production deployment       | ⏳ Optional Next |

### **Current completion:** ~**65%**  
The foundation is rock solid — only the VAPI-specific behaviors remain.

---

# 🚧 **Pending Work (Roadmap)**

---

## 🟦 **Step 11 — VAPI Webhook Integration**

Implement endpoint: POST /webhooks/vapi/{client_id}

Must handle VAPI events:

- `incoming`
- `ringing`
- `in-progress`
- `assistant-speaking`
- `assistant-listening`
- `completed`
- `listenUrl` extraction
- `controlUrl` extraction

This step will:

- UPSERT into database  
- Log `CallStatusEvent`  
- Broadcast `"call-upsert"` to dashboard  

---

## 🟦 **Step 12 — Listen Modal + Live Transcript Viewer**

### **Audio**
- Connect to `listenUrl` WebSocket  
- Decode **PCM or Opus**  
- Play via **WebAudio API**  
- Close & cleanup safely

### **Transcript**
Parse frames like:

```json
{ "type": "transcript", "transcript": "..." }
```

### **Transcript Handling Logic**

After receiving transcript frames:

- Append transcript lines  
- Auto-scroll  
- Optionally attach timestamps  

---

### **UI Requirements**

- Modal container  
- Call details panel  
- Transcript pane  
- Optional: audio activity indicator  

---

## 🟦 **Step 13 — Add Force Transfer Button**

### When clicked:
Send to `controlUrl`:

```json
{ "action": "transfer", "phoneNumber": "<agent>" }
```

### Then:
- Update dashboard row  
- Log status event  

---

## 🟦 **Step 14 — Multi-Tenant Dashboard**

### **Endpoints**
/ws/dashboard?client_id=X

/api/{client_id}/calls


### **Adds Support For**
- Isolated dashboards per client  
- Per-client API keys / authentication  

---

## 🟦 **Step 15 — Deployment (Optional)**

### **Hosting Options**
- Railway.app  
- Render  
- Fly.io  
- AWS ECS  

---

### **Database Upgrade**
Recommended for production:

- **SQLite → PostgreSQL**

---


