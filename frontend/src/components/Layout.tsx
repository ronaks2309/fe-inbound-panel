import { Sidebar } from "./Sidebar";

interface LayoutProps {
    children: React.ReactNode;
    user?: {
        email?: string;
        display_name?: string;
        avatar_url?: string;
    } | null;
}

export const Layout: React.FC<LayoutProps> = ({ children, user }) => {
    return (
        <div className="flex h-screen overflow-hidden bg-slate-50 font-sans text-slate-900">
            {/* Sidebar Navigation */}
            <Sidebar user={user} />

            {/* Main Content Area */}
            <div className="flex flex-1 flex-col overflow-hidden">
                <main className="flex-1 overflow-hidden relative">
                    {children}
                </main>
            </div>
        </div>
    );
};
