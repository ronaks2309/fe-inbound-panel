# How Routing Works (Chaos Control) 🚦

You are absolutely right to ask this! It can be confusing.
Here is the short answer: **Users will NEVER see your Coolify dashboard.** They will only see your React App.

## The Magic of "Domains"
In Coolify, you assign a **different domain** to each thing.

1.  **Coolify Dashboard**: You explicitly assign this to `admin.ronak-app.com`.
    *   **Who sees this?**: ONLY YOU.
2.  **frontend (React)**: You assign this to `ronak-app.com`.
    *   **Who sees this?**: YOUR USERS.
3.  **backend (FastAPI)**: You assign this to `api.ronak-app.com`.
    *   **Who sees this?**: Your Frontend (strictly speaking).

## Visualizing the Traffic
Even though everything is running on **One Server**, the "Reverse Proxy" (Traefik) sorts the mail.

```mermaid
graph TD
    User((User 🌍))
    Admin((You 👨‍💻))
    Cloudflare[Cloudflare Tunnel]

    subgraph "Your Home Server (Ubuntu)"
        Proxy[Reverse Proxy (Traefik)]
        
        subgraph "Internal Network (Docker)"
            Coolify[Coolify Dashboard]
            Frontend[React App (Port 80)]
            Backend[FastAPI (Port 8000)]
        end
    end

    User -- requests "ronak-app.com" --> Cloudflare
    Admin -- requests "admin.ronak-app.com" --> Cloudflare

    Cloudflare --> Proxy

    Proxy -- "Host is admin..." --> Coolify
    Proxy -- "Host is ronak-app.com" --> Frontend
    Proxy -- "Host is api.ronak-app.com" --> Backend
```

## What happens to `localhost:8000`?
*   **On your laptop**: You accept traffic on `localhost:8000`.
*   **On the Server**: Docker containers talk to each other internally.
    *   The `Frontend` container talks to `Backend` container via an internal URL (e.g., `http://backend:8000`).
    *   The **Outside World** doesn't hit port 8000 directly. They hit `api.ronak-app.com` (Port 443), and Coolify forwards it to port 8000 inside the container.

## Summary
*   **Users** go to `ronak-app.com` -> See React.
*   **You** go to `admin.ronak-app.com` -> See Coolify.
*   **Nobody** sees the raw ports or the wrong interface.
