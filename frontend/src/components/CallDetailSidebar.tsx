import React, { useState, useEffect } from "react";
import {
    X,
    Star,
    MessageSquare,
    Mic,
    PhoneIncoming,
    Save,
    Play,
    Pause,
    Volume2,
    VolumeX,
} from "lucide-react";
import { SimpleToast } from "./ui/SimpleToast";
import { Button } from "./ui/button";
import { CopyButton } from "./CopyButton";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "./ui/popover";
import type { Call } from "./CallDashboard";

const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";

interface CallDetailSidebarProps {
    call: Call | null;
    onClose: () => void;
    onCallUpdated: (updatedCall: Call) => void;
}

export const CallDetailSidebar: React.FC<CallDetailSidebarProps> = ({ call, onClose, onCallUpdated }) => {
    const [activeTab, setActiveTab] = useState<"transcript" | "progress" | "summary" | "notes">("transcript");
    const [notes, setNotes] = useState("");
    const [feedbackRating, setFeedbackRating] = useState<number>(0);
    const [feedbackText, setFeedbackText] = useState("");
    const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
    const [takingOver, setTakingOver] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    // Reset/Sync state when call changes or loads
    useEffect(() => {
        if (call) {
            setNotes(call.notes || "");
            setFeedbackRating(call.feedback_rating || 0);
            setFeedbackText(call.feedback_text || "");
        }
    }, [call?.id, call?.notes, call?.feedback_rating, call?.feedback_text]);

    // Fetch full details effect (from TranscriptModal)
    useEffect(() => {
        if (!call) return;
        if (call.detailsLoaded) return;

        console.log("Fetching full details for call:", call.id);
        fetch(`${backendUrl}/api/calls/${call.id}`)
            .then(res => {
                if (!res.ok) throw new Error("Failed to load details");
                return res.json();
            })
            .then(data => {
                const fullCall: Call = {
                    ...call,
                    ...data,
                    started_at: call.started_at ?? data.started_at ?? data.startedAt,
                    created_at: call.created_at ?? data.created_at ?? data.createdAt,
                    live_transcript: data.live_transcript ?? data.liveTranscript,
                    final_transcript: data.final_transcript ?? data.finalTranscript,
                    summary: data.summary,
                    detailsLoaded: true,
                    // Ensure backend fields map even if snake_case
                    recording_url: data.recording_url ?? data.recordingUrl ?? call.recording_url,
                    has_listen_url: data.has_listen_url ?? data.hasListenUrl ?? call.has_listen_url,
                    sentiment: data.sentiment ?? call.sentiment,
                    disposition: data.disposition ?? call.disposition,
                    notes: data.notes ?? call.notes,
                    feedback_rating: data.feedback_rating ?? call.feedback_rating,
                    feedback_text: data.feedback_text ?? call.feedback_text
                };
                onCallUpdated(fullCall);
                // State sync handled by the Effect above dependent on props
                // But since onCallUpdated updates the parent, and parent passes new prop, the effect above will trigger.
            })
            .catch(err => console.error("Failed to fetch call details", err));
    }, [call?.id]); // Only re-run if call ID changes, not on every prop update if loaded

    if (!call) return null;

    // Determine status for styling
    const status = (call.status || "").toLowerCase();
    const isActive = ["in-progress", "ringing", "queued"].includes(status);

    // Transcript content
    const transcriptText = call.live_transcript || call.final_transcript || "No transcript available yet.";

    // Progress Stages (Horizontal) - moved to Tab
    const stages = ["Identity", "Discovery", "Solution", "Close"];
    const currentStageIndex = 1; // Mocked: "Discovery"

    const handleSaveNotes = async () => {
        try {
            const res = await fetch(`${backendUrl}/api/calls/${call.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ notes })
            });
            if (!res.ok) throw new Error("Failed to save notes");

            setToast({ message: "Notes saved successfully", type: "success" });
            onCallUpdated({ ...call, notes });
        } catch (e) {
            console.error(e);
            setToast({ message: "Failed to save notes", type: "error" });
        }
    };

    const handleSaveFeedback = async () => {
        try {
            const res = await fetch(`${backendUrl}/api/calls/${call.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    feedback_rating: feedbackRating,
                    feedback_text: feedbackText
                })
            });
            if (!res.ok) throw new Error("Failed to save feedback");

            setToast({ message: "Feedback saved successfully", type: "success" });
            setIsFeedbackOpen(false);
            onCallUpdated({ ...call, feedback_rating: feedbackRating, feedback_text: feedbackText });
        } catch (e) {
            console.error(e);
            setToast({ message: "Failed to save feedback", type: "error" });
        }
    };

    const handleTakeOver = async () => {
        if (!confirm("Are you sure you want to take over this call? It will be transferred to your number.")) return;

        setTakingOver(true);
        try {
            const res = await fetch(`${backendUrl}/api/${call.client_id || 'demo-client'}/calls/${call.id}/force-transfer`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    agent_phone_number: "+16504848853", // Hardcoded for demo/MVP
                    content: "Taking over call now."
                })
            });
            if (!res.ok) throw new Error("Transfer failed");
            alert("Transfer initiated!");
        } catch (e) {
            console.error(e);
            alert("Failed to takeover call.");
        } finally {
            setTakingOver(false);
        }
    };

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/20 backdrop-blur-[1px] z-40"
                onClick={onClose}
            />

            {/* Sidebar Panel */}
            <div className="fixed inset-y-0 right-0 w-[500px] bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out border-l border-slate-200 flex flex-col font-sans">

                {/* HEADER */}
                <div className="px-6 py-5 border-b border-slate-100 bg-white flex justify-between items-start">
                    <div className="flex-1 min-w-0 pr-4">
                        {/* Title: Phone Number */}
                        <div className="group flex items-center gap-2">
                            <h2 className="text-xl font-bold text-slate-900 tracking-tight truncate">
                                {call.phone_number || "Unknown Number"}
                            </h2>
                            {call.phone_number && (
                                <CopyButton
                                    textToCopy={call.phone_number}
                                    title="Copy Number"
                                    className="opacity-0 group-hover:opacity-100 mt-0.5"
                                    iconSize={14}
                                />
                            )}
                        </div>
                        {/* Sub-header: User Name & ID */}
                        <div className="flex items-center gap-2 text-xs text-slate-500 mt-1.5 flex-wrap">
                            <span className="font-medium text-slate-700 whitespace-nowrap">
                                Username: <span className="font-normal text-slate-500">{call.username || call.user_id || "Unknown"}</span>
                            </span>
                            <span className="text-slate-300">|</span>
                            {/* Call ID Group */}
                            <div className="group flex items-center gap-1.5 whitespace-nowrap relative select-none">
                                <span>ID: <span className="font-mono">{call.id.slice(0, 8)}...</span></span>
                                <CopyButton
                                    textToCopy={call.id}
                                    title="Copy Call ID"
                                    className="opacity-0 group-hover:opacity-100"
                                />
                            </div>
                        </div>
                    </div>
                    {/* Close Button */}
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-slate-100 transition-colors flex-shrink-0"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* AUDIO WIDGET */}
                <div className="px-6 py-4 bg-slate-50/50 border-b border-slate-100">
                    <AudioPlayer call={call} isActive={isActive} />
                </div>


                {/* TABS */}
                <div className="border-b border-slate-200 px-6 bg-white z-10">
                    <div className="flex gap-6 overflow-x-auto no-scrollbar">
                        <button
                            onClick={() => setActiveTab("transcript")}
                            className={`py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'transcript' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                        >
                            Transcript
                        </button>
                        <button
                            onClick={() => setActiveTab("progress")}
                            className={`py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'progress' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                        >
                            Call Progress
                        </button>
                        <button
                            onClick={() => setActiveTab("summary")}
                            className={`py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'summary' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                        >
                            Summary
                        </button>
                        <button
                            onClick={() => setActiveTab("notes")}
                            className={`py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'notes' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                        >
                            Notes
                        </button>
                    </div>
                </div>

                {/* SCROLLABLE CONTENT */}
                <div className="flex-1 overflow-y-auto bg-slate-50/30 flex flex-col relative scroll-smooth">

                    {activeTab === "transcript" && (
                        <>
                            {/* Floating Date Label */}
                            <div className="sticky top-0 z-10 flex justify-center py-3 pointer-events-none">
                                <span className="bg-slate-100/95 backdrop-blur text-slate-400 text-[10px] font-medium px-2.5 py-0.5 rounded-full border border-slate-200/50 shadow-sm">
                                    {new Date(call.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>

                            <div className="px-5 pb-6 space-y-4">
                                <div className="p-4 bg-white border border-slate-100 rounded-xl shadow-sm">
                                    <pre className="whitespace-pre-wrap text-xs text-slate-800 font-mono leading-relaxed">
                                        {transcriptText}
                                    </pre>
                                </div>
                            </div>
                        </>
                    )}

                    {activeTab === "progress" && (
                        <div className="p-6">
                            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-sm font-semibold text-slate-900">Call Stages</h3>
                                    <span className="text-xs font-bold text-blue-600 uppercase tracking-wider bg-blue-50 px-2 py-1 rounded">Phase 2: Discovery</span>
                                </div>
                                <div className="space-y-6 relative">
                                    {/* Vertical Line */}
                                    <div className="absolute left-[15px] top-2 bottom-2 w-0.5 bg-slate-100 -z-10" />

                                    {stages.map((stage, idx) => {
                                        const isCompleted = idx < currentStageIndex;
                                        const isCurrent = idx === currentStageIndex;
                                        return (
                                            <div key={stage} className="flex items-start gap-4">
                                                <div className={`mt-0.5 w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors z-0 ${isCompleted ? "bg-blue-600 border-blue-600 text-white" :
                                                    isCurrent ? "bg-white border-blue-600 text-blue-600 ring-4 ring-blue-50" :
                                                        "bg-white border-slate-200 text-slate-300"
                                                    }`}>
                                                    {isCompleted ? (
                                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                                    ) : (
                                                        <span className="text-xs font-bold">{idx + 1}</span>
                                                    )}
                                                </div>
                                                <div className="flex-1 pt-1">
                                                    <p className={`text-sm font-medium ${isCurrent ? "text-slate-900" : isCompleted ? "text-slate-700" : "text-slate-400"}`}>{stage}</p>
                                                    {isCurrent && <p className="text-xs text-slate-500 mt-1">Currently analyzing customer needs and qualifying requirements.</p>}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === "summary" && (
                        <div className="p-6">
                            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm text-sm text-slate-600 leading-relaxed">
                                {call.summary?.summary || "No summary available."}
                            </div>
                        </div>
                    )}

                    {activeTab === "notes" && (
                        <div className="p-6 flex flex-col gap-4 h-full">
                            <textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                className="w-full p-4 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 resize-none shadow-sm transition-all text-slate-700 placeholder:text-slate-400 h-24"
                                placeholder="Add private notes here..."
                            />
                            <div className="flex justify-end">
                                <Button onClick={handleSaveNotes} className="bg-blue-600 hover:bg-blue-700 text-white">
                                    <Save size={16} className="mr-2" />
                                    Save Notes
                                </Button>
                            </div>
                        </div>
                    )}
                </div>

                {toast && (
                    <SimpleToast
                        message={toast.message}
                        type={toast.type}
                        onClose={() => setToast(null)}
                    />
                )}

                {/* BOTTOM ACTIONS */}
                <div className="p-5 bg-white border-t border-slate-200 shadow-[0_-4px_20px_-5px_rgba(0,0,0,0.05)] z-20">
                    {isActive ? (
                        <div className="flex gap-3">
                            <Button className="flex-1 bg-blue-600 hover:bg-blue-700 text-white shadow-sm border border-transparent">
                                <Mic size={16} className="mr-2" />
                                Whisper
                            </Button>
                            <Button
                                variant="outline"
                                className="flex-1 border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
                                onClick={handleTakeOver}
                                disabled={takingOver}
                            >
                                <PhoneIncoming size={16} className="mr-2" />
                                {takingOver ? "Transferring..." : "Take Over"}
                            </Button>
                        </div>
                    ) : (
                        <div className="flex gap-3">
                            <Popover open={isFeedbackOpen} onOpenChange={setIsFeedbackOpen}>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" className="flex-1 border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900">
                                        <MessageSquare size={16} className="mr-2" />
                                        Feedback
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-80 p-0" align="center" sideOffset={5}>
                                    <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                                        <h4 className="font-semibold text-slate-900 text-sm">Rate Call Performance</h4>
                                        <p className="text-xs text-slate-500 mt-0.5">Help improve the agent by rating this interaction.</p>
                                    </div>
                                    <div className="p-4 flex flex-col gap-4">
                                        <div className="flex justify-center gap-2">
                                            {[1, 2, 3, 4, 5].map((star) => (
                                                <button
                                                    key={star}
                                                    onClick={() => setFeedbackRating(star)}
                                                    className={`transition-all hover:scale-110 p-1 ${feedbackRating >= star ? "text-amber-400" : "text-slate-200 hover:text-amber-200"}`}
                                                    title={`${star} Star${star > 1 ? 's' : ''}`}
                                                >
                                                    <Star size={28} fill={feedbackRating >= star ? "currentColor" : "none"} />
                                                </button>
                                            ))}
                                        </div>
                                        <textarea
                                            value={feedbackText}
                                            onChange={(e) => setFeedbackText(e.target.value)}
                                            className="w-full text-xs p-3 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none h-24 placeholder:text-slate-400"
                                            placeholder="Add specific comments about agent performance..."
                                        />
                                        <Button size="sm" onClick={handleSaveFeedback} disabled={feedbackRating === 0} className="w-full bg-blue-600 hover:bg-blue-700">
                                            Save Feedback
                                        </Button>
                                    </div>
                                </PopoverContent>
                            </Popover>
                        </div>
                    )}
                </div>

            </div>
        </>
    );
};

// AUDIO PLAYER SUBCOMPONENT
const AudioPlayer: React.FC<{ call: Call, isActive: boolean }> = ({ call, isActive }) => {
    // If ended, show standard recorded player
    if (!isActive) {
        if (call.recording_url) {
            // Prepend backend URL if relative
            const src = call.recording_url.startsWith("http")
                ? call.recording_url
                : `${backendUrl}/api/recordings/${call.recording_url}`;

            const getSignedUrl = async () => {
                if (!src.includes("/api/recordings/")) return src;
                try {
                    const res = await fetch(`${src}?redirect=false`);
                    if (!res.ok) throw new Error("Failed to get signed URL");
                    const data = await res.json();
                    return data.url;
                } catch (e) {
                    console.error("Error fetching signed URL", e);
                    return src; // Fallback
                }
            };

            return (
                <div className="mt-2">
                    <div className="flex justify-between items-center mb-2 px-1">
                        <p className="text-xs font-medium text-slate-500">Call Recording</p>
                        <div className="flex items-center gap-2">
                            <CopyButton
                                textToCopy={getSignedUrl}
                                title="Copy Signed URL"
                                className="opacity-100 text-slate-400 hover:text-slate-600"
                                iconSize={14}
                            />
                        </div>
                    </div>
                    <div className="bg-slate-50 border border-slate-100 rounded-lg p-2">
                        <audio controls src={src} className="w-full h-8" />
                    </div>
                </div>
            )
        }
        return (
            <div className="bg-white border border-slate-200 rounded-xl p-3 flex items-center gap-3 shadow-sm opacity-60">
                <div className="text-xs text-slate-400 italic">No recording available.</div>
            </div>
        );
    }

    // LIVE AUDIO PLAYER
    return <LiveAudioStreamer call={call} />;
};

const LiveAudioStreamer: React.FC<{ call: Call }> = ({ call }) => {
    const [wsStatus, setWsStatus] = useState<"idle" | "connecting" | "open" | "closed" | "error">("idle");
    const [error, setError] = useState<string | null>(null);
    const [isPlaying, setIsPlaying] = useState(true); // Default to playing
    const [volume, setVolume] = useState(0.8);
    const [duration, setDuration] = useState("00:00");

    // Refs for audio control
    const audioCtxRef = React.useRef<AudioContext | null>(null);
    const gainNodeRef = React.useRef<GainNode | null>(null);

    // Log errors
    useEffect(() => {
        if (error) console.error("Live Audio Error:", error);
    }, [error]);

    // Duration Timer
    useEffect(() => {
        const updateTimer = () => {
            if (!call.started_at) return;
            const start = new Date(call.started_at).getTime();
            const now = Date.now();
            const diff = Math.max(0, Math.floor((now - start) / 1000));

            const mins = Math.floor(diff / 60).toString().padStart(2, '0');
            const secs = (diff % 60).toString().padStart(2, '0');
            setDuration(`${mins}:${secs}`);
        };

        const timerId = setInterval(updateTimer, 1000);
        updateTimer(); // Initial call

        return () => clearInterval(timerId);
    }, [call.started_at]);

    // Handle Volume Changes
    useEffect(() => {
        if (gainNodeRef.current) {
            gainNodeRef.current.gain.value = volume;
        }
    }, [volume]);

    // Handle Play/Pause (Mute/Unmute)
    useEffect(() => {
        if (gainNodeRef.current) {
            // We use gain to "mute" so we don't disconnect the stream
            // If !isPlaying, mute. If isPlaying, set to current volume.
            gainNodeRef.current.gain.value = isPlaying ? volume : 0;
        }
    }, [isPlaying, volume]);

    // WebSocket & Audio Setup
    useEffect(() => {
        if (!call.has_listen_url) {
            setError("No listen URL");
            setWsStatus("error");
            return;
        }

        let ws: WebSocket | null = null;
        let filterNode: BiquadFilterNode;
        let playHead = 0;

        try {
            const AudioCtxCls = (window as any).AudioContext || (window as any).webkitAudioContext;
            if (!AudioCtxCls) throw new Error("Web Audio API not supported");

            const ctx = new AudioCtxCls({ sampleRate: 32000 }); // Vapi 16k
            audioCtxRef.current = ctx;

            if (!ctx) throw new Error("Could not create AudioContext");

            filterNode = ctx.createBiquadFilter();
            filterNode.type = "lowpass";
            filterNode.frequency.value = 6000;

            const gain = ctx.createGain();
            gain.gain.value = isPlaying ? volume : 0;
            gainNodeRef.current = gain;

            filterNode.connect(gain);
            gain.connect(ctx.destination);

            const wsUrl = backendUrl.replace(/^http/, "ws") + `/ws/listen/${call.id}`;
            ws = new WebSocket(wsUrl);
            ws.binaryType = "arraybuffer";
            setWsStatus("connecting");

            ws.onopen = async () => {
                setWsStatus("open");
                if (ctx && ctx.state === 'suspended') await ctx.resume();
            };

            ws.onmessage = (event) => {
                if (typeof event.data === "string") return;
                if (!ctx) return;

                try {
                    const int16 = new Int16Array(event.data);
                    const buffer = ctx.createBuffer(1, int16.length, 32000);
                    const channel = buffer.getChannelData(0);
                    for (let i = 0; i < int16.length; i++) {
                        channel[i] = int16[i] / 32768;
                    }

                    const src = ctx.createBufferSource();
                    src.buffer = buffer;
                    src.connect(filterNode);

                    const now = ctx.currentTime;
                    if (playHead < now) playHead = now;
                    src.start(playHead);
                    playHead += buffer.duration;
                } catch (e) {
                    console.error("Audio decode error", e);
                }
            };

            ws.onerror = () => {
                setWsStatus("error");
                setError("Connection failed");
            };
            ws.onclose = () => {
                setWsStatus("closed");
            };

        } catch (e: any) {
            setError(e.message);
            setWsStatus("error");
        }

        return () => {
            ws?.close();
            audioCtxRef.current?.close();
            audioCtxRef.current = null;
            gainNodeRef.current = null;
        };

    }, [call.id, call.has_listen_url]); // Re-run if call ID changes

    return (
        <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.05)] flex items-center gap-4 transition-all hover:shadow-[0_4px_16px_-4px_rgba(0,0,0,0.08)]">

            {/* Play/Pause Button */}
            <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="h-12 w-12 flex items-center justify-center rounded-xl bg-white border border-slate-100 text-blue-600 shadow-sm hover:translate-y-[-1px] hover:shadow-md transition-all active:translate-y-[1px] flex-shrink-0"
                title={isPlaying ? "Mute" : "Play"}
            >
                {isPlaying ? (
                    <Pause size={20} className="fill-current" />
                ) : (
                    <Play size={20} className="fill-current ml-0.5" />
                )}
            </button>

            {/* Timer */}
            <div className="flex flex-col justify-center min-w-[50px]">
                <span className="text-sm font-bold text-slate-800 font-mono tracking-wide">{duration}</span>
                <div className="flex items-center gap-1.5 mt-0.5">
                    <div className={`w-1.5 h-1.5 rounded-full ${wsStatus === 'open' ? 'bg-red-500 animate-pulse' : 'bg-slate-300'}`} />
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                        {wsStatus === 'open' ? 'Live' : wsStatus}
                    </span>
                </div>
            </div>

            {/* Visualizer */}
            <div className="flex-1 flex items-center justify-center gap-[3px] h-8 mx-2 overflow-hidden mask-linear-fade opacity-80">
                {wsStatus === 'open' && isPlaying ? (
                    [...Array(12)].map((_, i) => (
                        // Simulated waveform visualization
                        <div
                            key={i}
                            className="w-1.5 rounded-full bg-blue-500 transition-all duration-75"
                            style={{
                                height: `${Math.max(20, Math.random() * 100)}%`,
                                opacity: Math.max(0.3, Math.random())
                            }}
                        />
                    ))
                ) : (
                    // Static idle state
                    [...Array(12)].map((_, i) => (
                        <div
                            key={i}
                            className="w-1.5 h-1.5 rounded-full bg-slate-200"
                        />
                    ))
                )}
            </div>

            {/* Volume Control */}
            <div
                className="flex items-center gap-2 relative group"
            >
                <button
                    onClick={() => {
                        const newVol = volume === 0 ? 0.8 : 0;
                        setVolume(newVol);
                        if (newVol > 0 && !isPlaying) setIsPlaying(true);
                    }}
                    className="text-slate-400 hover:text-slate-600 transition-colors p-1.5 rounded-full hover:bg-slate-50"
                >
                    {volume === 0 || !isPlaying ? <VolumeX size={18} /> : <Volume2 size={18} />}
                </button>

                <div className="w-20 hidden group-hover:block transition-all duration-300 ease-in-out">
                    <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={isPlaying ? volume : 0}
                        onChange={(e) => {
                            setVolume(parseFloat(e.target.value));
                            if (!isPlaying && parseFloat(e.target.value) > 0) setIsPlaying(true);
                        }}
                        className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                    />
                </div>
            </div>
        </div>
    );
}
