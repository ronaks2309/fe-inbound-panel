import React, { useState, useEffect } from "react";
import type { Call } from "./CallDashboard";

const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";


type RecordingModalProps = {
    call: Call | null;
    onClose: () => void;
};

export const RecordingModal: React.FC<RecordingModalProps> = ({ call, onClose }) => {
    const [audioSrc, setAudioSrc] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!call) return;

        let active = true;

        if (call.recording_url && call.recording_url.startsWith("http")) {
            // Legacy / Public URL
            setAudioSrc(call.recording_url);
            return;
        }

        // Fetch secure signed URL
        setLoading(true);
        setError(null);

        fetch(`${backendUrl}/api/calls/${call.id}/recording`)
            .then(res => {
                if (!res.ok) throw new Error("Failed to load recording");
                return res.json();
            })
            .then(data => {
                if (active && data.url) {
                    setAudioSrc(data.url);
                }
            })
            .catch(err => {
                if (active) setError("Could not load recording.");
                console.error(err);
            })
            .finally(() => {
                if (active) setLoading(false);
            });

        return () => { active = false; };
    }, [call]);

    if (!call) return null;

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

                <div className="flex flex-col items-center gap-4 py-4 min-h-[100px] justify-center">
                    {loading && <div className="text-sm text-slate-500">Generating secure link...</div>}
                    {error && <div className="text-sm text-red-500">{error}</div>}

                    {!loading && !error && audioSrc && (
                        <>
                            <audio controls autoPlay src={audioSrc} className="w-full" />

                            <div className="w-full mt-2">
                                <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1 block">
                                    Secure Link (Expires in 24h)
                                </label>
                                <div className="p-2 bg-slate-50 border border-slate-200 rounded text-[10px] text-slate-600 break-all font-mono select-all cursor-text">
                                    {audioSrc}
                                </div>
                            </div>
                        </>
                    )}
                    {!loading && !error && !audioSrc && (
                        <div className="text-sm text-slate-400">No recording available.</div>
                    )}
                </div>
            </div>
        </div>
    );
};
