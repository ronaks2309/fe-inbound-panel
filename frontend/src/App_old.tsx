import { useEffect, useState } from "react";

const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";

type Call = {
  id: string;
  client_id: string;
  phone_number?: string | null;
  status?: string | null;
  started_at?: string | null;
};

function App() {
  const [calls, setCalls] = useState<Call[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // 1) Existing: load initial calls via HTTP
  useEffect(() => {
    async function loadCalls() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`${backendUrl}/api/demo-client/calls`);
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        const data = await res.json();
        setCalls(data);
      } catch (e: any) {
        console.error("Error fetching calls:", e);
        setError(e.message || "Failed to load");
      } finally {
        setLoading(false);
      }
    }

    loadCalls();
  }, []);


  // 2) NEW: connect to WebSocket and log messages
  useEffect(() => {
    const wsUrl = backendUrl.replace(/^http/, "ws") + "/ws/dashboard";
    console.log("Connecting WebSocket to:", wsUrl);

    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log("Dashboard WS open");
    };

    ws.onmessage = (event) => {
      console.log("Dashboard WS message:", event.data);
    };

    ws.onerror = (event) => {
      console.error("Dashboard WS error:", event);
    };

    ws.onclose = () => {
      console.log("Dashboard WS closed");
    };

    // cleanup when component unmounts / reloads
    return () => {
      ws.close();
    };
  }, []);

  
  return (
    <div style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h1 style={{ fontSize: "1.75rem", marginBottom: "1rem" }}>
        Vapi Live Dashboard – demo-client
      </h1>

      <p style={{ marginBottom: "1rem", color: "#555" }}>
        Backend: <code>{backendUrl}</code>
      </p>

      {loading && <p>Loading calls…</p>}
      {error && <p style={{ color: "red" }}>Error: {error}</p>}

      {!loading && !error && calls.length === 0 && (
        <p>No calls found. Try creating a debug call from /docs.</p>
      )}

      {!loading && !error && calls.length > 0 && (
        <table style={{ borderCollapse: "collapse", width: "100%", maxWidth: "800px" }}>
          <thead>
            <tr>
              <th style={thStyle}>ID</th>
              <th style={thStyle}>Phone</th>
              <th style={thStyle}>Status</th>
              <th style={thStyle}>Started At</th>
            </tr>
          </thead>
          <tbody>
            {calls.map((c) => (
              <tr key={c.id}>
                <td style={tdStyle}>{c.id}</td>
                <td style={tdStyle}>{c.phone_number || "-"}</td>
                <td style={tdStyle}>{c.status || "-"}</td>
                <td style={tdStyle}>
                  {c.started_at ? new Date(c.started_at).toLocaleString() : "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

const thStyle: React.CSSProperties = {
  borderBottom: "1px solid #ccc",
  padding: "0.5rem",
  textAlign: "left",
};

const tdStyle: React.CSSProperties = {
  borderBottom: "1px solid #eee",
  padding: "0.5rem",
};

export default App;
