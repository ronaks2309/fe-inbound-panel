import React from "react";
import { Bell, LayoutGrid, LogOut, User } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Button } from "./ui/button";
import { Separator } from "./ui/separator";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { supabase } from "../lib/supabase";
import { toast } from "sonner";

interface LayoutProps {
    children: React.ReactNode;
    user?: {
        email?: string;
        display_name?: string;
        avatar_url?: string;
    } | null;
}

export const Layout: React.FC<LayoutProps> = ({ children, user }) => {

    const handleLogout = async () => {
        // Sign out from Supabase
        await supabase.auth.signOut();
        // Redirect to login/home
        // Since we are in SPA, we might need to rely on Auth state change listener in App.tsx to redirect,
        // or force a window location change.
        window.location.href = "/";
    };

    const handleFeatureComingSoon = (featureName: string) => {
        const messages = [
            `Hold your horses! ${featureName} is still in the oven. 🐴`,
            `The elves are still crafting the ${featureName} section. Check back soon! 🧝`,
            `Whoops! ${featureName} isn't ready for prime time just yet. 🎬`,
            `We're polishing ${featureName} to perfection. Patience is a virtue! 💎`,
            `Construction zone! ${featureName} is getting a makeover. 🚧`,
            `Our bit-hamsters are working hard on ${featureName}. Give them a moment! 🐹`,
            `404: ${featureName} motivation found, but code is still loading. 🔋`
        ];
        const randomMessage = messages[Math.floor(Math.random() * messages.length)];
        toast.info(randomMessage, {
            description: "Thanks for exploring! We're building this as fast as we can."
        });
    };

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
                        <Button
                            variant="ghost"
                            className="text-slate-500 hover:text-slate-900"
                            onClick={() => handleFeatureComingSoon("Reports")}
                        >
                            Reports
                        </Button>
                        <Button
                            variant="ghost"
                            className="text-slate-500 hover:text-slate-900"
                            onClick={() => handleFeatureComingSoon("Settings")}
                        >
                            Settings
                        </Button>
                    </nav>

                    <div className="ml-auto flex items-center gap-4">
                        {/* Status Toggle */}
                        <div className="flex items-center rounded-lg bg-slate-100 p-1">
                            <button
                                className="rounded-md bg-white px-3 py-1 text-xs font-semibold text-blue-600 shadow-sm border border-slate-200"
                                onClick={() => handleFeatureComingSoon("Status Toggle")}
                            >
                                ONLINE
                            </button>
                            <button
                                className="px-3 py-1 text-xs font-medium text-slate-500 hover:text-slate-700"
                                onClick={() => handleFeatureComingSoon("Status Toggle")}
                            >
                                OFFLINE
                            </button>
                        </div>

                        <Separator orientation="vertical" className="h-6" />

                        {/* Notifications */}
                        <Button
                            variant="ghost"
                            size="icon"
                            className="text-slate-400 hover:text-slate-600"
                            onClick={() => handleFeatureComingSoon("Notifications")}
                        >
                            <Bell size={20} />
                        </Button>

                        {/* User Profile Dropdown */}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Avatar className="h-9 w-9 border border-slate-200 cursor-pointer hover:ring-2 hover:ring-slate-100 transition-all">
                                    <AvatarImage src={user?.avatar_url} />
                                    <AvatarFallback className="bg-slate-800 text-white text-xs">
                                        {user?.email?.charAt(0).toUpperCase() || "U"}
                                    </AvatarFallback>
                                </Avatar>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56">
                                <DropdownMenuLabel>
                                    <div className="flex flex-col space-y-1">
                                        <p className="text-sm font-medium leading-none">{user?.display_name || "User"}</p>
                                        <p className="text-xs leading-none text-muted-foreground text-slate-500 font-normal">
                                            {user?.email}
                                        </p>
                                    </div>
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => handleFeatureComingSoon("Profile")}>
                                    <User className="mr-2 h-4 w-4" />
                                    <span>Profile</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleFeatureComingSoon("Notifications")}>
                                    <Bell className="mr-2 h-4 w-4" />
                                    <span>Notifications</span>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={handleLogout} className="text-red-600 focus:text-red-600 focus:bg-red-50">
                                    <LogOut className="mr-2 h-4 w-4" />
                                    <span>Log out</span>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
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
