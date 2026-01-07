import React, { useState, useEffect } from "react";
import { Plus, Filter } from "lucide-react";
import { Button } from "../components/ui/button";
import { LiveCallTile } from "../components/LiveCallTile";
import type { Call } from "../components/CallDashboard";
import { Layout } from "../components/Layout";
import { supabase } from "../lib/supabase";

// MOCK DATA GENERATOR
const generateMockCalls = (): (Call & { messages?: any[] })[] => [
    {
        id: "call_1",
        phone_number: "+1 (555) 012-3456",
        username: "Sarah Jenkins",
        status: "in-progress",
        created_at: new Date().toISOString(),
        started_at: new Date(Date.now() - 1000 * 263).toISOString(), // 4:23 ago
        duration: 263,
        sentiment: "Very Satisfied",
        final_transcript: "Yes, exactly. I didn't authorize this subscription renewal.",
        has_listen_url: true,
        user_id: "user_1",
        hasRecording: false,
        detailsLoaded: true,
        ended_at: null,
        messages: [
            { role: 'ai', content: "Hi Sarah, thanks for calling. How can I help you today?" },
            { role: 'user', content: "I have a question about my bill." },
            { role: 'ai', content: "Sure, I can help with that. What specifically would you like to know?" },
            { role: 'user', content: "There's a charge of $49.99 I don't recognize." },
            { role: 'ai', content: "Let me check that for you. One moment please." },
            { role: 'ai', content: "It looks like a renewal for the Premium plan." },
            { role: 'user', content: "But I cancelled that last month!" },
            { role: 'ai', content: "I see the cancellation request here. It seems it didn't process correctly." },
            { role: 'ai', content: "I can reverse that charge for you immediately." },
            { role: 'user', content: "Oh great, thank you so much." },
            { role: 'ai', content: "You're welcome. Is there anything else?" },
            { role: 'user', content: "No that's it." },
            { role: 'ai', content: "Have a wonderful day then!" }
        ]
    },
    {
        id: "call_2",
        phone_number: "+1 (555) 098-7654",
        username: "Mark Doe",
        status: "in-progress",
        created_at: new Date().toISOString(),
        started_at: new Date(Date.now() - 1000 * 72).toISOString(), // 1:12 ago
        duration: 72,
        sentiment: "Neutral",
        final_transcript: "Yeah, I just want to know when my package is arriving. It's been 3 days late.",
        has_listen_url: true,
        user_id: "user_2",
        hasRecording: false,
        detailsLoaded: true,
        ended_at: null
    },
    {
        id: "call_3",
        phone_number: "+1 (555) 456-7890",
        username: "Emily Chen",
        status: "in-progress",
        created_at: new Date().toISOString(),
        started_at: new Date(Date.now() - 1000 * 525).toISOString(), // 8:45 ago
        duration: 525,
        sentiment: "Unsatisfied",
        final_transcript: "This is unacceptable! I've been down for 4 hours. I need a manager now!",
        has_listen_url: true,
        user_id: "user_3",
        hasRecording: false,
        detailsLoaded: true,
        ended_at: null
    },
    {
        id: "call_4",
        phone_number: "+1 (555) 234-5678",
        username: "Michael Ross",
        status: "in-progress",
        created_at: new Date().toISOString(),
        started_at: new Date(Date.now() - 1000 * 750).toISOString(), // 12:30 ago
        duration: 750,
        sentiment: "Very Satisfied",
        final_transcript: "No, that was very helpful. You've been great.",
        has_listen_url: true,
        user_id: "user_4",
        hasRecording: false,
        detailsLoaded: true,
        ended_at: null
    },
    {
        id: "call_5",
        phone_number: "+1 (555) 111-2222",
        username: "John Smith",
        status: "in-progress",
        created_at: new Date().toISOString(),
        started_at: new Date(Date.now() - 1000 * 15).toISOString(), // 15s ago
        duration: 15,
        sentiment: "Insufficient", // Default/Insufficient case
        final_transcript: "Hello? Is anyone there?",
        has_listen_url: true,
        user_id: "user_5",
        hasRecording: false,
        detailsLoaded: true,
        ended_at: null
    },
    {
        id: "call_6",
        phone_number: "+1 (555) 333-4444",
        username: "Angry Alice",
        status: "in-progress",
        created_at: new Date().toISOString(),
        started_at: new Date(Date.now() - 1000 * 120).toISOString(), // 2 mins ago
        duration: 120,
        sentiment: "Very Unsatisfied", // Unsatisfied placeholder
        final_transcript: "I am extremely frustrated with this service. Cancel it immediately.",
        has_listen_url: true,
        user_id: "user_6",
        hasRecording: false,
        detailsLoaded: true,
        ended_at: null,
        messages: [
            { role: 'ai', content: "Hello calling from Acme Corp." },
            { role: 'user', content: "Finally! I've been on hold for ages." },
            { role: 'ai', content: "I apologize for the wait. How can I assist you?" },
            { role: 'user', content: "Your service is terrible. Nothing works." },
            { role: 'ai', content: "I'm sorry to hear that. Can you explain what is failing?" },
            { role: 'user', content: "Everything! The login is broken, the app crashes." },
            { role: 'user', content: "I want a refund right now." },
            { role: 'ai', content: "I understand your frustration. Let me look up your account." },
            { role: 'user', content: "I am extremely frustrated with this service. Cancel it immediately." }
        ]
    }
];

export const LiveMonitorPage: React.FC = () => {
    // using constant for mock data to ensure HMR updates reflect immediately
    const calls = generateMockCalls();
    const [userInfo, setUserInfo] = useState<any>(null);

    useEffect(() => {
        supabase.auth.getUser().then(({ data: { user } }) => {
            if (user) {
                setUserInfo(user);
            }
        });
    }, []);

    return (
        <Layout user={userInfo}>
            <div className="flex flex-col h-full bg-slate-50/50">
                {/* Page Header - Aligned with Dashboard style */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Active Sessions</h2>
                            {/* Live Stats Badge next to title */}
                            <div className="flex items-center gap-2 bg-emerald-50 px-2 py-1 rounded-full border border-emerald-100">
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                </span>
                                <span className="text-xs font-semibold text-emerald-700">5 Live</span>
                            </div>
                        </div>
                        <p className="text-slate-500">Real-time monitoring of AI agent interactions</p>
                    </div>

                    <div className="flex items-center gap-3">
                        <Button variant="outline" className="bg-white border-slate-200 shadow-sm text-slate-700 hover:bg-slate-50">
                            <Filter size={16} className="mr-2" />
                            Filter
                        </Button>
                        <Button className="bg-slate-900 text-white hover:bg-slate-800 shadow-lg shadow-slate-900/10">
                            <Plus size={16} className="mr-2" />
                            Inject Agent
                        </Button>
                    </div>
                </div>

                {/* Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6 pb-20">
                    {calls.map(call => (
                        <LiveCallTile
                            key={call.id}
                            call={call}
                            onWhisper={(id) => console.log("Whisper", id)}
                            onTakeOver={(id) => console.log("Take over", id)}
                        />
                    ))}
                </div>
            </div>
        </Layout>
    );
};
