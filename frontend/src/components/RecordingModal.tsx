import React from "react";

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

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="w-full max-w-md bg-white rounded-xl shadow-xl border border-slate-200 flex flex-col">
                {/* Header */}
                <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-slate-900">
                        Call Recording
                    </h3>
                    <button
                        onClick={onClose}
                        className="text-xs px-2 py-1 rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50"
                    >
                        Close
                    </button>
                </div>

                {/* Body */}
                <div className="px-4 py-3">
                    <audio controls className="w-full">
                        <source src={call.recording_url} type="audio/mpeg" />
                        Your browser does not support the audio element.
                    </audio>
                </div>
            </div>
        </div>
    );
};
