import { useEffect, useState } from 'react';
import { Layout } from '../components/Layout';
import { ComingSoon } from '../components/ComingSoon';
import { supabase } from '../lib/supabase';
import { User } from 'lucide-react';

export const ProfilePage = () => {
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
                title="Profile"
                subtitle="Manage your personal account settings."
                icon={User}
                description="Update your personal information and account preferences."
            />
        </Layout>
    );
};
