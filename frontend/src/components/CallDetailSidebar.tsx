import React, { useState, useEffect, useRef } from "react";
import {
    X,
    Star,
    MessageSquare,
    Mic,
    PhoneIncoming,
    Volume2,
    Play,
    Pause,
    AlertTriangle,
} from "lucide-react";
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
    const [feedbackRating, setFeedbackRating] = useState<number>(0);
    const [feedbackText, setFeedbackText] = useState("");
    const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
    const [takingOver, setTakingOver] = useState(false);

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
                    disposition: data.disposition ?? call.disposition
                };
                onCallUpdated(fullCall);
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

    const handleSaveFeedback = () => {
        console.log("Saving feedback:", { rating: feedbackRating, text: feedbackText, callId: call.id });
        setIsFeedbackOpen(false);
        setFeedbackRating(0);
        setFeedbackText("");
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
                        <div className="p-6">
                            <textarea
                                className="w-full h-48 p-4 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 resize-none shadow-sm transition-all text-slate-700 placeholder:text-slate-400"
                                placeholder="Add private notes here..."
                            />
                        </div>
                    )}
                </div>

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
                : `${backendUrl}/recordings/${call.recording_url}`;

            return (
                <div className="bg-white border border-slate-200 rounded-xl p-3 flex items-center gap-3 shadow-sm">
                    <div className="h-10 w-10 flex items-center justify-center rounded-full bg-slate-100 text-slate-500">
                        <Play size={16} className="ml-0.5" />
                    </div>
                    <div className="flex-1">
                        <p className="text-xs text-slate-500 mb-1">Call Recording</p>
                        <audio controls src={src} className="w-full h-6" />
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
    const [isPlaying, setIsPlaying] = useState(true); // Auto-play by default
    const [error, setError] = useState<string | null>(null);

    // Logic from ListenModal
    useEffect(() => {
        if (!call.has_listen_url) {
            setError("No listen URL");
            setWsStatus("error");
            return;
        }

        let audioCtx: AudioContext | null = null;
        let ws: WebSocket | null = null;
        let filterNode: BiquadFilterNode;
        let gainNode: GainNode;
        let playHead = 0;

        try {
            const AudioCtxCls = (window as any).AudioContext || (window as any).webkitAudioContext;
            if (!AudioCtxCls) throw new Error("Web Audio API not supported");

            audioCtx = new AudioCtxCls({ sampleRate: 32000 }); // Vapi 16k

            filterNode = audioCtx.createBiquadFilter();
            filterNode.type = "lowpass";
            filterNode.frequency.value = 6000;

            gainNode = audioCtx.createGain();
            gainNode.gain.value = 0.8;

            filterNode.connect(gainNode);
            gainNode.connect(audioCtx.destination);

            const wsUrl = backendUrl.replace(/^http/, "ws") + `/ws/listen/${call.id}`;
            ws = new WebSocket(wsUrl);
            ws.binaryType = "arraybuffer";
            setWsStatus("connecting");

            ws.onopen = async () => {
                setWsStatus("open");
                if (audioCtx?.state === 'suspended') await audioCtx.resume();
            };

            ws.onmessage = (event) => {
                if (typeof event.data === "string") return;

                if (!audioCtx) return;

                try {
                    const int16 = new Int16Array(event.data);
                    const buffer = audioCtx.createBuffer(1, int16.length, 32000);
                    const channel = buffer.getChannelData(0);
                    for (let i = 0; i < int16.length; i++) {
                        channel[i] = int16[i] / 32768;
                    }

                    const src = audioCtx.createBufferSource();
                    src.buffer = buffer;
                    src.connect(filterNode);

                    const now = audioCtx.currentTime;
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
            audioCtx?.close();
        };

    }, [call.id, call.has_listen_url]);

    return (
        <div className="bg-white border border-slate-200 rounded-xl p-3 flex items-center gap-3 shadow-sm">
            <button
                className="h-10 w-10 flex items-center justify-center rounded-full bg-slate-50 border border-slate-100 text-slate-700 shadow-sm flex-shrink-0"
            >
                {wsStatus === 'open' ? (
                    <div className="w-2.5 h-2.5 bg-red-500 rounded-sm animate-pulse" />
                ) : (
                    <AlertTriangle size={16} className="text-amber-500" />
                )}
            </button>
            <div className="flex-1">
                {/* Fake waveform for visual effect */}
                <div className="flex items-center gap-0.5 h-6 overflow-hidden">
                    {wsStatus === 'open' ? (
                        [...Array(20)].map((_, i) => (
                            <div key={i} className="w-1 bg-red-400 rounded-full animate-pulse" style={{ height: `${Math.random() * 100}%`, animationDelay: `${i * 0.1}s` }} />
                        ))
                    ) : (
                        <span className="text-xs text-slate-400">
                            {wsStatus === 'connecting' ? 'Connecting...' : error || 'Offline'}
                        </span>
                    )}
                </div>
            </div>
            <div className="text-xs font-mono text-slate-500 font-medium flex-shrink-0">
                LIVE
            </div>
        </div>
    );
}
