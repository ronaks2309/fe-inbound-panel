import React, { useState } from "react";
import {
    X,
    Phone,
    Smile,
    CheckCircle2,
    Circle,
    Clock,
    Volume2,
    Play,
    MicOff,
    MessageSquare
} from "lucide-react";
import { Button } from "./ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import type { Call } from "./CallDashboard";


interface CallDetailSidebarProps {
    call: Call | null;
    onClose: () => void;
    onTakeOver?: (call: Call) => void;
}

export const CallDetailSidebar: React.FC<CallDetailSidebarProps> = ({ call, onClose, onTakeOver }) => {
    const [activeTab, setActiveTab] = useState<"transcript" | "summary" | "notes">("transcript");
    // const [isPlaying, setIsPlaying] = useState(false); // local state for audio player logic if needed

    if (!call) return null;

    // Determine status for styling
    const status = (call.status || "").toLowerCase();
    const isActive = ["in-progress", "ringing", "queued"].includes(status);
    const isEnded = status === "ended" || status === "completed";

    // Transcript content
    const transcriptText = call.live_transcript || call.final_transcript || "No transcript available yet.";

    // Progress Stages (Horizontal)
    const stages = ["Identity", "Discovery", "Solution", "Close"];
    const currentStageIndex = 1; // Mocked: "Discovery"

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
                <div className="px-6 py-5 border-b border-slate-100 bg-white">
                    <div className="flex justify-between items-start mb-1">
                        <div>
                            {/* Title: Phone Number */}
                            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                                {call.phone_number || "Unknown Number"}
                            </h2>
                            {/* Sub-header: User Name & ID */}
                            <div className="flex items-center gap-2 text-sm text-slate-500 mt-0.5">
                                <span className="font-medium text-slate-700">{call.username || "Unknown User"}</span>
                                <span>•</span>
                                <span className="font-mono text-xs text-slate-400">ID: {call.id.slice(0, 8)}</span>
                            </div>
                        </div>

                        {/* Sentiment Pill (Duration removed) */}
                        <div className="flex flex-col items-end gap-2">
                            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs font-semibold shadow-sm">
                                <Smile size={12} />
                                {call.sentiment || "Neutral"}
                            </div>
                        </div>
                    </div>
                </div>

                {/* PROGRESS SECTION (Compact) */}
                <div className="px-6 py-3 border-b border-slate-100 bg-slate-50/30">
                    <div className="flex justify-between items-center mb-1.5">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Progress</span>
                        <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">Phase 2: Discovery</span>
                    </div>

                    {/* Horizontal Segmented Bar */}
                    <div className="flex items-center gap-1 w-full">
                        {stages.map((stage, idx) => {
                            const isCompleted = idx < currentStageIndex;
                            const isCurrent = idx === currentStageIndex;
                            return (
                                <div key={stage} className="flex-1 flex flex-col gap-1.5 group">
                                    <div className={`h-1.5 w-full rounded-full transition-colors ${isCompleted ? "bg-blue-500" :
                                        isCurrent ? "bg-blue-500" : "bg-slate-200"
                                        }`} />
                                    <span className={`text-[9px] font-medium text-center truncate px-0.5 ${isCurrent ? "text-blue-600" : "text-slate-400"
                                        }`}>
                                        {stage}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* TABS */}
                <div className="border-b border-slate-200 px-6 bg-white">
                    <div className="flex gap-6">
                        <button
                            onClick={() => setActiveTab("transcript")}
                            className={`py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'transcript' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                        >
                            Transcript
                        </button>
                        <button
                            onClick={() => setActiveTab("summary")}
                            className={`py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'summary' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                        >
                            Summary
                        </button>
                        <button
                            onClick={() => setActiveTab("notes")}
                            className={`py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'notes' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                        >
                            Notes
                        </button>
                    </div>
                </div>

                {/* SCROLLABLE CONTENT */}
                <div className="flex-1 overflow-y-auto bg-slate-50/50 flex flex-col relative">

                    {activeTab === "transcript" && (
                        <>
                            {/* Floating Date Label Example */}
                            <div className="sticky top-0 z-10 flex justify-center py-4 pointer-events-none">
                                <span className="bg-slate-100/90 backdrop-blur text-slate-500 text-[10px] font-medium px-3 py-1 rounded-full border border-slate-200 shadow-sm">
                                    Today, Oct 24
                                </span>
                            </div>

                            <div className="px-6 pb-6 space-y-6">
                                {/* Agent bubble */}
                                <div className="flex justify-start w-[85%]">
                                    <div className="flex flex-col gap-1">
                                        <span className="text-[10px] font-bold text-blue-600 uppercase ml-1">AI Agent</span>
                                        <div className="p-3.5 bg-white border border-slate-100 rounded-2xl rounded-tl-none shadow-sm text-sm text-slate-700 leading-relaxed">
                                            Hello Sarah! I see you're having trouble with your recent billing statement. I can certainly help you clarify those charges.
                                        </div>
                                    </div>
                                </div>

                                {/* Customer bubble */}
                                <div className="flex justify-end w-full">
                                    <div className="flex flex-col gap-1 items-end w-[85%]">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase mr-1">Customer</span>
                                        <div className="p-3.5 bg-blue-600 border border-blue-600 rounded-2xl rounded-tr-none shadow-sm text-sm text-white leading-relaxed">
                                            {isActive ? (
                                                <p className="animate-pulse">Listening...</p>
                                            ) : (
                                                <p>Yes, exactly. There's a $50 charge I don't recognize.</p>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Live Transcript Stream Placeholder */}
                                <div className="flex justify-start w-[85%] opacity-70">
                                    <div className="flex flex-col gap-1">
                                        <span className="text-[10px] font-bold text-blue-600 uppercase ml-1">AI Agent</span>
                                        <div className="p-3.5 bg-white border border-slate-100 rounded-2xl rounded-tl-none shadow-sm text-sm text-slate-700 leading-relaxed">
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

                    {activeTab === "summary" && (
                        <div className="p-6">
                            <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm text-sm text-slate-600 leading-relaxed">
                                {call.summary?.summary || "No summary available."}
                            </div>
                        </div>
                    )}

                    {activeTab === "notes" && (
                        <div className="p-6">
                            <textarea
                                className="w-full h-48 p-4 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600 resize-none shadow-sm"
                                placeholder="Add your notes here..."
                            />
                        </div>
                    )}
                </div>

                {/* BOTTOM SECTION: Player & Actions */}
                <div className="p-4 bg-white border-t border-slate-200 shadow-[0_-4px_20px_-5px_rgba(0,0,0,0.1)] z-20">

                    {/* Audio Player Widget */}
                    <div className="mb-4 bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center gap-3">
                        <button className="h-10 w-10 flex items-center justify-center rounded-full bg-white border border-slate-200 text-slate-700 shadow-sm hover:border-slate-300 hover:shadow transition-all">
                            {isActive ? <div className="w-2.5 h-2.5 bg-red-500 rounded-sm animate-pulse" /> : <div className="w-0 h-0 border-l-[10px] border-l-slate-700 border-y-[6px] border-y-transparent ml-1" />}
                        </button>
                        <div className="flex-1">
                            {isActive ? (
                                <div className="flex items-center gap-1 h-8">
                                    {/* Fake waveform animation */}
                                    {[...Array(12)].map((_, i) => (
                                        <div key={i}
                                            className="w-1 bg-blue-400 rounded-full animate-pulse"
                                            style={{
                                                height: `${Math.random() * 100}%`,
                                                animationDelay: `${i * 0.1}s`
                                            }}
                                        />
                                    ))}
                                </div>
                            ) : (
                                <div className="h-1 bg-slate-200 rounded-full w-full overflow-hidden">
                                    <div className="h-full bg-slate-400 w-1/3" />
                                </div>
                            )}
                        </div>
                        <div className="text-xs font-mono text-slate-500">
                            {isActive ? "LIVE" : "03:42"}
                        </div>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400">
                            <Volume2 size={16} />
                        </Button>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-3">
                        <Button variant="outline" className="flex-1 gap-2 bg-white border-slate-200 text-slate-700 hover:bg-slate-50">
                            <span className="w-2 h-2 rounded-full bg-purple-500" />
                            Whisper
                        </Button>

                        <Button
                            className="flex-1 gap-2 bg-red-50 text-red-600 border border-red-100 hover:bg-red-100 hover:border-red-200 shadow-none"
                            onClick={() => onTakeOver && onTakeOver(call)}
                            disabled={!isActive}
                        >
                            <span className="w-2 h-2 rounded-full bg-red-500" />
                            Take Over
                        </Button>

                        <Button variant="outline" size="icon" className="w-12 border-slate-200 text-slate-500 hover:text-slate-700">
                            <span className="text-lg leading-none mb-2">...</span>
                        </Button>
                    </div>
                </div>

            </div>
        </>
    );
};
