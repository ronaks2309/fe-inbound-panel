import React from "react";

const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";

export type Call = {
    id: string;
    client_id: string;
    phone_number?: string | null;
    status?: string | null;
    started_at?: string | null;
    created_at: string;
    ended_at?: string | null;
    has_listen_url?: boolean;
    hasTranscript?: boolean;
    hasLiveTranscript?: boolean;
    hasRecording?: boolean;
    recording_url?: string | null;
    live_transcript?: string | null;
    final_transcript?: string | null;
    summary?: { summary: string } | null;
    detailsLoaded?: boolean;
};

type RecordingModalProps = {
    call: Call | null;
    onClose: () => void;
};

export const RecordingModal: React.FC<RecordingModalProps> = ({ call, onClose }) => {
    if (!call || !call.recording_url) return null;

    // Always assume relative URL and prepend backendUrl
    const src = `${backendUrl}${call.recording_url}`;

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
