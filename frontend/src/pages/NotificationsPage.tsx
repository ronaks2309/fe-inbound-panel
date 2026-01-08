import { useEffect, useState } from 'react';
import { Layout } from '../components/Layout';
import { ComingSoon } from '../components/ComingSoon';
import { supabase } from '../lib/supabase';
import { Bell } from 'lucide-react';

export const NotificationsPage = () => {
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
                title="Notifications"
                subtitle="View your latest alerts and updates."
                icon={Bell}
                description="Stay updated with important alerts and system activities."
            />
        </Layout>
    );
};
