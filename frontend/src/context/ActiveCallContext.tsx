import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';

// Define the shape of our context
interface ActiveCallContextType {
    activeCallCount: number;
    lastNewCallId: string | null;
}

const ActiveCallContext = createContext<ActiveCallContextType>({
    activeCallCount: 0,
    lastNewCallId: null,
});

export const useActiveCalls = () => useContext(ActiveCallContext);

export const ActiveCallProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [activeCallCount, setActiveCallCount] = useState(0);
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

            const ws = new WebSocket(wsUrl);
            wsRef.current = ws;

            ws.onopen = () => {
                console.log("[GlobalContext] WS Connected");
            };

            ws.onmessage = (event) => {
                try {
                    const msg = JSON.parse(event.data);

                    // We expect 'call-upsert' messages for active calls
                    // OR a full list if the backend supported it, but currently it sends upserts.

                    // Actually, for a pure COUNT, we need to know the full state. 
                    // The current /ws/dashboard endpoint sends individual call updates.
                    // It doesn't send a "list" on connect unless the backend is modified to do so.
                    // However, usually detailed "dashboard" sockets send the initial state.

                    // CAUTION: If the backend DOESN'T send the full list on connect, 
                    // our count will start at 0 and only increment as updates come in.
                    // This is a limitation of the current backend specific to the user's setup.
                    // Ideally, we'd fetch the initial list via REST then subscribe.

                    if (msg.type === "call-upsert") {
                        const call = msg.call;
                        const status = (call.status || "").toLowerCase();
                        const isActive = ["in-progress", "ringing", "queued"].includes(status);
                        const callId = String(call.id);

                        setActiveCallCount(() => {
                            // This logic is tricky without a full list state.
                            // If we don't store the list, we can't know the exact count if we miss removals.
                            // But for now, let's try to track unique active IDs in the ref.

                            const known = knownCallIdsRef.current;

                            if (isActive) {
                                if (!known.has(callId)) {
                                    known.add(callId);

                                    // TRIGGER NOTIFICATION for NEW call
                                    const caller = call.phoneNumber || call.phone_number || "Unknown Caller";
                                    toast.success(`Incoming Call from ${caller}`, {
                                        description: "A new call has started.",
                                        duration: 5000,
                                        action: {
                                            label: "View",
                                            onClick: () => window.location.href = "/active-calls"
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
                if (active) {
                    // Only reconnect if we still have a session? 
                    // For now, simple retry if active
                    reconnectTimeoutRef.current = setTimeout(() => connectWs(token), 3000);
                }
            };
        };

        // Listen for Auth Changes to Connect/Disconnect
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            // Note: onAuthStateChange fires SIGNED_IN for initial session too, 
            // so we don't strictly need the manual getSession() call below if we trust this fires.
            // But sometimes it doesn't fire immediately on mount if session is cached.

            if (event === 'SIGNED_IN' && session?.access_token) {
                connectWs(session.access_token);
            } else if (event === 'SIGNED_OUT') {
                if (wsRef.current) {
                    wsRef.current.onclose = null;
                    wsRef.current.close();
                    wsRef.current = null;
                }
                setActiveCallCount(0);
                knownCallIdsRef.current.clear();
            } else if (event === 'TOKEN_REFRESHED' && session?.access_token) {
                // Ideally transparent, but if token changes we might want to reconnect?
                // For now, let's assume WS stays valid until it dies.
            }
        });

        // Initial check - Only connect if we suspect onAuthStateChange won't fire OR just to be safe.
        // But we must debounce it against the listener.
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session?.access_token) {
                connectWs(session.access_token);
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
        <ActiveCallContext.Provider value={{ activeCallCount, lastNewCallId: null }}>
            {children}
            {/* We could render the toast here or let components handle it */}
        </ActiveCallContext.Provider>
    );
};
