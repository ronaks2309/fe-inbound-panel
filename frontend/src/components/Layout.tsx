import React from "react";
import { Bell, LayoutGrid } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Button } from "./ui/button";
import { Separator } from "./ui/separator";

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
        <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
            {/* Top Navigation Bar */}
            <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white shadow-sm">
                <div className="flex h-16 items-center px-6">
                    {/* Logo Section */}
                    <div className="flex items-center gap-2 mr-8">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white">
                            <LayoutGrid size={20} />
                        </div>
                        <span className="text-lg font-bold tracking-tight text-slate-900">
                            Supervisor.ai
                        </span>
                    </div>

                    {/* Navigation Links */}
                    <nav className="flex items-center gap-1 mx-6">
                        <Button variant="ghost" className="text-blue-600 bg-blue-50 font-medium">
                            Call Monitor
                        </Button>
                        <Button variant="ghost" className="text-slate-500 hover:text-slate-900">
                            Reports
                        </Button>
                        <Button variant="ghost" className="text-slate-500 hover:text-slate-900">
                            Settings
                        </Button>
                    </nav>

                    <div className="ml-auto flex items-center gap-4">
                        {/* Status Toggle */}
                        <div className="flex items-center rounded-lg bg-slate-100 p-1">
                            <button className="rounded-md bg-white px-3 py-1 text-xs font-semibold text-blue-600 shadow-sm border border-slate-200">
                                ONLINE
                            </button>
                            <button className="px-3 py-1 text-xs font-medium text-slate-500 hover:text-slate-700">
                                OFFLINE
                            </button>
                        </div>

                        <Separator orientation="vertical" className="h-6" />

                        {/* Notifications */}
                        <Button variant="ghost" size="icon" className="text-slate-400 hover:text-slate-600">
                            <Bell size={20} />
                        </Button>

                        {/* User Profile */}
                        <Avatar className="h-9 w-9 border border-slate-200 cursor-pointer">
                            <AvatarImage src={user?.avatar_url} />
                            <AvatarFallback className="bg-slate-800 text-white text-xs">
                                {user?.email?.charAt(0).toUpperCase() || "U"}
                            </AvatarFallback>
                        </Avatar>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="mx-auto w-full p-6">
                {children}
            </main>
        </div>
    );
};
