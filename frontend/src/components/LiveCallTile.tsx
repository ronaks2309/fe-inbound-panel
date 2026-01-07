import React, { useState } from "react";
import {
    Mic,
    PhoneIncoming,
    AlertCircle,
    Smile,
    Activity, // Neutral icon substitute
    Volume2,
    VolumeX,
    Copy,
    Check
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Card } from "./ui/card";
import { cn } from "../lib/utils";
import type { Call } from "./CallDashboard";

interface LiveCallTileProps {
    call: Call & { messages?: Array<{ role: 'ai' | 'user', content: string }> }; // Extend Call type for mock messages
    onWhisper?: (callId: string) => void;
    onTakeOver?: (callId: string) => void;
}

// Helper to determine sentiment color and icon
const getSentimentConfig = (sentiment: string | null | undefined) => {
    const s = (sentiment || "").toLowerCase();

    if (s.includes("unsatisfied") || s.includes("negative") || s.includes("angry")) {
        return {
            theme: "red",
            bg: "bg-red-50",
            border: "border-red-100",
            text: "text-red-700",
            badgeBg: "bg-red-100",
            badgeText: "text-red-800",
            icon: AlertCircle,
            label: "Negative"
        };
    }

    if (s.includes("very satisfied") || s.includes("satisfied") || s.includes("positive")) {
        return {
            theme: "emerald",
            bg: "bg-emerald-50",
            border: "border-emerald-100",
            text: "text-emerald-700",
            badgeBg: "bg-emerald-100",
            badgeText: "text-emerald-800",
            icon: Smile,
            label: "Positive" // Mocking label mapping
        };
    }
    if (s.includes("neutral")) {
        return {
            theme: "amber",
            bg: "bg-amber-50",
            border: "border-amber-100",
            text: "text-amber-700",
            badgeBg: "bg-amber-100",
            badgeText: "text-amber-800",
            icon: Activity,
            label: "Neutral"
        };
    }

    // Default / Insufficient
    return {
        theme: "blue",
        bg: "bg-white", // Clean white for default
        border: "border-slate-200",
        text: "text-slate-600",
        badgeBg: "bg-slate-100",
        badgeText: "text-slate-700",
        icon: Activity,
        label: "Insufficient Data"
    };
};



export const LiveCallTile: React.FC<LiveCallTileProps> = ({ call, onWhisper, onTakeOver }) => {
    const [activeTab, setActiveTab] = useState<"transcript" | "summary" | "notes">("transcript");
    const [isPlaying, setIsPlaying] = useState(false);
    const [copiedId, setCopiedId] = useState(false); // Local copy state

    const sentimentConfig = getSentimentConfig(call.sentiment);
    const StatusIcon = sentimentConfig.icon;

    // Fixed Duration formatting
    const formatDuration = (seconds?: number | null) => {
        if (!seconds) return "00:00";
        const m = Math.floor(seconds / 60).toString().padStart(2, '0');
        const s = (seconds % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    };

    const messages = call.messages || [
        { role: 'ai', content: "Good afternoon. I see you're calling about the recent charge?" },
        { role: 'user', content: call.final_transcript || call.live_transcript || "Yes, exactly. I didn't authorize this subscription renewal." }
    ];

    const toggleAudio = () => setIsPlaying(!isPlaying);

    const handleCopyId = (e: React.MouseEvent) => {
        e.stopPropagation();
        navigator.clipboard.writeText(call.id);
        setCopiedId(true);
        setTimeout(() => setCopiedId(false), 2000);
    };

    return (
        <Card className={cn(
            "relative flex flex-col shadow-sm transition-all duration-300 hover:shadow-md border overflow-hidden bg-white group",
            sentimentConfig.border
        )}>
            {/* Top accent bar */}
            <div className={cn(
                "absolute top-0 left-0 right-0 h-[3px]",
                sentimentConfig.theme === "emerald" && "bg-emerald-500",
                sentimentConfig.theme === "amber" && "bg-amber-400",
                sentimentConfig.theme === "red" && "bg-red-500",
                sentimentConfig.theme === "blue" && "bg-slate-200"
            )} />

            {/* 1. HEADER SECTION */}
            {/* 1. HEADER SECTION */}
            {/* 1. HEADER SECTION */}
            <div className="px-5 pt-4 pb-3 border-b border-slate-100 bg-white">
                <div className="flex justify-between items-start">
                    {/* LEFT COLUMN: Caller Info & Interactions */}
                    <div className="flex flex-col gap-2">
                        {/* Row 1: Title (Caller Number) */}
                        <h3 className="font-bold text-xl text-slate-800 tracking-tight leading-none">
                            {call.phone_number || "Unknown Number"}
                        </h3>

                        {/* Row 2: Sub-title / Details Row */}
                        <div className="flex items-center gap-4">
                            {/* Call ID */}
                            <div
                                className="flex items-baseline gap-2 group/id cursor-pointer select-none"
                                onClick={handleCopyId}
                            >
                                <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">Call ID</span>
                                <div className="flex items-center gap-1 transition-colors">
                                    <span className="text-xs text-slate-900 leading-none">#{call.id.slice(0, 8)}...</span>
                                    {copiedId ? (
                                        <Check size={10} className="text-emerald-500" />
                                    ) : (
                                        <Copy size={10} className="text-slate-300 group-hover/id:text-blue-500 transition-colors" />
                                    )}
                                </div>
                            </div>

                            <div className="h-3 w-[1px] bg-slate-200" />

                            {/* Username */}
                            <div className="flex items-baseline gap-2">
                                <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">Username</span>
                                <span className="text-xs text-slate-900 leading-none">
                                    {["Sarah", "Mark", "Emily", "Michael"].some(n => call.username?.includes(n)) ? "anitarai99" : "ronny"}
                                </span>
                            </div>
                        </div>

                        {/* Row 3: Audio Module */}
                        <div className="mt-0.5">
                            <div className={cn(
                                "flex items-center gap-3 rounded-full border transition-all duration-300 pr-4 pl-1 py-1 h-9 w-fit",
                                isPlaying
                                    ? "bg-blue-50 border-blue-200 shadow-sm"
                                    : "bg-slate-50 border-slate-200 hover:bg-slate-100"
                            )}>
                                <button
                                    onClick={toggleAudio}
                                    className={cn(
                                        "flex items-center justify-center h-7 w-7 rounded-full transition-colors focus:outline-none",
                                        isPlaying ? "bg-white text-blue-600 shadow-sm" : "text-slate-400 hover:text-slate-600"
                                    )}
                                >
                                    {isPlaying ? <Volume2 size={12} /> : <VolumeX size={12} />}
                                </button>

                                {/* Visualizer */}
                                <div className="flex items-center gap-[2px] h-3 w-16 justify-center">
                                    {[40, 70, 50, 90, 60, 80, 40, 60, 50, 75, 45, 85].map((h, i) => (
                                        <div
                                            key={i}
                                            className={cn(
                                                "w-[2px] rounded-full transition-all duration-300",
                                                isPlaying
                                                    ? "bg-blue-500"
                                                    : "bg-slate-300 opacity-50"
                                            )}
                                            style={{
                                                height: `${h}%`,
                                                animation: `music-bar-anim ${0.5 + Math.random() * 0.5}s ease-in-out infinite alternate`,
                                                animationDelay: `${i * 0.05}s`
                                            }}
                                        />
                                    ))}
                                </div>

                                {/* Volume Slider */}
                                <div className="flex items-center w-16 group/vol">
                                    <input
                                        type="range"
                                        min="0"
                                        max="100"
                                        defaultValue="75"
                                        className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2 [&::-webkit-slider-thumb]:h-2 [&::-webkit-slider-thumb]:bg-slate-400 [&::-webkit-slider-thumb]:rounded-full hover:[&::-webkit-slider-thumb]:bg-blue-500 transition-all"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT COLUMN: Sentiment & Duration */}
                    <div className="flex flex-col items-end justify-between h-full gap-2 py-0.5">
                        {/* Sentiment Label */}
                        <Badge variant="outline" className={cn(
                            "border-0 px-2.5 py-1 gap-1.5 shadow-none font-bold text-[10px] uppercase tracking-wider rounded-md",
                            sentimentConfig.badgeBg,
                            sentimentConfig.badgeText
                        )}>
                            <StatusIcon size={12} className="stroke-[2.5px]" />
                            <span>{sentimentConfig.label}</span>
                        </Badge>

                        {/* Duration Timer */}
                        <div className="mt-auto flex items-end">
                            <span className="font-mono text-[22px] font-bold text-slate-700 tracking-tight leading-none">
                                {formatDuration(call.duration)}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* 2. CONTENT SECTION (Tabs) */}
            <div className="flex-1 flex flex-col min-h-[300px] relative">
                {/* Visualizer Global Styles injection for animation */}
                <style dangerouslySetInnerHTML={{
                    __html: `
                    @keyframes music-bar-anim {
                        0% { height: 20%; opacity: 0.6; }
                        100% { height: 100%; opacity: 1; }
                    }
                `}} />

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
                        <div className="p-3 space-y-2 h-[300px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
                            {messages.map((msg, idx) => (
                                <div key={idx} className={cn("flex flex-col gap-0.5 max-w-[90%]", msg.role === 'user' ? "items-end ml-auto" : "items-start")}>
                                    <span className={cn("text-[9px] text-slate-400 font-bold tracking-wider uppercase mx-1", msg.role === 'user' ? "text-right" : "text-left")}>
                                        {msg.role === 'user' ? 'Caller' : 'AI Agent'}
                                    </span>
                                    <div className={cn(
                                        "px-3 py-1.5 text-xs shadow-sm border border-transparent leading-relaxed",
                                        msg.role === 'user'
                                            ? cn("rounded-2xl rounded-tr-sm", sentimentConfig.bg, sentimentConfig.border, sentimentConfig.text)
                                            : "bg-slate-50 border-slate-100 rounded-2xl rounded-tl-sm text-slate-600"
                                    )}>
                                        {msg.content}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {activeTab === "summary" && (
                        <div className="p-5 h-[300px] overflow-y-auto">
                            <div className="text-xs text-slate-500 italic mb-2">Real-time Analysis</div>
                            <p className="text-xs text-slate-700 leading-relaxed">
                                {call.summary?.summary || "Analyzing call context... The user seems to be discussing billing discrepancies regarding a recent subscription charge."}
                            </p>
                        </div>
                    )}

                    {activeTab === "notes" && (
                        <div className="p-5 h-[300px] overflow-y-auto">
                            <textarea
                                className="w-full h-full resize-none text-xs p-2 border border-slate-100 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 bg-slate-50/50"
                                placeholder="Add quick notes here..."
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* 3. FOOTER SECTION (Actions) */}
            <div className="p-3 border-t border-slate-100 bg-slate-50/30 grid grid-cols-2 gap-3">
                <Button variant="outline" size="sm" className="w-full bg-white hover:bg-slate-50 text-slate-700 border-slate-200 shadow-sm h-8 text-xs font-medium" onClick={() => onWhisper?.(call.id)}>
                    <Mic size={12} className="mr-2 text-slate-500" />
                    Whisper
                </Button>
                <Button
                    size="sm"
                    className={cn(
                        "w-full bg-white shadow-sm border h-8 text-xs font-medium",
                        // Default base styles
                        "hover:opacity-90",
                        // Dynamic styles based on sentiment
                        sentimentConfig.theme === "red"
                            ? "bg-red-50 text-red-600 border-red-100 hover:bg-red-100 hover:border-red-200"
                            : sentimentConfig.theme === "emerald"
                                ? "bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100 hover:border-emerald-200"
                                : sentimentConfig.theme === "amber"
                                    ? "bg-amber-50 text-amber-600 border-amber-100 hover:bg-amber-100 hover:border-amber-200"
                                    : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                    )}
                    variant="outline"
                    onClick={() => onTakeOver?.(call.id)}
                >
                    <PhoneIncoming size={12} className="mr-2" />
                    Take Over
                </Button>
            </div>
        </Card>
    );
};
