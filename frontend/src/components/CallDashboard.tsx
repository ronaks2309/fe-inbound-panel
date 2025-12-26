/**
 * CallDashboard Component
 * 
 * Real-time call monitoring dashboard with WebSocket updates.
 * 
 * Structure:
 * - CallDashboard.tsx: Main component with table, WebSocket, state
 * - TranscriptModal.tsx: View call transcripts
 * - ListenModal.tsx: Live audio streaming
 * - RecordingModal.tsx: Playback recordings
 * 
 * Features:
 * - Real-time call list via WebSocket
 * - Live audio streaming (Listen button)
 * - Live transcript updates
 * - Call recording playback
 * - Force transfer to licensed agent
 */

import React, { useEffect, useState, useRef } from "react";
import { TranscriptModal } from "./TranscriptModal";
import { ListenModal } from "./ListenModal";
import { RecordingModal } from "./RecordingModal";
import { supabase } from "../lib/supabase";

const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";

export type Call = {
  id: string;
  client_id: string;
  phone_number?: string | null;
  status?: string | null;
  started_at?: string | null;
  created_at: string; // Ensure this is present
  ended_at?: string | null;
  has_listen_url?: boolean;

  user_id?: string | null;
  username?: string | null;
  duration?: number | null;

  hasTranscript?: boolean;
  hasLiveTranscript?: boolean;
  hasFinalTranscript?: boolean;  // Flag from backend
  hasRecording?: boolean;
  recording_url?: string | null;

  // NEW: transcript fields
  live_transcript?: string | null;   // incremental transcript (for active calls)
  final_transcript?: string | null;  // final transcript from end-of-call-report
  summary?: { summary: string } | null;
  detailsLoaded?: boolean; // flag to indicate if heavy fields are loaded
};


const CallDashboard: React.FC = () => {
  // STATE: useState creates reactive variables that trigger re-renders when changed
  // Pattern: [value, setValue] = useState(initialValue)
  const [calls, setCalls] = useState<Call[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [transcriptModalCallId, setTranscriptModalCallId] = useState<string | null>(null);
  const [listenModalCallId, setListenModalCallId] = useState<string | null>(null);
  const [recordingModalCallId, setRecordingModalCallId] = useState<string | null>(null);
  const [forceTransferLoadingId, setForceTransferLoadingId] = useState<string | null>(null);
  const [forceTransferMessage, setForceTransferMessage] = useState<string | null>(null);
  const [forceTransferError, setForceTransferError] = useState<string | null>(null);
  const [userInfo, setUserInfo] = useState<any>(null); // Supabase user object

  // REF: useRef stores a mutable value that persists across renders WITHOUT causing re-renders
  // Perfect for storing WebSocket connections, timers, or DOM references
  const wsRef = useRef<WebSocket | null>(null);



  // EFFECT 1: Load initial calls via HTTP depending on user info
  useEffect(() => {
    async function loadCalls() {
      if (!userInfo) return; // Wait for user info to be loaded

      const metadata = userInfo.user_metadata || {};
      const tenantId = metadata.tenant_id || "demo-client";
      const role = metadata.role || "admin";

      // Determine API URL
      // If agent, filter by their Supabase UUID (user.id) or username depending on how backend stores it
      // We will assume backend stores the Supabase User ID (UUID) if assigned
      // Or we can pass it, and if no calls match, so be it.
      let url = `${backendUrl}/api/${tenantId}/calls`;

      if (role === 'user') {
        // Pass the user's ID as user_id filter
        // Note: Backend must support this query param
        url += `?user_id=${userInfo.id}`;
      }

      console.log("Fetching calls from:", url);

      try {
        setLoading(true);
        setError(null);
        const res = await fetch(url);
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        const data = await res.json();

        // Normalize/derive flags from backend fields
        const normalized: Call[] = data.map((c: any) => ({
          id: String(c.id),
          client_id: c.client_id,
          phone_number: c.phone_number ?? c.phoneNumber ?? null,
          status: c.status ?? null,
          started_at: c.started_at ?? c.startedAt ?? null,
          created_at: c.created_at ?? new Date().toISOString(), // Fallback if missing
          ended_at: c.ended_at ?? c.endedAt ?? null,
          has_listen_url: c.hasListenUrl ?? false,

          user_id: c.user_id ?? c.userId ?? null,
          username: c.username ?? null,
          duration: c.duration ?? null,

          hasTranscript: c.hasTranscript ?? false, // Normalized from backend
          hasLiveTranscript: c.hasLiveTranscript ?? !!c.live_transcript,
          hasFinalTranscript: c.hasFinalTranscript ?? !!c.final_transcript, // NEW: from backend
          hasRecording: !!c.recording_url,

          recording_url: c.recording_url ?? c.recordingUrl ?? null,

          live_transcript: c.live_transcript ?? null,
          final_transcript: c.final_transcript ?? null,

          // If we loaded from list, details are NOT loaded yet
          detailsLoaded: false
        }));

        setCalls(normalized);
      } catch (e: any) {
        console.error("Error fetching calls:", e);
        setError(e.message || "Failed to load");
      } finally {
        setLoading(false);
      }
    }

    loadCalls();
  }, [userInfo]); // Re-run when userInfo loads

  // EFFECT: Load user info
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUserInfo(user);
      }
    });
  }, []);

  // HELPER FUNCTION: Upsert (update or insert) a call from WebSocket payload
  // This merges new data from the server with existing call data in state
  function handleCallUpsert(payload: any) {
    const c = payload.call;
    if (!c || !c.id) return;

    const newCall: Call = {
      id: String(c.id),
      client_id: payload.clientId,
      phone_number: c.phoneNumber ?? c.phone_number ?? null,
      status: c.status ?? null,
      started_at: c.startedAt ?? c.started_at ?? null,
      created_at: c.created_at ?? c.createdAt, // Allow undefined here, handle fallback in merge
      ended_at: c.endedAt ?? c.ended_at ?? null,
      has_listen_url: c.hasListenUrl ?? Boolean(c.listenUrl) ?? false,
      user_id: c.userId ?? c.user_id ?? undefined,
      username: c.username ?? undefined,
      duration: c.duration ?? undefined,
      hasTranscript:
        c.hasTranscript ?? undefined,      // backend already sends flags
      hasLiveTranscript:
        c.hasLiveTranscript ?? undefined,
      hasRecording:
        c.hasRecording ?? undefined,
      recording_url: c.recordingUrl ?? c.recording_url ?? undefined,
      final_transcript:
        c.finalTranscript ?? c.final_transcript ?? undefined,
      live_transcript:
        c.liveTranscript ?? c.live_transcript ?? undefined,
    };

    // STATE UPDATE WITH CALLBACK: Use callback pattern when new state depends on old state
    // prev => prevents race conditions by always working with the latest state
    setCalls((prev) => {
      const idx = prev.findIndex((x) => String(x.id) === newCall.id);
      if (idx === -1) {
        // Call doesn't exist - add it to the beginning of the array
        return [newCall, ...prev];
      } else {
        // Call exists - merge new data with existing data
        const old = prev[idx];
        const merged: Call = {
          ...old,
          ...newCall,
          // Merge flags
          has_listen_url: newCall.has_listen_url ?? old.has_listen_url ?? false,
          username: newCall.username ?? old.username ?? null,
          duration: newCall.duration ?? old.duration ?? null,
          user_id: newCall.user_id ?? old.user_id ?? null,
          // If newCall.created_at is defined (from backend), use it. 
          // Else keep old created_at. 
          // Fallback to new date ONLY if both are missing.
          created_at: newCall.created_at ?? old.created_at ?? new Date().toISOString(),
          hasTranscript:
            newCall.hasTranscript ?? old.hasTranscript ?? false,
          hasLiveTranscript:
            newCall.hasLiveTranscript ?? old.hasLiveTranscript ?? false,
          hasRecording:
            newCall.hasRecording ?? old.hasRecording ?? false,
          recording_url:
            newCall.recording_url ?? old.recording_url ?? null,
          final_transcript:
            newCall.final_transcript ?? old.final_transcript ?? null,
          live_transcript:
            newCall.live_transcript ?? old.live_transcript ?? null,
        };

        const copy = [...prev];
        copy[idx] = merged;
        return copy;
      }
    });

  }

  // 2.5) Helper: force transfer a call to a licensed agent
  async function handleForceTransfer(call: Call) {
    if (!call.id || !call.client_id) return;

    // TODO: later make this configurable per client
    const agentPhone = "+16504848853";

    // Only allow on live-ish calls
    const status = (call.status || "").toLowerCase();
    if (!["in-progress", "ringing", "queued"].includes(status)) {
      setForceTransferError("Force transfer is only available on live calls.");
      return;
    }

    setForceTransferLoadingId(call.id);
    setForceTransferMessage(null);
    setForceTransferError(null);

    try {
      const res = await fetch(
        `${backendUrl}/api/${call.client_id}/calls/${call.id}/force-transfer`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            agent_phone_number: agentPhone,
            content: "Transferring your call now to a licensed agent.",
          }),
        }
      );

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `HTTP ${res.status}`);
      }

      const data = await res.json();
      console.log("Force transfer success:", data);
      setForceTransferMessage(
        `Transfer requested for call ${call.id} → ${agentPhone}`
      );
    } catch (e: any) {
      console.error("Force transfer error:", e);
      setForceTransferError(
        e?.message || "Failed to request force transfer."
      );
    } finally {
      setForceTransferLoadingId(null);
    }
  }


  // EFFECT 2: WebSocket connection for real-time dashboard updates
  // This effect runs ONCE on mount and stays open until component unmounts
  useEffect(() => {
    let wsUrl = backendUrl.replace(/^http/, "ws") + "/ws/dashboard";

    // Auth: Pass user_id, role, and tenant_id if valid user
    if (userInfo && userInfo.id) {
      const metadata = userInfo.user_metadata || {};
      wsUrl += `?user_id=${userInfo.id}&role=${metadata.role || 'user'}&tenant_id=${metadata.tenant_id || 'demo-client'}`;
    }

    console.log("Connecting WebSocket to:", wsUrl);

    // Create WebSocket connection that will stay open for entire session
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws; // Store in ref so other parts of component can access it

    ws.onopen = () => {
      console.log("Dashboard WS open");
    };

    // EVENT HANDLER: This function runs every time a message arrives from the server
    // The WebSocket stays open and this listener remains active the entire time
    ws.onmessage = (event) => {
      // console.log("Dashboard WS raw message:", event.data);
      try {
        const msg = JSON.parse(event.data as string);

        if (msg.type === "call-upsert") {
          console.log("Dashboard WS call-upsert:", msg);
          handleCallUpsert(msg); // Update state with new/updated call data
        } else if (msg.type === "transcript-update") {
          console.log("Dashboard WS transcript-update:", msg);

          const callId: string = msg.callId;
          const fullTranscript: string | undefined = msg.fullTranscript;

          setCalls((prev) =>
            prev.map((c) =>
              c.id === callId
                ? {
                  ...c,
                  hasLiveTranscript: true,
                  live_transcript:
                    fullTranscript ?? c.live_transcript ?? null,
                }
                : c
            )
          );
        } else {
          console.log("Dashboard WS other message:", msg);
        }
      } catch (err) {
        console.warn("Failed to parse WS message as JSON", err);
      }
    };


    ws.onerror = (event) => {
      console.error("Dashboard WS error:", event);
    };

    ws.onclose = () => {
      console.log("Dashboard WS closed");
    };

    // CLEANUP FUNCTION: React calls this automatically when component unmounts (you leave the page)
    // This prevents memory leaks by closing the WebSocket connection
    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [userInfo]); // Re-run when userInfo loads (so we attach user_id to WS)

  // EFFECT 3: Subscribe/unsubscribe to specific call transcripts
  // This runs whenever transcriptModalCallId CHANGES (user opens/closes transcript modal)
  useEffect(() => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

    // When modal opens (transcriptModalCallId becomes a call ID), subscribe to that call
    if (transcriptModalCallId) {
      console.log(`[Dashboard] Subscribing to call ${transcriptModalCallId}`);
      wsRef.current.send(JSON.stringify({
        type: "subscribe",
        callId: transcriptModalCallId
      }));
    }

    // CLEANUP: When transcriptModalCallId changes or component unmounts, unsubscribe
    // This runs BEFORE the next subscription and when modal closes
    return () => {
      if (transcriptModalCallId && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        console.log(`[Dashboard] Unsubscribing from call ${transcriptModalCallId}`);
        wsRef.current.send(JSON.stringify({
          type: "unsubscribe",
          callId: transcriptModalCallId
        }));
      }
    };
  }, [transcriptModalCallId]); // Dependency: re-run whenever transcriptModalCallId changes



  // HELPER RENDER FUNCTION: Returns JSX (looks like HTML but it's JavaScript XML)
  // This keeps the main render clean by extracting complex UI logic into reusable pieces
  // Called inside the main render for each call row: {renderActions(c)}
  const renderActions = (c: Call) => {
    const status = (c.status || "").toLowerCase();
    const isEnded = status === "ended";
    const canForceTransfer = ["in-progress", "ringing", "queued"].includes(status);
    const isTransferring = forceTransferLoadingId === c.id;


    if (isEnded) {
      // Ended calls → Call Recording + View Transcript
      return (
        <div className="flex gap-2">
          <button
            className="inline-flex items-center rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-40"
            disabled={!c.hasRecording}
            onClick={() => {
              console.log("Call Recording clicked for", c.id);
              if (c.recording_url) {
                setRecordingModalCallId(c.id);
              }
            }}
          >
            Call Recording
          </button>
          <button
            className="inline-flex items-center rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-40"
            disabled={!c.hasFinalTranscript && !c.hasLiveTranscript}
            onClick={() => {
              console.log("View Transcript clicked for", c.id);
              setTranscriptModalCallId(c.id);
            }}
          >
            View Transcript
          </button>

        </div>
      );
    }

    // Active / pending calls → Listen, Transcript, Take Over
    return (
      <div className="flex gap-2">
        <button
          className="inline-flex items-center rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-40"
          disabled={!c.has_listen_url}
          onClick={() => {
            console.log("Listen clicked for", c.id);
            setListenModalCallId(c.id);
          }}
        >
          Listen
        </button>
        <button
          className="inline-flex items-center rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-40"
          disabled={!c.hasLiveTranscript && !c.hasTranscript}
          onClick={() => {
            console.log("Transcript clicked for", c.id);
            setTranscriptModalCallId(c.id);
          }}
        >
          Transcript
        </button>
        <button
          className="inline-flex items-center rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50"
          onClick={() => {
            console.log("Take Over clicked for", c.id);
            handleForceTransfer(c);
            // later: call backend endpoint that POSTs to Vapi controlUrl for this call
          }}
        >
          {isTransferring ? "Transferring..." : "Take Over"}
        </button>
      </div>
    );
  };

  // RENDER FUNCTION: Returns JSX (HTML-like syntax) that React converts to DOM elements
  // React re-renders this when state changes (calls, loading, error, etc.)
  return (
    <div className="min-h-screen flex flex-col items-center px-4 py-6">
      <div className="w-full max-w-6xl">
        {/* Header */}
        <header className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-baseline sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">
              Live Monitoring
            </h1>
            <p className="text-sm text-slate-500">
              Client: <span className="font-mono">{userInfo?.user_metadata?.tenant_id || 'connecting...'}</span>
            </p>
            {userInfo && (
              <p className="text-sm text-slate-500">
                Welcome: <span className="font-medium text-slate-700">{userInfo.user_metadata?.display_name || userInfo.user_metadata?.username || userInfo.email}</span>
                <span className="mx-2 text-slate-300">|</span>
                Tenant: <span className="font-medium text-slate-700">{userInfo.user_metadata?.tenant_id}</span>
                <span className="mx-2 text-slate-300">|</span>
                Role: <span className="uppercase text-xs tracking-wider bg-slate-100 text-slate-600 px-2 py-0.5 rounded ml-1">{userInfo.user_metadata?.role || 'admin'}</span>
              </p>
            )}
          </div>
          <div className="text-xs text-slate-400">
            Backend:{" "}
            <code className="bg-slate-100 px-1.5 py-0.5 rounded">
              {backendUrl}
            </code>
          </div>
        </header>

        {/* Main card */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-sm font-medium text-slate-800">
              Live Calls
            </h2>
            {loading && (
              <span className="text-xs text-slate-400">
                Loading…
              </span>
            )}
          </div>

          {/* Content */}
          <div className="p-4">
            {error && (
              <div className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                Error: {error}
              </div>
            )}

            {forceTransferMessage && (
              <p className="mt-3 text-xs text-emerald-700">
                {forceTransferMessage}
              </p>
            )}

            {forceTransferError && (
              <p className="mt-2 text-xs text-red-600">
                {forceTransferError}
              </p>
            )}


            {!loading && !error && calls.length === 0 && (
              <p className="text-sm text-slate-500">
                No calls yet. Use the debug endpoint{" "}
                <code className="bg-slate-100 px-1 py-0.5 rounded">
                  POST /api/debug/create-test-call/demo-client
                </code>{" "}
                or send real webhooks to populate this table.
              </p>
            )}

            {!loading && !error && calls.length > 0 && (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50">
                      <th className="px-3 py-2 text-left font-semibold text-slate-700">
                        Call ID
                      </th>
                      <th className="px-3 py-2 text-left font-semibold text-slate-700">
                        User
                      </th>
                      <th className="px-3 py-2 text-left font-semibold text-slate-700">
                        Phone
                      </th>
                      <th className="px-3 py-2 text-left font-semibold text-slate-700">
                        Status
                      </th>
                      <th className="px-3 py-2 text-left font-semibold text-slate-700">
                        Duration
                      </th>
                      <th className="px-3 py-2 text-left font-semibold text-slate-700">
                        Started At
                      </th>
                      <th className="px-3 py-2 text-left font-semibold text-slate-700">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {calls.map((c) => (
                      <tr
                        key={c.id}
                        className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                      >
                        <td className="px-3 py-2 font-mono text-xs text-slate-800">
                          {c.id}
                        </td>
                        <td className="px-3 py-2 text-slate-800 text-xs">
                          {c.username || c.user_id || "-"}
                        </td>
                        <td className="px-3 py-2 text-slate-800">
                          {c.phone_number || "-"}
                        </td>
                        <td className="px-3 py-2">
                          <StatusBadge status={c.status} />
                        </td>
                        <td className="px-3 py-2 text-slate-700 font-mono text-xs">
                          <DurationTimer call={c} />
                        </td>
                        <td className="px-3 py-2 text-slate-700">
                          {c.started_at
                            ? new Date(c.started_at).toLocaleString()
                            : "-"}
                        </td>
                        <td className="px-3 py-2">
                          {renderActions(c)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}


          </div>
        </div>
      </div>

      {/* Transcript Modal */}
      {transcriptModalCallId && (
        <TranscriptModal
          call={calls.find((c) => c.id === transcriptModalCallId) || null}
          onClose={() => setTranscriptModalCallId(null)}
          onCallUpdated={(updatedCall) => {
            setCalls(prev => prev.map(c => c.id === updatedCall.id ? updatedCall : c));
          }}
        />
      )}

      {/* Listen Modal */}
      {listenModalCallId && (
        <ListenModal
          call={calls.find((c) => c.id === listenModalCallId) || null}
          onClose={() => setListenModalCallId(null)}
        />
      )}

      {/* Recording Modal */}
      {recordingModalCallId && (
        <RecordingModal
          call={calls.find((c) => c.id === recordingModalCallId) || null}
          onClose={() => setRecordingModalCallId(null)}
        />
      )}


    </div>
  );

};




const StatusBadge: React.FC<{ status?: string | null }> = ({ status }) => {
  const s = (status || "").toLowerCase();

  let label = status || "unknown";
  let classes =
    "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium";

  if (s === "ringing") {
    classes += " bg-amber-50 text-amber-700 border border-amber-200";
  } else if (s === "in-progress") {
    classes += " bg-emerald-50 text-emerald-700 border border-emerald-200";
  } else if (s === "ended") {
    classes += " bg-slate-100 text-slate-700 border border-slate-200";
  } else if (s === "scheduled" || s === "queued" || s === "forwarding") {
    classes += " bg-sky-50 text-sky-700 border border-sky-200";
  } else {
    classes += " bg-slate-50 text-slate-500 border border-slate-200";
  }

  return <span className={classes}>{label}</span>;
};

const DurationTimer: React.FC<{ call: Call }> = ({ call }) => {
  const [elapsed, setElapsed] = useState<number | null>(null);

  useEffect(() => {
    // If we have a static duration (ended call), just use it
    if (call.duration !== undefined && call.duration !== null) {
      setElapsed(call.duration);
      return;
    }

    // If call is active and we have started_at, calc live
    const status = (call.status || "").toLowerCase();
    const isActive = ["in-progress", "ringing", "queued"].includes(status);

    if (isActive) {
      // Use started_at if available, otherwise fallback to created_at
      const startTimeStr = call.started_at || call.created_at;
      if (startTimeStr) {
        const start = new Date(startTimeStr).getTime();

        const interval = setInterval(() => {
          const now = Date.now();
          const diffSeconds = Math.floor((now - start) / 1000);
          setElapsed(diffSeconds > 0 ? diffSeconds : 0);
        }, 1000);

        // Initial set
        const now = Date.now();
        const diffSeconds = Math.floor((now - start) / 1000);
        setElapsed(diffSeconds > 0 ? diffSeconds : 0);

        return () => clearInterval(interval);
      }
    }

    // Fallback if ended but no duration yet (e.g. just ended before report)
    if (call.ended_at) {
      // Use started_at or created_at
      const startTimeStr = call.started_at || call.created_at;
      if (startTimeStr) {
        const start = new Date(startTimeStr).getTime();
        const end = new Date(call.ended_at).getTime();
        const diff = Math.floor((end - start) / 1000);
        setElapsed(diff > 0 ? diff : 0);
      }
    } else {
      setElapsed(null);
    }

  }, [call.status, call.started_at, call.created_at, call.ended_at, call.duration]);

  if (elapsed === null) return <span>-</span>;

  // Format HH:MM:SS
  const h = Math.floor(elapsed / 3600);
  const m = Math.floor((elapsed % 3600) / 60);
  const s = elapsed % 60;

  const fmt = (n: number) => n.toString().padStart(2, "0");

  if (h > 0) {
    return <span>{fmt(h)}:{fmt(m)}:{fmt(s)}</span>;
  }
  return <span>{fmt(m)}:{fmt(s)}</span>;
};

export default CallDashboard;
