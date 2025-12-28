import React, { useEffect, useState, useRef } from "react";
import type { Call } from "./CallDashboard";

const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";

interface TranscriptModalProps {
    call: Call | null;
    onClose: () => void;
    onCallUpdated: (updatedCall: Call) => void;
}

export const TranscriptModal: React.FC<TranscriptModalProps> = ({ call, onClose, onCallUpdated }) => {
    const [fetching, setFetching] = useState(false);
    const fetchedRef = useRef(false); // Prevents fetching multiple times

    // EFFECT: Fetch full call details when modal opens (only if not already loaded)
    // This runs when the modal mounts or when 'call' changes
    useEffect(() => {
        if (!call) return;
        if (call.detailsLoaded) return;
        if (fetchedRef.current) return;

        // Fetch full details
        fetchedRef.current = true;
        setFetching(true);
        fetch(`${backendUrl}/api/calls/${call.id}`)
            .then(res => {
                if (!res.ok) throw new Error("Failed to load details");
                return res.json();
            })
            .then(data => {
                // Merge backend data with existing call
                // Backend returns snake_case keys usually, ensure mapping matches Call interface
                const fullCall: Call = {
                    ...call,
                    ...data,
                    // Preserve WS timestamps (usually more accurate/timezone-valid) over HTTP naive ones
                    started_at: call.started_at ?? data.started_at ?? data.startedAt,
                    created_at: call.created_at ?? data.created_at ?? data.createdAt,

                    // Ensure fields map correctly if backend uses snake_case
                    live_transcript: data.live_transcript ?? data.liveTranscript,
                    final_transcript: data.final_transcript ?? data.finalTranscript,
                    summary: data.summary,
                    detailsLoaded: true
                };
                onCallUpdated(fullCall);
            })
            .catch(err => console.error("Failed to fetch call details", err))
            .finally(() => setFetching(false));

    }, [call, onCallUpdated]);

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

    // Also showing summary if available
    const summaryText = call.summary?.summary;

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
                <div className="px-4 py-3 flex-1 overflow-auto space-y-4">
                    {fetching && (
                        <div className="text-xs text-slate-500 italic">Loading full transcript...</div>
                    )}

                    {/* Summary Section */}
                    {summaryText && (
                        <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
                            <h4 className="text-xs font-semibold text-blue-900 mb-1">Summary</h4>
                            <p className="text-xs text-blue-800 leading-relaxed">{summaryText}</p>
                        </div>
                    )}

                    {text ? (
                        <pre className="whitespace-pre-wrap text-xs text-slate-800 font-mono bg-slate-50 rounded-lg p-3 border border-slate-200">
                            {text}
                        </pre>
                    ) : (
                        !fetching && (
                            <p className="text-sm text-slate-500">
                                No transcript available yet for this call.
                            </p>
                        )
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
