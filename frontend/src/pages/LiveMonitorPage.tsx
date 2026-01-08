import React, { useEffect, useState, useRef } from "react";
import { LiveCallTile } from "../components/LiveCallTile";
import { AlertCircle, Phone, Loader2, Filter } from "lucide-react";
import { supabase } from "../lib/supabase";
import type { Call } from "../components/CallDashboard";
import { Layout } from "../components/Layout";
import { Button } from "../components/ui/button";

const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";

// Helper to normalize backend/WS data to Call type
const normalizeCall = (c: any): Call => {
    return {
        id: String(c.id),
        client_id: c.client_id || c.clientId,
        phone_number: c.phone_number ?? c.phoneNumber ?? null,
        status: c.status ?? null,
        started_at: c.started_at ?? c.startedAt ?? null,
        created_at: c.created_at ?? c.createdAt ?? new Date().toISOString(),
        ended_at: c.ended_at ?? c.endedAt ?? null,
        has_listen_url: c.has_listen_url ?? c.hasListenUrl ?? Boolean(c.listenUrl) ?? false,
        user_id: c.user_id ?? c.userId ?? null,
        username: c.username ?? null,
        duration: c.duration ?? null,

        hasTranscript: c.hasTranscript ?? c.has_transcript ?? false,
        hasLiveTranscript: c.hasLiveTranscript ?? c.has_live_transcript ?? !!c.live_transcript,
        hasFinalTranscript: c.hasFinalTranscript ?? c.has_final_transcript ?? !!c.final_transcript,
        hasRecording: c.hasRecording ?? c.has_recording ?? !!c.recording_url,

        recording_url: c.recording_url ?? c.recordingUrl ?? null,
        live_transcript: c.live_transcript ?? c.liveTranscript ?? null,
        final_transcript: c.final_transcript ?? c.finalTranscript ?? null,
        summary: c.summary ?? null,

        detailsLoaded: c.detailsLoaded ?? false,
        sentiment: c.sentiment ?? null,
        disposition: c.disposition ?? null,
        notes: c.notes ?? null,
        feedback_rating: c.feedback_rating ?? null,
        feedback_text: c.feedback_text ?? null,
        signed_recording_url: c.signed_recording_url ?? null,
    };
};

export const LiveMonitorPage: React.FC = () => {
    const [calls, setCalls] = useState<Call[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [userInfo, setUserInfo] = useState<any>(null);
    const wsRef = useRef<WebSocket | null>(null);
    const retryTimeoutRef = useRef<number | null>(null);

    // Fetch User Info (for Layout)
    useEffect(() => {
        supabase.auth.getUser().then(({ data: { user } }) => {
            if (user) setUserInfo(user);
        });
    }, []);

    // Fetch initial active calls
    const fetchActiveCalls = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            const metadata = session.user.user_metadata || {};
            const tenantId = metadata.tenant_id || "demo-client";

            let url = `${backendUrl}/api/${tenantId}/calls`;
            if (metadata.role === 'user') {
                url += `?user_id=${session.user.id}`;
            }

            const res = await fetch(url, {
                headers: {
                    Authorization: `Bearer ${session.access_token}`
                }
            });

            if (!res.ok) throw new Error("Failed to fetch calls");
            const rawCalls = await res.json();
            const allCalls: Call[] = rawCalls.map(normalizeCall);

            // Filter inactive
            const active = allCalls.filter(c =>
                ['in-progress', 'ringing', 'queued'].includes(c.status?.toLowerCase() || '')
            );
            setCalls(active);
        } catch (err) {
            console.error(err);
            setError("Could not load active calls");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchActiveCalls();

        // WebSocket Setup
        const connectWs = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            const wsUrl = backendUrl.replace(/^http/, "ws") + `/ws/dashboard?token=${session.access_token}`;
            const ws = new WebSocket(wsUrl);
            wsRef.current = ws;

            ws.onopen = () => {
                console.log("Live Monitor WS Connected");
                // Note: We can't access 'calls' state here reliably due to closure if not in dependency
                // But we rely on the separate effect below for initial subscriptions.
            };

            ws.onmessage = (event) => {
                try {
                    const msg = JSON.parse(event.data);

                    if (msg.type === 'call-upsert') {
                        const rawCall = msg.data || msg.call;
                        if (!rawCall) return;

                        const updatedCall = normalizeCall(rawCall);
                        const isActive = ['in-progress', 'in_progress', 'ringing', 'queued'].includes(updatedCall.status?.toLowerCase() || '');

                        setCalls(prev => {
                            const existsIndex = prev.findIndex(c => c.id === updatedCall.id);

                            if (isActive) {
                                if (existsIndex === -1) {
                                    // NEW active call -> Subscribe!
                                    if (ws.readyState === WebSocket.OPEN) {
                                        console.log("Subscribing to new call:", updatedCall.id);
                                        ws.send(JSON.stringify({ type: 'subscribe', callId: updatedCall.id }));
                                    }
                                    return [updatedCall, ...prev];
                                } else {
                                    // Update existing
                                    const newCalls = [...prev];
                                    newCalls[existsIndex] = { ...prev[existsIndex], ...updatedCall };
                                    return newCalls;
                                }
                            } else {
                                // Not active anymore -> Remove
                                return prev.filter(c => c.id !== updatedCall.id);
                            }
                        });
                    } else if (msg.type === 'transcript-update') {
                        setCalls(prev => prev.map(c => {
                            if (c.id === msg.callId) {
                                return {
                                    ...c,
                                    live_transcript: msg.fullTranscript,
                                    status: msg.status || c.status
                                };
                            }
                            return c;
                        }));
                    }

                } catch (e) {
                    console.error("WS Message Parse Error", e);
                }
            };

            ws.onclose = () => {
                console.log("WS Closed, retrying...");
                retryTimeoutRef.current = setTimeout(connectWs, 3000); // number is correct for browser
            };
        };

        connectWs();

        return () => {
            wsRef.current?.close();
            if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
        };
    }, []); // Run once on mount

    // Separate effect to subscribe to initial calls once WS is open
    useEffect(() => {
        const ws = wsRef.current;
        if (ws && ws.readyState === WebSocket.OPEN && calls.length > 0) {
            calls.forEach(c => {
                // Deduplicate subscriptions involves backend tracking or ensuring calls list stable
                // Just send it, backend handles multiple subscribes gracefully usually
                ws.send(JSON.stringify({ type: 'subscribe', callId: c.id }));
            });
        }
    }, [calls.length]); // Re-run when calls count changes (fetch done or new call added)

    // Handlers
    const handleWhisper = (_callId: string) => {
        alert("Whisper functionality coming soon!");
    };

    const handleTakeOver = async (callId: string) => {
        if (!confirm("Are you sure you want to take over this call? It will be transferred to your number.")) return;
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            const res = await fetch(`${backendUrl}/api/${session.user.id}/calls/${callId}/force-transfer`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${session.access_token}`
                },
                body: JSON.stringify({ agent_phone_number: "+15550000000" }) // TODO: Get real agent number
            });

            if (res.ok) {
                console.log("Transfer initiated");
            } else {
                alert("Failed to take over call");
            }

        } catch (e) {
            console.error("Take over error", e);
        }
    };

    return (
        <Layout user={userInfo}>
            <div className="flex flex-col h-full">
                {/* Page Header */}
                <div className="flex items-center justify-between px-6 py-3 bg-white border-b border-slate-200 shadow-sm">
                    <div>
                        <h1 className="text-xl font-semibold tracking-tight text-slate-900">Active Calls</h1>
                        <p className="text-slate-500 text-xs">
                            Real-time oversight of ongoing conversations.
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-9 gap-2"
                            onClick={() => {/* TODO: Implement filters */ }}
                        >
                            <Filter size={14} />
                            Filters
                        </Button>
                    </div>
                </div>

                {/* Main Content */}
                <div className="flex-1 overflow-auto p-6 space-y-6">
                    {isLoading ? (
                        <div className="flex items-center justify-center min-h-[60vh]">
                            <Loader2 className="animate-spin text-slate-400" size={32} />
                        </div>
                    ) : error ? (
                        <div className="p-8 text-center text-red-500 bg-red-50 rounded-xl my-8 mx-auto max-w-lg border border-red-100">
                            <AlertCircle className="mx-auto mb-2" />
                            {error}
                        </div>
                    ) : calls.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-center">
                            <Phone className="w-16 h-16 text-slate-300 mb-4" />
                            <h2 className="text-xl font-semibold text-slate-700">No Active Calls</h2>
                            <p className="text-slate-500 mt-2 max-w-md">
                                There are currently no calls in progress. Incoming calls will appear here automatically.
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6 pb-6">
                            {calls.map(call => (
                                <LiveCallTile
                                    key={call.id}
                                    call={call}
                                    onWhisper={handleWhisper}
                                    onTakeOver={handleTakeOver}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </Layout>
    );
};
