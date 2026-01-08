import React, { useState, useEffect, useRef } from "react";
import { Volume2, VolumeX, Pause, Play } from "lucide-react";
import { supabase } from "../lib/supabase";
import { cn } from "../lib/utils";
import type { Call } from "./CallDashboard";

const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";

interface LiveAudioStreamerProps {
    call: Call;
    isActive?: boolean;
    onToggle?: () => void;
    className?: string;
    showVolumeSlider?: boolean;
    compact?: boolean;
    autoPlay?: boolean;
}

export const LiveAudioStreamer: React.FC<LiveAudioStreamerProps> = ({
    call,
    isActive = true,
    onToggle,
    className,
    showVolumeSlider = true,
    compact = false,
    autoPlay = false
}) => {
    const [wsStatus, setWsStatus] = useState<"idle" | "connecting" | "open" | "closed" | "error">("idle");
    const [error, setError] = useState<string | null>(null);
    const [isPlaying, setIsPlaying] = useState(autoPlay);
    const [volume, setVolume] = useState(0.8);
    const [token, setToken] = useState<string | null>(null);
    const [duration, setDuration] = useState("00:00");

    // Fetch Token
    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session?.access_token) {
                setToken(session.access_token);
            }
        });
    }, []);

    // Refs
    const audioCtxRef = useRef<AudioContext | null>(null);
    const gainNodeRef = useRef<GainNode | null>(null);
    const wsRef = useRef<WebSocket | null>(null);
    const nextStartTimeRef = useRef<number>(0);

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
        updateTimer();

        return () => clearInterval(timerId);
    }, [call.started_at]);

    // Handle Volume
    useEffect(() => {
        if (gainNodeRef.current) {
            gainNodeRef.current.gain.value = volume;
        }
    }, [volume]);

    // Handle Mute
    useEffect(() => {
        if (gainNodeRef.current) {
            gainNodeRef.current.gain.value = isPlaying ? volume : 0;
        }
    }, [isPlaying, volume]);

    const toggleMute = () => {
        setIsPlaying(!isPlaying);
        onToggle?.();
    };

    // WebSocket & Audio
    useEffect(() => {
        if (!isPlaying) {
            setWsStatus("idle");
            return;
        }

        if (!call.has_listen_url) {
            setError("No listen URL");
            setWsStatus("error");
            return;
        }

        if (!token) return;

        let ws: WebSocket | null = null;
        let filterNode: BiquadFilterNode;

        try {
            const AudioCtxCls = (window as any).AudioContext || (window as any).webkitAudioContext;
            if (!AudioCtxCls) throw new Error("Web Audio API not supported");

            const ctx = new AudioCtxCls({ sampleRate: 32000 });
            audioCtxRef.current = ctx;

            if (ctx.state === 'suspended') {
                ctx.resume();
            }

            filterNode = ctx.createBiquadFilter();
            filterNode.type = "lowpass";
            filterNode.frequency.value = 6000;

            const gain = ctx.createGain();
            gain.gain.value = isPlaying ? volume : 0;
            gainNodeRef.current = gain;

            filterNode.connect(gain);
            gain.connect(ctx.destination);

            const wsUrl = backendUrl.replace(/^http/, "ws") + `/ws/listen/${call.id}?token=${token}`;
            ws = new WebSocket(wsUrl);
            ws.binaryType = "arraybuffer";
            wsRef.current = ws;
            setWsStatus("connecting");

            ws.onopen = async () => {
                setWsStatus("open");
                setError(null);
                if (ctx.state === 'suspended') await ctx.resume();
            };

            ws.onmessage = async (event) => {
                try {
                    if (event.data instanceof ArrayBuffer) {
                        const audioData = event.data;
                        const float32Data = new Int16Array(audioData);
                        const channels = 1;
                        const sampleRate = 32000;

                        const audioBuffer = ctx.createBuffer(channels, float32Data.length, sampleRate);
                        const channelData = audioBuffer.getChannelData(0);
                        for (let i = 0; i < float32Data.length; i++) {
                            channelData[i] = float32Data[i] / 32768;
                        }

                        const source = ctx.createBufferSource();
                        source.buffer = audioBuffer;
                        source.connect(filterNode);

                        const now = ctx.currentTime;
                        const startTime = Math.max(now, nextStartTimeRef.current);
                        source.start(startTime);

                        nextStartTimeRef.current = startTime + audioBuffer.duration;
                    }
                } catch (err) {
                    console.error("Error processing audio chunk:", err);
                }
            };

            ws.onerror = (e) => {
                console.error("WebSocket error:", e);
                setError("Connection error");
                setWsStatus("error");
            };

            ws.onclose = () => {
                setWsStatus("closed");
            };

        } catch (e: any) {
            console.error("Audio setup failed:", e);
            setError(e.message || "Audio setup failed");
            setWsStatus("error");
        }

        return () => {
            if (ws && ws.readyState === WebSocket.OPEN) {
                ws.close();
            }
            if (audioCtxRef.current) {
                audioCtxRef.current.close();
            }
        };
    }, [call.id, call.has_listen_url, token, isPlaying]);

    return (
        <div className={cn("flex items-center gap-4 w-full", className)}>
            <style dangerouslySetInnerHTML={{
                __html: `
                @keyframes music-bar-anim {
                    0% { height: 20%; opacity: 0.6; }
                    100% { height: 100%; opacity: 1; }
                }
            `}} />

            {/* Play/Pause Button + Visualizer + Volume - Shrinks together */}
            <div className={cn(
                "flex items-center gap-3 rounded-full border transition-all duration-300 pr-4 pl-1 py-1 h-9 flex-1 min-w-0",
                isPlaying
                    ? "bg-blue-50 border-blue-200 shadow-sm"
                    : "bg-slate-50 border-slate-200 hover:bg-slate-100"
            )}>
                <button
                    onClick={toggleMute}
                    className={cn(
                        "flex items-center justify-center h-7 w-7 rounded-full transition-colors focus:outline-none flex-shrink-0",
                        isPlaying ? "bg-white text-blue-600 shadow-sm" : "text-slate-400 hover:text-slate-600",
                        wsStatus === "connecting" && "animate-pulse"
                    )}
                    disabled={wsStatus === "error"}
                    title={isPlaying ? "Mute" : "Unmute"}
                >
                    {wsStatus === "error" ? (
                        <VolumeX size={12} className="text-red-500" />
                    ) : isPlaying ? (
                        <Pause size={12} className="fill-current" />
                    ) : (
                        <Play size={12} className="fill-current ml-0.5" />
                    )}
                </button>

                {/* Visualizer - This shrinks when space is limited */}
                <div className="flex items-center gap-[1px] h-3 flex-1 justify-center min-w-[60px] overflow-hidden">
                    {[40, 70, 50, 90, 60, 80, 40, 60, 50, 75, 45, 85].map((h, i) => (
                        <div
                            key={i}
                            className={cn(
                                "w-[3px] min-w-[1.5px] rounded-full transition-all duration-300",
                                isPlaying && wsStatus === 'open'
                                    ? "bg-blue-500"
                                    : "bg-slate-300 opacity-50"
                            )}
                            style={{
                                height: `${h}%`,
                                animation: isPlaying && wsStatus === 'open'
                                    ? `music-bar-anim ${0.5 + Math.random() * 0.5}s ease-in-out infinite alternate`
                                    : 'none',
                                animationDelay: `${i * 0.05}s`
                            }}
                        />
                    ))}
                </div>

                {/* Volume Slider - Shrinks aggressively */}
                {showVolumeSlider && (
                    <div className="flex items-center w-12 min-w-[24px] group/vol">
                        <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.01"
                            value={volume}
                            onChange={(e) => setVolume(parseFloat(e.target.value))}
                            className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:bg-slate-400 [&::-webkit-slider-thumb]:rounded-full hover:[&::-webkit-slider-thumb]:bg-blue-500 transition-all"
                        />
                    </div>
                )}
            </div>

            {/* Timer - Always visible, never shrinks */}
            {!compact && (
                <div className="flex flex-col justify-center min-w-[60px] flex-shrink-0">
                    <span className="text-sm font-bold text-slate-800 font-mono tracking-wide whitespace-nowrap">{duration}</span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                        <div className={`w-1.5 h-1.5 rounded-full ${wsStatus === 'open' ? 'bg-red-500 animate-pulse' : 'bg-slate-300'}`} />
                        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider whitespace-nowrap">
                            {wsStatus === 'open' ? 'Live' : wsStatus}
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
};
