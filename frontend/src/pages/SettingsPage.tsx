import { useEffect, useState } from 'react';
import { Layout } from '../components/Layout';
import { ComingSoon } from '../components/ComingSoon';
import { supabase } from '../lib/supabase';
import { Settings } from 'lucide-react';

export const SettingsPage = () => {
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
                title="Settings"
                subtitle="Configure your workspace and global preferences."
                icon={Settings}
                description="Customize platform settings and global configurations for your organization."
            />
        </Layout>
    );
};
