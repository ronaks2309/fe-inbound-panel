import React from "react";
import { supabase } from "../lib/supabase";
import type { Call } from "./CallDashboard";

const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";


type ListenModalProps = {
    call: Call | null;
    onClose: () => void;
};

export const ListenModal: React.FC<ListenModalProps> = ({ call, onClose }) => {
    const [wsStatus, setWsStatus] = React.useState<
        "idle" | "connecting" | "open" | "closed" | "error"
    >("idle");
    const [bytesReceived, setBytesReceived] = React.useState<number>(0);
    const [audioError, setAudioError] = React.useState<string | null>(null);
    // NEW: keeps track of where in the AudioContext timeline
    // the *next* chunk should be scheduled.
    const playHeadRef = React.useRef<number | null>(null);

    // EFFECT: Set up WebSocket for live audio streaming when modal opens
    // Dependencies: [call] - runs when modal opens with a new call
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

        const connectWs = async () => {
            setWsStatus("connecting");

            try {
                const { data: { session } } = await supabase.auth.getSession();
                const token = session?.access_token;

                if (!token) {
                    setWsStatus("error");
                    setAudioError("Authentication failed (no token).");
                    return;
                }

                // Use backend proxy instead of direct VAPI URL
                const wsUrl = backendUrl.replace(/^http/, "ws") + `/ws/listen/${call.id}?token=${token}`;


                ws = new WebSocket(wsUrl);
                ws.binaryType = "arraybuffer";

                // Re-attach handlers since ws is new
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
                        const audioBuffer = audioCtx.createBuffer(1, frameCount, SAMPLE_RATE);
                        const channelData = audioBuffer.getChannelData(0);
                        for (let i = 0; i < frameCount; i++) {
                            channelData[i] = int16[i] / 32768;
                        }

                        const source = audioCtx.createBufferSource();
                        source.buffer = audioBuffer;
                        source.connect(filterNode);

                        const now = audioCtx.currentTime;
                        if (playHeadRef.current === null || playHeadRef.current < now) {
                            playHeadRef.current = now;
                        }

                        const startTime = playHeadRef.current;
                        const duration = audioBuffer.duration;
                        source.start(startTime);
                        playHeadRef.current = startTime + duration;
                    } catch (e) {
                        console.error("[ListenModal] Error decoding audio:", e);
                        setAudioError("Error decoding audio.");
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

            } catch (err) {
                console.error("[ListenModal] Failed to open WS:", err);
                setWsStatus("error");
                setAudioError("Failed to open WebSocket connection.");
                try { audioCtx.close(); } catch { }
            }
        };

        connectWs();



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
