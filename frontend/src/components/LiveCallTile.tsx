import React, { useState } from "react";
import {
    Mic,
    PhoneIncoming,
    Copy,
    Check
} from "lucide-react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { cn } from "../lib/utils";
import type { Call } from "./CallDashboard";
import { LiveAudioStreamer } from "./LiveAudioStreamer";

interface LiveCallTileProps {
    call: Call;
    onWhisper?: (callId: string) => void;
    onTakeOver?: (callId: string) => void;
}



export const LiveCallTile: React.FC<LiveCallTileProps> = ({ call, onWhisper, onTakeOver }) => {
    const [activeTab, setActiveTab] = useState<"transcript" | "summary" | "notes">("transcript");
    const [copiedId, setCopiedId] = useState(false);

    // Formatting Helpers
    const formatCallTime = (dateStr: string) => {
        try {
            return new Date(dateStr).toLocaleString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (e) {
            return "";
        }
    };

    const handleCopyId = (e: React.MouseEvent) => {
        e.stopPropagation();
        navigator.clipboard.writeText(call.id);
        setCopiedId(true);
        setTimeout(() => setCopiedId(false), 2000);
    };



    // Parse Transcript (Attempt to be smart about it, otherwise just text)
    // If it's just a string, we show it as one block or try to split by newlines if they represent turns?
    // For now, assuming raw text.
    const transcriptContent = call.live_transcript || call.final_transcript || "Listening...";

    // Determine user display: Username if available, else something based on ID or "Unknown"
    // Requirement says: "Bind Username in a subtitle row."
    const displayUsername = call.username || "Guest";

    return (
        <Card className="relative flex flex-col shadow-sm transition-all duration-300 hover:shadow-md border overflow-hidden bg-white group border-slate-200">


            {/* 1. HEADER SECTION */}
            {/* Title Section with Live Badge */}
            <div className="px-5 py-3 bg-white border-b border-slate-100 flex justify-between items-center">
                <h3 className="text-xl font-bold text-slate-900 tracking-tight">
                    {call.phone_number || "Unknown Number"}
                </h3>
                <span className="inline-flex items-center rounded-md px-2.5 py-1 text-[10px] font-semibold border shadow-sm bg-emerald-50 text-emerald-700 border-emerald-100">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse" />
                    Live
                </span>
            </div>

            {/* Compact Details Grid Section - Single Row */}
            <div className="px-5 py-2.5 bg-slate-50/50 border-b border-slate-100">
                <div className="grid grid-cols-3 gap-x-2">
                    <div className="space-y-0.5">
                        <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold block">Call ID</span>
                        <div className="flex items-center gap-1 group">
                            <span className="font-mono text-[11px] text-slate-700">#{call.id.slice(0, 8)}</span>
                            <button
                                onClick={handleCopyId}
                                className="opacity-0 group-hover:opacity-100 transition-opacity"
                                title="Copy ID"
                            >
                                {copiedId ? (
                                    <Check size={10} className="text-emerald-500" />
                                ) : (
                                    <Copy size={10} className="text-slate-400 hover:text-blue-500" />
                                )}
                            </button>
                        </div>
                    </div>
                    <div className="space-y-0.5">
                        <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold block">Username</span>
                        <div className="text-[11px] font-medium text-slate-700 truncate" title={displayUsername}>
                            {displayUsername}
                        </div>
                    </div>
                    <div className="space-y-0.5">
                        <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold block">Time</span>
                        <div className="text-[11px] text-slate-700 whitespace-nowrap">
                            {formatCallTime(call.created_at)}
                        </div>
                    </div>
                </div>
            </div>

            {/* Audio Section */}
            <div className="px-6 py-4 bg-slate-50/50 border-b border-slate-100">
                <LiveAudioStreamer
                    call={call}
                    compact={false}
                    showVolumeSlider={true}
                    className="w-full"
                    autoPlay={false}
                />
            </div>

            {/* 2. CONTENT SECTION (Tabs) */}
            <div className="flex-1 flex flex-col min-h-[300px] relative">
                {/* Tabs Header */}
                <div className="flex border-b border-slate-100 px-5 bg-slate-50/30">
                    <button
                        onClick={() => setActiveTab("transcript")}
                        className={cn(
                            "py-2.5 text-[11px] font-semibold uppercase tracking-wide border-b-2 px-1 transition-all mr-4",
                            activeTab === "transcript" ? "border-blue-600 text-blue-700" : "border-transparent text-slate-500 hover:text-slate-700"
                        )}
                    >
                        Transcript
                    </button>
                    <button
                        onClick={() => setActiveTab("summary")}
                        className={cn(
                            "py-2.5 text-[11px] font-semibold uppercase tracking-wide border-b-2 px-1 transition-all mr-4",
                            activeTab === "summary" ? "border-blue-600 text-blue-700" : "border-transparent text-slate-500 hover:text-slate-700"
                        )}
                    >
                        Summary
                    </button>
                    <button
                        onClick={() => setActiveTab("notes")}
                        className={cn(
                            "py-2.5 text-[11px] font-semibold uppercase tracking-wide border-b-2 px-1 transition-all",
                            activeTab === "notes" ? "border-blue-600 text-blue-700" : "border-transparent text-slate-500 hover:text-slate-700"
                        )}
                    >
                        Notes
                    </button>
                </div>

                {/* Tab Content */}
                <div className="flex-1 p-0 bg-white relative">
                    {activeTab === "transcript" && (
                        <div className="p-4 h-[300px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent bg-slate-50/30">
                            <p className="whitespace-pre-wrap text-xs leading-relaxed text-slate-700 font-mono">
                                {transcriptContent}
                            </p>
                        </div>
                    )}

                    {activeTab === "summary" && (
                        <div className="p-5 h-[300px] overflow-y-auto">
                            <div className="text-xs text-slate-500 italic mb-2">Real-time Analysis</div>
                            <p className="text-xs text-slate-700 leading-relaxed">
                                {call.summary?.summary || "Analysis pending... Live call insights will appear here."}
                            </p>
                        </div>
                    )}

                    {activeTab === "notes" && (
                        <div className="p-5 h-[300px] overflow-y-auto">
                            <textarea
                                className="w-full h-full resize-none text-xs p-2 border border-slate-100 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 bg-slate-50/50"
                                placeholder="Add live notes..."
                                defaultValue={call.notes || ""}
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* 3. FOOTER SECTION (Actions) */}
            <div className="p-3 border-t border-slate-100 bg-slate-50/30 grid grid-cols-2 gap-3">
                <Button
                    variant="outline"
                    size="sm"
                    className="w-full bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200 hover:border-blue-300 shadow-sm h-9 text-xs font-semibold transition-all"
                    onClick={() => onWhisper?.(call.id)}
                >
                    <Mic size={14} className="mr-2" />
                    Whisper
                </Button>
                <Button
                    size="sm"
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white border-blue-600 shadow-sm h-9 text-xs font-semibold transition-all"
                    onClick={() => onTakeOver?.(call.id)}
                >
                    <PhoneIncoming size={14} className="mr-2" />
                    Take Over
                </Button>
            </div>
        </Card>
    );
};
