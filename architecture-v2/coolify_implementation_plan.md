# Architecture Upgrade: The "Pro" Path (Ubuntu + Coolify)

You chose to convert your PC into a dedicated server. **This is the best decision for a stable, long-term setup.**
As a new coder, this is a great learning experience. It sounds scary ("wipe the disk"), but the actual steps are just clicking "Next" in an installer.

## 🚀 The Plan for Your Home Server

### Phase 1: The "OS Switch" (User Action)
*   [ ] **Create Installer**: Download "Ubuntu Server 24.04 LTS" ISO and "Rufus" (to make a bootable USB).
*   [ ] **Install**: Plug USB into server, boot from it, select "Erase Disk and Install Ubuntu".
*   [ ] **Advice**: Choose "Install OpenSSH Server" when asked (so you can control it from your laptop).

### Phase 2: Install Coolify
Once Ubuntu is running, you run **one command**:
*   `curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash`
*   **Result**: A powerful web dashboard running at `http://<server-ip>:8000`.

### Phase 3: Setup Supabase (via Coolify)
*   [ ] In Coolify, click "+ Service" -> "Supabase".
*   [ ] It spins up Postgres, Auth, and Realtime automatically.
*   [ ] **Save the Credentials**: Connection String, API URL, Anon Key.

### Phase 4: Deploy Your App
Since we already created the `Dockerfiles` and `requirements.txt`, deployment is easy:
*   [ ] Push your latest code to GitHub.
*   [ ] In Coolify: "+ Project" -> "GitHub" -> Select this repo.
*   [ ] Set Environment Variables in Coolify:
    *   `DATABASE_URL`: (From Phase 3)
    *   `VITE_BACKEND_URL`: (Your server's domain/IP)
*   [ ] Click "Deploy".

---

## Technical Details

### Backend Configuration (Coolify)
- **Build Pack**: Dockerfile
- **Docker Compose Location**: `backend/Dockerfile`
- **Port**: 8000

### Frontend Configuration (Coolify)
- **Build Pack**: Dockerfile
- **Docker Compose Location**: `frontend/Dockerfile`
- **Port**: 80
