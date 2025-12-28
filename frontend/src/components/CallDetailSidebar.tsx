import React, { useState } from "react";
import {
    X,
    Copy,
    Star,
    MessageSquare,
    Mic,
    PhoneIncoming,
    Volume2,
} from "lucide-react";
import { Button } from "./ui/button";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "./ui/popover";
import type { Call } from "./CallDashboard";

interface CallDetailSidebarProps {
    call: Call | null;
    onClose: () => void;
}

export const CallDetailSidebar: React.FC<CallDetailSidebarProps> = ({ call, onClose }) => {
    const [activeTab, setActiveTab] = useState<"transcript" | "progress" | "summary" | "notes">("transcript");
    const [feedbackRating, setFeedbackRating] = useState<number>(0);
    const [feedbackText, setFeedbackText] = useState("");
    const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);

    if (!call) return null;

    // Determine status for styling
    const status = (call.status || "").toLowerCase();
    const isActive = ["in-progress", "ringing", "queued"].includes(status);

    // Transcript content
    const transcriptText = call.live_transcript || call.final_transcript || "No transcript available yet.";

    // Progress Stages (Horizontal) - moved to Tab
    const stages = ["Identity", "Discovery", "Solution", "Close"];
    const currentStageIndex = 1; // Mocked: "Discovery"

    const handleCopyId = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (call?.id) {
            navigator.clipboard.writeText(call.id);
        }
    };

    const handleSaveFeedback = () => {
        console.log("Saving feedback:", { rating: feedbackRating, text: feedbackText, callId: call.id });
        setIsFeedbackOpen(false);
        // Reset after save
        setFeedbackRating(0);
        setFeedbackText("");
    };

    // Helper to format duration
    const formatDuration = (seconds?: number | null) => {
        if (!seconds) return "00:00";
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/20 backdrop-blur-[1px] z-40"
                onClick={onClose}
            />

            {/* Sidebar Panel */}
            <div className="fixed inset-y-0 right-0 w-[450px] bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out border-l border-slate-200 flex flex-col font-sans">

                {/* HEADER */}
                <div className="px-6 py-5 border-b border-slate-100 bg-white flex justify-between items-start">
                    <div className="flex-1 min-w-0 pr-4">
                        {/* Title: Phone Number */}
                        <h2 className="text-xl font-bold text-slate-900 tracking-tight truncate">
                            {call.phone_number || "Unknown Number"}
                        </h2>
                        {/* Sub-header: User Name & ID */}
                        <div className="flex items-center gap-2 text-xs text-slate-500 mt-1.5 flex-wrap">
                            <span className="font-medium text-slate-700 whitespace-nowrap">
                                Username: <span className="font-normal text-slate-500">{call.username || "Unknown"}</span>
                            </span>
                            <span className="text-slate-300">|</span>
                            <div className="group flex items-center gap-1.5 whitespace-nowrap cursor-pointer" onClick={handleCopyId}>
                                <span>Call ID: <span className="font-mono">{call.id.slice(0, 8)}...</span></span>
                                <button
                                    className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600"
                                    title="Copy Call ID"
                                >
                                    <Copy size={10} />
                                </button>
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

                {/* AUDIO WIDGET (Moved Up) */}
                <div className="px-6 py-4 bg-slate-50/50 border-b border-slate-100">
                    <div className="bg-white border border-slate-200 rounded-xl p-3 flex items-center gap-3 shadow-sm">
                        <button className="h-10 w-10 flex items-center justify-center rounded-full bg-slate-50 border border-slate-100 text-slate-700 shadow-sm hover:border-slate-300 hover:shadow transition-all flex-shrink-0">
                            {isActive ? <div className="w-2.5 h-2.5 bg-red-500 rounded-sm animate-pulse" /> : <div className="w-0 h-0 border-l-[10px] border-l-slate-700 border-y-[6px] border-y-transparent ml-1" />}
                        </button>
                        <div className="flex-1">
                            {isActive ? (
                                <div className="flex items-center gap-0.5 h-6 overflow-hidden">
                                    {/* Fake waveform animation */}
                                    {[...Array(24)].map((_, i) => (
                                        <div key={i}
                                            className="w-1 bg-blue-400 rounded-full animate-pulse flex-shrink-0"
                                            style={{
                                                height: `${Math.random() * 100}%`,
                                                animationDelay: `${i * 0.05}s`
                                            }}
                                        />
                                    ))}
                                </div>
                            ) : (
                                <div className="h-1 bg-slate-100 rounded-full w-full overflow-hidden relative">
                                    <div className="absolute top-0 bottom-0 left-0 bg-slate-300 w-1/3 rounded-full" />
                                </div>
                            )}
                        </div>
                        <div className="text-xs font-mono text-slate-500 font-medium flex-shrink-0">
                            {isActive ? <span className="text-red-500">LIVE</span> : formatDuration(call.duration)}
                        </div>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-600 flex-shrink-0">
                            <Volume2 size={16} />
                        </Button>
                    </div>
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
                                {/* Agent bubble */}
                                <div className="flex justify-start w-[90%]">
                                    <div className="flex flex-col gap-1">
                                        <span className="text-[9px] font-bold text-blue-600 uppercase ml-1 tracking-wide">AI Agent</span>
                                        <div className="p-3 bg-white border border-slate-100 rounded-2xl rounded-tl-none shadow-sm text-[13px] text-slate-700 leading-relaxed">
                                            Hello! I see you're query regarding the recent policy update. I can help you with that.
                                        </div>
                                    </div>
                                </div>

                                {/* Customer bubble */}
                                <div className="flex justify-end w-full">
                                    <div className="flex flex-col gap-1 items-end w-[90%]">
                                        <span className="text-[9px] font-bold text-slate-400 uppercase mr-1 tracking-wide">Customer</span>
                                        <div className="p-3 bg-blue-600 border border-blue-600 rounded-2xl rounded-tr-none shadow-sm text-[13px] text-white leading-relaxed">
                                            {isActive ? (
                                                <p className="animate-pulse">Listening...</p>
                                            ) : (
                                                <p>Yes, I wanted to know if this covers dental as well?</p>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Live Transcript Stream Placeholder */}
                                <div className="flex justify-start w-[90%] opacity-80">
                                    <div className="flex flex-col gap-1">
                                        <span className="text-[9px] font-bold text-blue-600 uppercase ml-1 tracking-wide">AI Agent</span>
                                        <div className="p-3 bg-white border border-slate-100 rounded-2xl rounded-tl-none shadow-sm text-[13px] text-slate-700 leading-relaxed">
                                            {transcriptText !== "No transcript available yet." ? (
                                                <p>{transcriptText}</p>
                                            ) : (
                                                <p className="italic text-slate-400">Connecting to transcript stream...</p>
                                            )}
                                        </div>
                                    </div>
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
                            <Button variant="outline" className="flex-1 border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300">
                                <PhoneIncoming size={16} className="mr-2" />
                                Take Over
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
