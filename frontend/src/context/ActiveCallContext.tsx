import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

// Define the shape of our context
interface ActiveCallContextType {
    activeCallCount: number;
    sendMessage: (msg: any) => void;
    subscribe: (callback: (msg: any) => void) => () => void;
    isWsConnected: boolean;
}

const ActiveCallContext = createContext<ActiveCallContextType>({
    activeCallCount: 0,
    sendMessage: () => { },
    subscribe: () => () => { },
    isWsConnected: false,
});

export const useActiveCalls = () => useContext(ActiveCallContext);

export const ActiveCallProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [activeCallCount, setActiveCallCount] = useState(0);
    const [isWsConnected, setIsWsConnected] = useState(false);
    const navigate = useNavigate();

    // Event Listeners for consumers (like LiveMonitorPage)
    const listenersRef = useRef<Set<(msg: any) => void>>(new Set());

    const subscribe = (callback: (msg: any) => void) => {
        listenersRef.current.add(callback);
        return () => {
            listenersRef.current.delete(callback);
        };
    };

    const sendMessage = (msg: any) => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify(msg));
        } else {
            console.warn("[GlobalContext] Only can send message when WS is open");
        }
    };

    // const [lastNewCallId, setLastNewCallId] = useState<string | null>(null); // Unused for now
    const wsRef = useRef<WebSocket | null>(null);
    const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Track processed call IDs to avoid duplicate notifications for the same call
    const knownCallIdsRef = useRef<Set<string>>(new Set());

    useEffect(() => {
        let active = true;
        let ws: WebSocket | null = null;

        const connectWs = async (token: string) => {
            if (!active) return;

            // If we already have a connected/connecting socket, don't kill it just to make a new one
            // unless the token changed significantly (hard to track) or it's dead.
            if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) {
                // console.log("[GlobalContext] Already connected, skipping reconnect.");
                return;
            }

            // Close existing if any (e.g. closing or closed state)
            if (wsRef.current) {
                wsRef.current.onclose = null;
                wsRef.current.close();
            }

            // Use the same dashboard endpoint which streams all active calls
            const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";
            let wsUrl = backendUrl.replace(/^http/, "ws") + "/ws/dashboard";
            wsUrl += `?token=${token}`;

            ws = new WebSocket(wsUrl);
            wsRef.current = ws;

            ws.onopen = () => {
                console.log("[GlobalContext] WS Connected");
                setIsWsConnected(true);
            };

            ws.onmessage = (event) => {
                try {
                    const msg = JSON.parse(event.data);
                    // Debug log for incoming messages
                    console.debug("[GlobalContext] WS Message:", msg.type, msg.callId);

                    // 1. Notify Subscribers (LiveMonitorPage)
                    listenersRef.current.forEach(listener => listener(msg));

                    // 2. Handle Global Badge / Notifications (Internal Logic)
                    if (msg.type === "call-upsert") {
                        const call = msg.call;
                        const status = (call.status || "").toLowerCase();
                        const isActive = ["in-progress", "ringing", "queued"].includes(status);
                        const callId = String(call.id);

                        setActiveCallCount(() => {
                            const known = knownCallIdsRef.current;

                            if (isActive) {
                                if (!known.has(callId)) {
                                    known.add(callId);

                                    // TRIGGER NOTIFICATION for NEW call
                                    const caller = call.phoneNumber || call.phone_number || "Unknown Caller";
                                    // Only notify if we haven't just fetched it (simple heuristic or acceptable dup for now)
                                    // Actually, if we fetch initial state, we add them to 'known'. 
                                    // So this only fires if it wasn't known.
                                    toast.success(`Incoming Call from ${caller}`, {
                                        description: "A new call has started.",
                                        duration: 5000,
                                        action: {
                                            label: "View",
                                            onClick: () => navigate("/active-calls")
                                        }
                                    });

                                    playNotificationSound();

                                    return known.size;
                                }
                            } else {
                                // Call ended
                                if (known.has(callId)) {
                                    known.delete(callId);
                                    return known.size;
                                }
                            }
                            return known.size;
                        });
                    }
                } catch (e) {
                    // ignore
                }
            };

            ws.onclose = () => {
                setIsWsConnected(false);
                if (active) {
                    // Only reconnect if we still have a session? 
                    // For now, simple retry if active
                    console.log("[GlobalContext] WS Closed. Reconnecting in 3s...");
                    reconnectTimeoutRef.current = setTimeout(() => connectWs(token), 3000);
                }
            };
        };

        const fetchInitialState = async (token: string, user: any) => {
            try {
                const metadata = user.user_metadata || {};
                const tenantId = metadata.tenant_id || "demo-client";
                const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";

                let url = `${backendUrl}/api/${tenantId}/calls?status=in-progress,queued,ringing`;
                if (metadata.role === 'user') {
                    url += `&user_id=${user.id}`;
                }

                const res = await fetch(url, {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                });

                if (res.ok) {
                    const rawCalls = await res.json();

                    // Filter for strictly active just in case API returns more
                    // (Though query param status=... should handle it)
                    const activeCalls = rawCalls.filter((c: any) =>
                        ['in-progress', 'ringing', 'queued'].includes((c.status || '').toLowerCase())
                    );

                    // Sync Ref and State
                    const known = knownCallIdsRef.current;
                    activeCalls.forEach((c: any) => {
                        known.add(String(c.id));
                    });

                    setActiveCallCount(known.size);
                }
            } catch (e) {
                console.error("Failed to fetch initial active calls", e);
            }
        };

        // Listen for Auth Changes to Connect/Disconnect
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'SIGNED_IN' && session?.access_token) {
                connectWs(session.access_token);
                // Also fetch initial state
                fetchInitialState(session.access_token, session.user);
            } else if (event === 'SIGNED_OUT') {
                if (wsRef.current) {
                    wsRef.current.onclose = null;
                    wsRef.current.close();
                    wsRef.current = null;
                }
                setActiveCallCount(0);
                knownCallIdsRef.current.clear();
                setIsWsConnected(false);
            } else if (event === 'TOKEN_REFRESHED' && session?.access_token) {
                // optionally reconnect or re-fetch
            }
        });

        // Initial check 
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session?.access_token) {
                connectWs(session.access_token);
                fetchInitialState(session.access_token, session.user);
            }
        });

        return () => {
            active = false;
            subscription.unsubscribe();
            if (wsRef.current) {
                wsRef.current.onclose = null;
                wsRef.current.close();
            }
            if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
        };
    }, []);

    const playNotificationSound = () => {
        try {
            // Use Web Audio API for a reliable beep without external files
            const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
            if (!AudioContext) return;

            const ctx = new AudioContext();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.type = 'sine';
            osc.frequency.setValueAtTime(440, ctx.currentTime); // A4
            osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.1); // Slide up to A5
            gain.gain.setValueAtTime(0.1, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);

            osc.start();
            osc.stop(ctx.currentTime + 0.5);
        } catch (e) {
            console.error("Audio play failed", e);
        }
    };

    return (
        <ActiveCallContext.Provider value={{ activeCallCount, sendMessage, subscribe, isWsConnected }}>
            {children}
            {/* We could render the toast here or let components handle it */}
        </ActiveCallContext.Provider>
    );
};
