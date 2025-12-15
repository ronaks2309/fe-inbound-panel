import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { type Session } from '@supabase/supabase-js';

export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
    const [session, setSession] = useState<Session | null | undefined>(undefined);

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
        });

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
        });

        return () => subscription.unsubscribe();
    }, []);

    // Show nothing while loading (session is undefined)
    if (session === undefined) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
        );
    }

    // Not logged in -> Redirect
    if (!session) {
        return <Navigate to="/login" replace />;
    }

    // Logged in -> Show content
    return <>{children}</>;
};
