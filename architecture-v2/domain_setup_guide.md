# Making Your Home Server Public 🌐

So you have your server running Ubuntu + Coolify at home. Right now, only devices on your WiFi can see it.
To let clients access it from the internet (e.g., `app.yourdomain.com`), you have two main options.

## Option 1: Cloudflare Tunnels (⭐ Recommended)
This is the modern, secure way to host from home.
*   **How it works**: You install a small "connector" on your server. It dials *out* to Cloudflare. Users request your site -> Cloudflare -> Your Server.
*   **Pros**:
    *   **No Port Forwarding**: You don't need to touch your router settings.
    *   **Secure**: Your home IP address stays hidden.
    *   **Dynamic IP Proof**: If your ISP changes your home IP, the tunnel is unaffected.
*   **Cost**: Free.

### Visual Flow
`User` -> `app.ronak.com` (Cloudflare) -> `Secure Tunnel` -> `Your Server (Coolify)`

---

## Option 2: Port Forwarding (The "Old School" Way)
*   **How it works**: You tell your home router: "Any traffic hitting my public IP on port 80/443, send it to my server."
*   **Pros**: No middleman.
*   **Cons**:
    *   **Security**: Scanners can see your home IP and attack your server directly.
    *   **Hard to Manage**: If your ISP changes your IP (which they do often), your site goes down until you update DNS or use "Dynamic DNS".

---

## 🚀 The detailed "Cloudflare Tunnel" Strategy

### Step 1: Buy a Domain
*   Go to **Namesilo**, **Namecheap**, or **Cloudflare** directly.
*   Buy something simple like `ronak-app.com`. (~$10/year).

### Step 2: Connect to Cloudflare
1.  Create a free Cloudflare account.
2.  Add your website (domain).
3.  Go to **Zero Trust** -> **Networks** -> **Tunnels**.
4.  Click "Create a Tunnel". It will give you a **One-Line Command**.

### Step 3: Run on Server
*   Copy that command and run it on your Ubuntu server terminal.
*   *Boom.* Your server is now connected to Cloudflare.

### Step 4: Map Domains (The Magic Part)
*   In Cloudflare Tunnel dashboard:
    *   Add Public Hostname: `app.ronak-app.com`
    *   Service: `HTTP://localhost:8000` (This points to Coolify!)
*   Now, anyone in the world visiting `app.ronak-app.com` sees your Coolify dashboard securely.

---

## Summary
1.  **Don't open ports** on your router (unsafe).
2.  **Buy a domain** ($10).
3.  **Use Cloudflare Tunnels** (Free) to safely route traffic to your Coolify instance.
