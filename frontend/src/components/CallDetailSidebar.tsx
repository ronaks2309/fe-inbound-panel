import React, { useState, useEffect } from "react";
import {
    X,
    Star,
    MessageSquare,
    PhoneIncoming,
    Save,
    MoreVertical,
    Download,
    Gauge,
    Copy,
    Mic,
    Play,
    Pause,
} from "lucide-react";
import { SimpleToast } from "./ui/SimpleToast";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { cn, authenticatedFetch } from "../lib/utils";
import { CopyButton } from "./CopyButton";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSub,
    DropdownMenuSubTrigger,
    DropdownMenuSubContent,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
} from "./ui/dropdown-menu";
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

import { LiveAudioStreamer } from "./LiveAudioStreamer";

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
        authenticatedFetch(`${backendUrl}/api/calls/${call.id}`)
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
    // Transcript content handled in render

    // Progress Stages (Horizontal) - moved to Tab
    const stages = ["Identity", "Discovery", "Solution", "Close"];
    const currentStageIndex = 1; // Mocked: "Discovery"

    const handleSaveNotes = async () => {
        try {
            const res = await authenticatedFetch(`${backendUrl}/api/calls/${call.id}`, {
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
            const res = await authenticatedFetch(`${backendUrl}/api/calls/${call.id}`, {
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
            const res = await authenticatedFetch(`${backendUrl}/api/${call.client_id || 'demo-client'}/calls/${call.id}/force-transfer`, {
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

                {/* HEADER - Title Section */}
                <div className="px-5 py-3 bg-white border-b border-slate-100 flex justify-between items-center bg-slate-50/30">
                    <h2 className="text-xl font-bold text-slate-900 tracking-tight truncate">
                        {call.phone_number || "Unknown Number"}
                    </h2>
                    {/* Close Button (Moved here for better layout) */}
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-200 transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* HEADER - Details Section */}
                <div className="px-5 py-3 bg-slate-50/50 border-b border-slate-100">
                    <div className="grid grid-cols-3 gap-x-2 gap-y-3">
                        {/* Row 1 */}
                        <div className="space-y-0.5">
                            <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold block">Call ID</span>
                            <div className="flex items-center gap-1 group">
                                <span className="font-mono text-[11px] text-slate-700">{call.id.slice(0, 8)}...</span>
                                <CopyButton
                                    textToCopy={call.id}
                                    title="Copy ID"
                                    className="opacity-0 group-hover:opacity-100"
                                    iconSize={10}
                                />
                            </div>
                        </div>
                        <div className="space-y-0.5">
                            <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold block">Username</span>
                            <div className="text-[11px] font-medium text-slate-700 truncate" title={call.username || call.user_id || "Unknown"}>
                                {call.username || call.user_id || "Unknown"}
                            </div>
                        </div>
                        <div className="space-y-0.5">
                            <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold block">Time</span>
                            <div className="text-[11px] text-slate-700 whitespace-nowrap">
                                {new Date(call.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}, {new Date(call.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                        </div>

                        {/* Row 2 */}
                        <div className="space-y-0.5">
                            <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold block">Duration</span>
                            <div className="text-[11px] font-mono text-slate-700">
                                {isActive ? <DurationTimer call={call} /> : formatDuration(call.duration)}
                            </div>
                        </div>
                        <div className="space-y-0.5">
                            <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold block">Sentiment</span>
                            <div className="transform scale-90 origin-top-left"><SentimentBadge sentiment={call.sentiment} /></div>
                        </div>
                        <div className="space-y-0.5">
                            <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold block">Disposition</span>
                            <div className="transform scale-90 origin-top-left"><DispositionBadge disposition={call.disposition} status={call.status} /></div>
                        </div>
                    </div>
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
                        {/* <button
                            onClick={() => setActiveTab("progress")}
                            className={`py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'progress' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                        >
                            Call Progress
                        </button> */}
                        <button
                            onClick={() => setActiveTab("summary")}
                            className={`py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'summary' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                        >
                            AI Summary
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
                        <div className="flex flex-col w-full min-h-0 bg-white">
                            {(() => {
                                const raw = call.live_transcript || call.final_transcript;
                                let messages: any[] = [];

                                if (!raw) {
                                    messages = [{ role: 'system', content: "No transcript available." }];
                                } else {
                                    try {
                                        const parsed = JSON.parse(raw);
                                        messages = Array.isArray(parsed) ? parsed : [{ role: 'system', content: raw }];
                                    } catch (e) {
                                        messages = [{ role: 'system', content: raw }];
                                    }
                                }

                                return messages.map((msg, idx) => {
                                    const isUser = msg.role === 'user';
                                    const isSystem = msg.role === 'system';

                                    if (isSystem) {
                                        return (
                                            <div key={idx} className="w-full px-6 py-2 bg-slate-50/50 border-b border-slate-50 text-center">
                                                <p className="text-[10px] italic text-slate-400">
                                                    {msg.content}
                                                </p>
                                            </div>
                                        );
                                    }

                                    return (
                                        <div
                                            key={idx}
                                            className={cn(
                                                "w-full px-6 py-2 border-b border-slate-50/50 flex flex-col group transition-colors hover:bg-slate-50/30",
                                                isUser ? "bg-blue-50/30 items-end text-right" : "bg-white items-start text-left"
                                            )}
                                        >
                                            <span className={cn(
                                                "text-[9px] font-bold uppercase tracking-wider leading-none mb-1 opacity-70",
                                                isUser ? "text-blue-400" : "text-slate-400"
                                            )}>
                                                {isUser ? 'User' : 'AI'}
                                            </span>
                                            <p className={cn(
                                                "text-xs leading-relaxed max-w-[95%]",
                                                isUser ? "text-blue-900" : "text-slate-700"
                                            )}>
                                                {msg.content}
                                            </p>
                                        </div>
                                    );
                                });
                            })()}
                        </div>
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
                            <div className="mb-3">
                                <p className="text-xs text-slate-500">AI generated summary of the call.</p>
                            </div>
                            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm text-sm text-slate-600 leading-relaxed">
                                {call.summary?.summary || "No summary available."}
                            </div>
                        </div>
                    )}

                    {activeTab === "notes" && (
                        <div className="p-6 flex flex-col gap-4 h-full">
                            <div className="mb-0">
                                <p className="text-xs text-slate-500">Private notes for this call.</p>
                            </div>
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
                                    <Button className="flex-1 bg-blue-600 hover:bg-blue-700 text-white shadow-sm border border-transparent">
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

            </div >
        </>
    );
};

// AUDIO PLAYER SUBCOMPONENT
const AudioPlayer: React.FC<{ call: Call, isActive: boolean }> = ({ call, isActive }) => {
    // If ended, show standard recorded player
    if (!isActive) {
        if (call.recording_url) {
            return <RecordedAudioPlayer call={call} />;
        }
        return (
            <div className="bg-white border border-slate-200 rounded-xl p-3 flex items-center gap-3 shadow-sm opacity-60">
                <div className="text-xs text-slate-400 italic">No recording available.</div>
            </div>
        );
    }

    // LIVE AUDIO PLAYER
    // LIVE AUDIO PLAYER
    return <LiveAudioStreamer call={call} className="w-full" showVolumeSlider={true} compact={false} />;
};

const RecordedAudioPlayer: React.FC<{ call: Call }> = ({ call }) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [playbackRate, setPlaybackRate] = useState(1);
    const audioRef = React.useRef<HTMLAudioElement | null>(null);

    // Prepare Source URL
    // Prepare Source URL - Use Secure Endpoint
    const [src, setSrc] = useState<string>("");

    useEffect(() => {
        if (!call.recording_url) return;

        // If it's already a full HTTP URL (e.g. S3 direct), use it
        if (call.recording_url.startsWith("http")) {
            setSrc(prev => prev === call.recording_url ? prev : call.recording_url!);
            return;
        }

        const controller = new AbortController();

        // Otherwise, fetch signed URL from secure backend endpoint
        const fetchSecureUrl = async () => {
            try {
                // This uses the secure call-nested endpoint: /api/calls/{id}/recording
                const res = await authenticatedFetch(`${backendUrl}/api/calls/${call.id}/recording`, {
                    signal: controller.signal
                });

                if (res.ok) {
                    const data = await res.json();
                    if (!controller.signal.aborted && data.url) {
                        setSrc(prev => prev === data.url ? prev : data.url);
                    }
                }
            } catch (e: any) {
                if (e.name !== 'AbortError') {
                    console.error("Failed to load secure recording URL", e);
                }
            }
        };

        fetchSecureUrl();

        return () => controller.abort();
    }, [call.id, call.recording_url]);


    const togglePlay = async () => {
        if (!audioRef.current || !src) return;

        try {
            if (isPlaying) {
                audioRef.current.pause();
                setIsPlaying(false);
            } else {
                // play() returns a promise that rejects if interrupted
                await audioRef.current.play();
                setIsPlaying(true);
            }
        } catch (e: any) {
            // AbortError is common if user clicks pause/play fast or src changes
            // NotSupportedError means src is invalid/empty (should be caught by !src check above, but extra safety)
            if (e.name !== "AbortError") {
                console.error("Playback error:", e);
                setIsPlaying(false);
            }
        }
    };

    const handleTimeUpdate = () => {
        if (audioRef.current) {
            setCurrentTime(audioRef.current.currentTime);
        }
    };

    const handleLoadedMetadata = () => {
        if (audioRef.current) {
            setDuration(audioRef.current.duration);
        }
    };

    const handleSeek = (time: number) => {
        if (audioRef.current) {
            audioRef.current.currentTime = time;
            setCurrentTime(time);
        }
    };

    const changeSpeed = (speed: number) => {
        if (audioRef.current) {
            audioRef.current.playbackRate = speed;
            setPlaybackRate(speed);
        }
    }

    const handleDownload = () => {
        if (!src) return;
        const link = document.createElement('a');
        link.href = src;
        link.download = `recording-${call.id}.mp3`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    const handleCopyUrl = () => {
        if (!src) return;
        navigator.clipboard.writeText(src);
        // Toast handled by CopyButton usually, but here we do simple alert or nothing
    }

    const formatTime = (time: number) => {
        const mins = Math.floor(time / 60);
        const secs = Math.floor(time % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="bg-white border border-slate-100 rounded-lg p-2 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)] flex items-center gap-2 transition-all hover:shadow-md">
            <audio
                ref={audioRef}
                src={src}
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onEnded={() => setIsPlaying(false)}
            />

            {/* Play/Pause */}
            <button
                onClick={togglePlay}
                disabled={!src}
                className={`h-8 w-8 flex items-center justify-center rounded-lg transition-colors flex-shrink-0 ${!src ? 'bg-slate-50 text-slate-300 cursor-not-allowed' : 'bg-blue-50 text-blue-600 hover:bg-blue-100'}`}
            >
                {isPlaying ? <Pause size={14} className="fill-current" /> : <Play size={14} className="fill-current ml-0.5" />}
            </button>


            {/* Waveform Visualizer */}
            <div className="flex-1 min-w-0 flex flex-col justify-center h-8 group cursor-pointer relative"
                onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const x = e.clientX - rect.left;
                    const pct = Math.max(0, Math.min(1, x / rect.width));
                    handleSeek(pct * (duration || 0));
                }}
            >
                <div className="flex items-end gap-[2px] h-full opacity-80 group-hover:opacity-100 transition-opacity">
                    {/* Simulated Waveform Bars */}
                    {[...Array(40)].map((_, i) => {
                        // Pseudo-random height based on index to create a "wave" shape
                        // We use sin/cos to make it look like a wave, plus some noise
                        const noise = (Math.sin(i * 0.5) + 1) * 0.5; // 0 to 1
                        const heightPct = Math.max(20, noise * 100);

                        const isActiveBar = (i / 40) < (currentTime / (duration || 1));

                        return (
                            <div
                                key={i}
                                className={`flex-1 rounded-full transition-colors duration-150 ${isActiveBar ? 'bg-blue-500' : 'bg-slate-200'}`}
                                style={{ height: `${heightPct}%` }}
                            />
                        )
                    })}
                </div>

                {/* Hover Time Tooltip (Simple) */}
                <div className="absolute -top-4 w-full flex justify-between px-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-[9px] font-medium text-slate-500 bg-white/90 px-1 rounded shadow-sm">
                        {formatTime(currentTime)}
                    </span>
                </div>
            </div>

            {/* Time / Speed Indicator */}
            <div className="text-[10px] font-mono font-medium text-slate-400 w-10 text-right">
                {playbackRate !== 1 ? `${playbackRate}x` : formatTime(duration)}
            </div>

            {/* Options Menu */}
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <button className="h-6 w-6 flex items-center justify-center rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors">
                        <MoreVertical size={14} />
                    </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuSub>
                        <DropdownMenuSubTrigger>
                            <Gauge size={14} className="mr-2" />
                            Playback Speed
                        </DropdownMenuSubTrigger>
                        <DropdownMenuSubContent>
                            <DropdownMenuRadioGroup value={String(playbackRate)} onValueChange={(v) => changeSpeed(parseFloat(v))}>
                                <DropdownMenuRadioItem value="0.5">0.5x (Slow)</DropdownMenuRadioItem>
                                <DropdownMenuRadioItem value="1">1.0x (Normal)</DropdownMenuRadioItem>
                                <DropdownMenuRadioItem value="1.5">1.5x (Fast)</DropdownMenuRadioItem>
                                <DropdownMenuRadioItem value="2">2.0x (Double)</DropdownMenuRadioItem>
                            </DropdownMenuRadioGroup>
                        </DropdownMenuSubContent>
                    </DropdownMenuSub>
                    <DropdownMenuItem onClick={handleDownload}>
                        <Download size={14} className="mr-2" />
                        Download Audio
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleCopyUrl}>
                        <Copy size={14} className="mr-2" />
                        Copy URL
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
};


// HELPER COMPONENTS
const DurationTimer: React.FC<{ call: Call }> = ({ call }) => {
    const [elapsed, setElapsed] = useState(0);

    useEffect(() => {
        if (!call.started_at) return;

        const updateTimer = () => {
            const start = new Date(call.started_at!).getTime();
            const now = Date.now();
            setElapsed(Math.floor((now - start) / 1000));
        };

        // Call immediately to avoid initial 0:00 display
        updateTimer();

        const interval = setInterval(updateTimer, 1000);
        return () => clearInterval(interval);
    }, [call.started_at]);

    return <span>{Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, '0')}</span>;
};

const formatDuration = (seconds?: number | null) => {
    if (!seconds) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
};

// Styling adapted from CallDashboard.tsx
const SentimentBadge: React.FC<{ sentiment?: string | null }> = ({ sentiment }) => {
    if (!sentiment) return <span className="text-slate-400 italic text-xs">N/A</span>;

    const displayVal = sentiment
        .replace("Insufficient Information", "Insufficient")
        .replace("Very Unsatisfied", "V. Unsatisfied")
        .replace(/\b\w/g, c => c.toUpperCase());
    const normalizedKey = sentiment.toLowerCase().trim();

    const styles: Record<string, string> = {
        "very satisfied": "bg-emerald-100 text-emerald-800 border-emerald-200",
        "satisfied": "bg-emerald-50 text-emerald-700 border-emerald-100",
        "neutral": "bg-amber-50 text-amber-700 border-amber-100",
        "unsatisfied": "bg-red-50 text-red-700 border-red-100",
        "v. unsatisfied": "bg-red-100 text-red-800 border-red-200",
        "insufficient": "bg-slate-50 text-slate-600 border-slate-200"
    };

    const style = styles[normalizedKey] || styles["insufficient"];

    return (
        <Badge variant="outline" className={cn("border shadow-sm whitespace-nowrap px-2 py-0.5 text-[10px] font-semibold", style)}>
            {displayVal}
        </Badge>
    );
};

const DispositionBadge: React.FC<{ disposition?: string | null, status?: string | null }> = ({ disposition, status }) => {
    // Check if live
    const s = (status || "").toLowerCase();
    const isLive = ["in-progress", "ringing", "queued"].includes(s);

    if (isLive) {
        return (
            <span className="inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-medium border shadow-sm bg-emerald-50 text-emerald-700 border-emerald-100">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse" />
                Live
            </span>
        );
    }

    if (!disposition || disposition === "Unknown") {
        return <span className="text-slate-400 italic text-xs">N/A</span>;
    }

    const displayVal = disposition
        .replace(/_/g, " ")
        .replace("Follow Up Needed", "Follow Up")
        .replace("Callback Requested", "Callback")
        .replace("Incomplete Call", "Incomplete")
        .replace(/\b\w/g, c => c.toUpperCase());

    const normalizedKey = disposition.toLowerCase().trim().replace(/ /g, "_");

    const colorStyles: Record<string, string> = {
        "qualified": "bg-emerald-100 text-emerald-800 border-emerald-200",
        "disqualified": "bg-slate-100 text-slate-700 border-slate-200",
        "incomplete": "bg-orange-50 text-orange-700 border-orange-100",
        "follow_up": "bg-amber-100 text-amber-800 border-amber-200",
        "callback": "bg-blue-50 text-blue-700 border-blue-100",
        "transferred": "bg-violet-50 text-violet-700 border-violet-100",
        "do_not_call": "bg-red-50 text-red-700 border-red-100",
    };

    const styleClass = colorStyles[normalizedKey]
        || colorStyles[normalizedKey.replace(/_/g, " ")]
        || "bg-slate-50 text-slate-600 border-slate-200";

    return (
        <span className={cn("inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-semibold border shadow-sm whitespace-nowrap", styleClass)}>
            {displayVal}
        </span>
    );
};
