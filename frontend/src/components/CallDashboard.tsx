import React, { useEffect, useState, useRef } from "react";

const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";

export type Call = {
  id: string;
  client_id: string;
  phone_number?: string | null;
  status?: string | null;
  started_at?: string | null;
  ended_at?: string | null;
  has_listen_url?: boolean;

  hasTranscript?: boolean;
  hasLiveTranscript?: boolean;
  hasRecording?: boolean;
  recording_url?: string | null;

  // NEW: transcript fields
  live_transcript?: string | null;   // incremental transcript (for active calls)
  final_transcript?: string | null;  // final transcript from end-of-call-report
};


const CallDashboard: React.FC = () => {
  const [calls, setCalls] = useState<Call[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [transcriptModalCallId, setTranscriptModalCallId] = useState<string | null>(null);
  const [listenModalCallId, setListenModalCallId] = useState<string | null>(null);
  const [recordingModalCallId, setRecordingModalCallId] = useState<string | null>(null);
  const [forceTransferLoadingId, setForceTransferLoadingId] = useState<string | null>(null);
  const [forceTransferMessage, setForceTransferMessage] = useState<string | null>(null);
  const [forceTransferError, setForceTransferError] = useState<string | null>(null);

  // WebSocket ref for subscriptions
  const wsRef = useRef<WebSocket | null>(null);



  // 1) Load initial calls via HTTP
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

        // Normalize/derive flags from backend fields
        const normalized: Call[] = data.map((c: any) => ({
          id: String(c.id),
          client_id: c.client_id,
          phone_number: c.phone_number ?? c.phoneNumber ?? null,
          status: c.status ?? null,
          started_at: c.started_at ?? c.startedAt ?? null,
          ended_at: c.ended_at ?? c.endedAt ?? null,
          has_listen_url: c.hasListenUrl ?? Boolean(c.listen_url) ?? false,
          hasTranscript:
            c.hasTranscript ?? Boolean(c.final_transcript),
          hasLiveTranscript:
            c.hasLiveTranscript ?? Boolean(c.live_transcript),
          hasRecording:
            c.hasRecording ?? Boolean(c.recording_url),
          recording_url: c.recording_url ?? c.recordingUrl ?? null,
          live_transcript: c.live_transcript ?? null,
          final_transcript: c.final_transcript ?? null,
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
  }, []);

  // 2) Helper: upsert a call into state by id from WS payload
  function handleCallUpsert(payload: any) {
    const c = payload.call;
    if (!c || !c.id) return;

    const newCall: Call = {
      id: String(c.id),
      client_id: payload.clientId,
      phone_number: c.phoneNumber ?? c.phone_number ?? null,
      status: c.status ?? null,
      started_at: c.startedAt ?? c.started_at ?? null,
      ended_at: c.endedAt ?? c.ended_at ?? null,
      has_listen_url: c.hasListenUrl ?? Boolean(c.listenUrl) ?? false,
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

    setCalls((prev) => {
      const idx = prev.findIndex((x) => String(x.id) === newCall.id);
      if (idx === -1) {
        return [newCall, ...prev];
      } else {
        const old = prev[idx];
        const merged: Call = {
          ...old,
          ...newCall,
          // Merge flags
          has_listen_url: newCall.has_listen_url ?? old.has_listen_url ?? false,
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


  // 3) WebSocket: listen for call-upsert events
  useEffect(() => {
    const wsUrl = backendUrl.replace(/^http/, "ws") + "/ws/dashboard";
    console.log("Connecting WebSocket to:", wsUrl);

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("Dashboard WS open");
    };

    ws.onmessage = (event) => {
      // console.log("Dashboard WS raw message:", event.data);
      try {
        const msg = JSON.parse(event.data as string);

        if (msg.type === "call-upsert") {
          console.log("Dashboard WS call-upsert:", msg);
          handleCallUpsert(msg);
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

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, []);

  // 4) Subscription management for transcript
  useEffect(() => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

    if (transcriptModalCallId) {
      console.log(`[Dashboard] Subscribing to call ${transcriptModalCallId}`);
      wsRef.current.send(JSON.stringify({
        type: "subscribe",
        callId: transcriptModalCallId
      }));
    }

    return () => {
      if (transcriptModalCallId && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        console.log(`[Dashboard] Unsubscribing from call ${transcriptModalCallId}`);
        wsRef.current.send(JSON.stringify({
          type: "unsubscribe",
          callId: transcriptModalCallId
        }));
      }
    };
  }, [transcriptModalCallId]);



  // 4) Render per-call actions based on status + flags
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
            disabled={!c.hasTranscript && !c.hasLiveTranscript}
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

  // 5) Main render
  return (
    <div className="min-h-screen flex flex-col items-center px-4 py-6">
      <div className="w-full max-w-6xl">
        {/* Header */}
        <header className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-baseline sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">
              Vapi Live Dashboard
            </h1>
            <p className="text-sm text-slate-500">
              Client: <span className="font-mono">demo-client</span>
            </p>
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
                or send real Vapi webhooks to populate this table.
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
                        Phone
                      </th>
                      <th className="px-3 py-2 text-left font-semibold text-slate-700">
                        Status
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
                        <td className="px-3 py-2 text-slate-800">
                          {c.phone_number || "-"}
                        </td>
                        <td className="px-3 py-2">
                          <StatusBadge status={c.status} />
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
            x

          </div>
        </div>
      </div>

      {/* Transcript Modal */}
      {transcriptModalCallId && (
        <TranscriptModal
          call={calls.find((c) => c.id === transcriptModalCallId) || null}
          onClose={() => setTranscriptModalCallId(null)}
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


type TranscriptModalProps = {
  call: Call | null;
  onClose: () => void;
};

const TranscriptModal: React.FC<TranscriptModalProps> = ({ call, onClose }) => {
  if (!call) return null;

  const status = (call.status || "").toLowerCase();
  const isEnded = status === "ended" || status === "completed";

  // Prefer final transcript if ended; otherwise live transcript
  let text = "";
  if (isEnded && call.final_transcript) {
    // For finished calls, always show FINAL transcript if we have it
    text = call.final_transcript;
  } else if (call.live_transcript) {
    // For active calls, prefer live transcript
    text = call.live_transcript;
  } else if (call.final_transcript) {
    // Fallback: if only final exists
    text = call.final_transcript;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-2xl bg-white rounded-xl shadow-xl border border-slate-200 flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              Transcript – <span className="font-mono text-xs">{call.id}</span>
            </h3>
            <p className="text-xs text-slate-500">
              {call.phone_number || "Unknown number"} · Status:{" "}
              <span className="font-medium">{call.status || "unknown"}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-xs px-2 py-1 rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50"
          >
            Close
          </button>
        </div>

        {/* Body */}
        <div className="px-4 py-3 flex-1 overflow-auto">
          {text ? (
            <pre className="whitespace-pre-wrap text-xs text-slate-800 font-mono bg-slate-50 rounded-lg p-3 border border-slate-200">
              {text}
            </pre>
          ) : (
            <p className="text-sm text-slate-500">
              No transcript available yet for this call.
            </p>
          )}
        </div>

        {/* Footer (optional) */}
        <div className="px-4 py-2 border-t border-slate-100 flex justify-between items-center">
          <span className="text-[11px] text-slate-400">
            Live transcript updates will appear here automatically while the call is active.
          </span>
          <button
            onClick={onClose}
            className="text-xs px-2.5 py-1 rounded-md bg-slate-900 text-white hover:bg-slate-800"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};


type ListenModalProps = {
  call: Call | null;
  onClose: () => void;
};

const ListenModal: React.FC<ListenModalProps> = ({ call, onClose }) => {
  const [wsStatus, setWsStatus] = React.useState<
    "idle" | "connecting" | "open" | "closed" | "error"
  >("idle");
  const [bytesReceived, setBytesReceived] = React.useState<number>(0);
  const [audioError, setAudioError] = React.useState<string | null>(null);
  // NEW: keeps track of where in the AudioContext timeline
  // the *next* chunk should be scheduled.
  const playHeadRef = React.useRef<number | null>(null);

  // Effect: open WebSocket to call.listen_url and play audio
  React.useEffect(() => {
    if (!call || !call.has_listen_url) {
      setWsStatus("error");
      setAudioError("No listen URL available for this call.");
      return;
    }

    console.log("[ListenModal] Connecting to listenUrl for:", call.id);

    const AudioCtx =
      (window as any).AudioContext || (window as any).webkitAudioContext;

    if (!AudioCtx) {
      setWsStatus("error");
      setAudioError("Web Audio API is not supported in this browser.");
      return;
    }

    // Vapi default PCM WS = 16kHz, 16-bit, mono
    const SAMPLE_RATE = 32000;

    const audioCtx = new AudioCtx({ sampleRate: SAMPLE_RATE });
    playHeadRef.current = null; // reset playhead for this session

    // --- NEW: audio processing nodes ---
    // Gentle low-pass filter to tame harsh highs
    const filterNode = audioCtx.createBiquadFilter();
    filterNode.type = "lowpass";
    // You can experiment: 5000–8000 Hz. Start with 6000:
    filterNode.frequency.value = 6000;
    filterNode.Q.value = 0.7;

    // Slight gain reduction to avoid harshness/clipping
    const gainNode = audioCtx.createGain();
    gainNode.gain.value = 0.8;

    // Connect processing chain to destination once
    filterNode.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    let totalBytes = 0;
    let ws: WebSocket | null = null;

    setWsStatus("connecting");

    try {
      // Use backend proxy instead of direct VAPI URL
      const wsUrl = backendUrl.replace(/^http/, "ws") + `/ws/listen/${call.id}`;
      console.log("[ListenModal] Connecting to proxy:", wsUrl);
      ws = new WebSocket(wsUrl);
      ws.binaryType = "arraybuffer";
    } catch (err) {
      console.error("[ListenModal] Failed to open WS:", err);
      setWsStatus("error");
      setAudioError("Failed to open WebSocket connection.");
      audioCtx.close();
      return;
    }

    ws.onopen = async () => {
      console.log("[ListenModal] WS open");
      setWsStatus("open");
      try {
        await audioCtx.resume();
      } catch (e) {
        console.warn("[ListenModal] audioCtx.resume() failed:", e);
      }
    };

    ws.onmessage = (event) => {
      if (typeof event.data === "string") {
        // Text frame (metadata)
        try {
          const msg = JSON.parse(event.data);
          console.log("[ListenModal] text frame:", msg);
        } catch {
          console.log("[ListenModal] text frame (raw):", event.data);
        }
        return;
      }

      // ---- Binary audio frame ----
      const buf = event.data as ArrayBuffer;
      const int16 = new Int16Array(buf);

      totalBytes += buf.byteLength;
      setBytesReceived(totalBytes);

      try {
        const frameCount = int16.length;
        const audioBuffer = audioCtx.createBuffer(
          1,           // mono
          frameCount,  // number of frames
          SAMPLE_RATE
        );

        const channelData = audioBuffer.getChannelData(0);
        for (let i = 0; i < frameCount; i++) {
          channelData[i] = int16[i] / 32768; // 16-bit PCM -> float
        }

        const source = audioCtx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(filterNode);

        // ---- Smooth scheduling: queue chunks back-to-back ----
        const now = audioCtx.currentTime;
        if (playHeadRef.current === null || playHeadRef.current < now) {
          // first chunk or we've fallen behind → start from "now"
          playHeadRef.current = now;
        }

        const startTime = playHeadRef.current;
        const duration = audioBuffer.duration;

        // Schedule this chunk
        source.start(startTime);

        // Advance playhead for next chunk
        playHeadRef.current = startTime + duration;
      } catch (e) {
        console.error("[ListenModal] Error decoding/playing audio:", e);
        setAudioError("Error while decoding or playing audio.");
      }
    };

    ws.onerror = (ev) => {
      console.error("[ListenModal] WS error:", ev);
      setWsStatus("error");
    };

    ws.onclose = () => {
      console.log("[ListenModal] WS closed");
      setWsStatus("closed");
    };


    return () => {
      console.log("[ListenModal] cleanup → closing WS + AudioContext");
      try {
        ws && ws.close();
      } catch { }
      try {
        filterNode.disconnect();
        gainNode.disconnect();
      } catch { }
      try {
        audioCtx.close();
      } catch { }
      playHeadRef.current = null;
    };

  }, [call?.id, call?.has_listen_url]);


  if (!call) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-lg bg-white rounded-xl shadow-xl border border-slate-200 flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              Listening –{" "}
              <span className="font-mono text-xs">{call.id}</span>
            </h3>
            <p className="text-xs text-slate-500">
              {call.phone_number || "Unknown number"} · Status:{" "}
              <span className="font-medium">{call.status || "unknown"}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-xs px-2 py-1 rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50"
          >
            Close
          </button>
        </div>

        {/* Body */}
        <div className="px-4 py-3 flex-1 space-y-3 text-sm text-slate-700">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500">WebSocket status:</span>
            <span className="text-xs font-mono">
              {wsStatus} {bytesReceived > 0 && `· ${bytesReceived} bytes`}
            </span>
          </div>

          {audioError && (
            <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-800">
              {audioError}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="text-xs px-2.5 py-1 rounded-md bg-slate-900 text-white hover:bg-slate-800"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};





type RecordingModalProps = {
  call: Call | null;
  onClose: () => void;
};

const RecordingModal: React.FC<RecordingModalProps> = ({ call, onClose }) => {
  if (!call || !call.recording_url) return null;

  // If the URL is relative, prepend backendUrl. 
  // If it's absolute (starts with http), leave it.
  const isAbsolute = call.recording_url.startsWith("http");
  const src = isAbsolute
    ? call.recording_url
    : `${backendUrl}${call.recording_url.startsWith("/") ? "" : "/"}${call.recording_url}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md bg-white rounded-xl shadow-xl border border-slate-200 flex flex-col p-4">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900">
            Recording – <span className="font-mono text-xs">{call.id}</span>
          </h3>
          <button
            onClick={onClose}
            className="text-xs px-2 py-1 rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50"
          >
            Close
          </button>
        </div>

        <div className="flex flex-col items-center gap-4 py-4">
          <audio controls autoPlay src={src} className="w-full" />
          <p className="text-xs text-slate-500 break-all text-center">
            {src}
          </p>
        </div>
      </div>
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

export default CallDashboard;
