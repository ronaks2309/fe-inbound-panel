import { useEffect, useState } from 'react';
import { Layout } from '../components/Layout';
import { ComingSoon } from '../components/ComingSoon';
import { supabase } from '../lib/supabase';
import { Bot } from 'lucide-react';

export const AgentsPage = () => {
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
            <ComingSoon
                title="Agents"
                subtitle="Manage your AI agents and their configurations."
                icon={Bot}
                description="Configure AI personalities, voice settings, and behavior rules."
            />
        </Layout>
    );
};
