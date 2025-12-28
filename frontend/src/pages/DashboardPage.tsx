import { useEffect, useState } from 'react';
import CallDashboard from '../components/CallDashboard';
import { Layout } from '../components/Layout';
import { supabase } from '../lib/supabase';

export const DashboardPage = () => {
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
            {/* Pass user info down so we don't fetch twice */}
            <CallDashboard userInfo={userInfo} />
        </Layout>
    );
}
