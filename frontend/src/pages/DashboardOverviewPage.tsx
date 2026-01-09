import { useEffect, useState } from 'react';
import { Layout } from '../components/Layout';
import { ComingSoon } from '../components/ComingSoon';
import { supabase } from '../lib/supabase';
import { LayoutGrid } from 'lucide-react';

export const DashboardOverviewPage = () => {
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
                title="Dashboard"
                subtitle="Overview of your call center performance."
                icon={LayoutGrid}
                description="Track key metrics and call center performance in real-time."
            />
        </Layout>
    );
};
