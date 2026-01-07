import React, { useState } from "react";
import {
    LayoutGrid,
    Phone,
    FileText,
    Users,
    BarChart3,
    Settings,
    LogOut,
    AudioWaveform,
    ChevronLeft,
    ChevronRight,
    User,
    Bell
} from "lucide-react";
import { cn } from "../lib/utils";
import { Button } from "./ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "./ui/tooltip";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "../lib/supabase";

interface SidebarProps {
    user?: {
        email?: string;
        display_name?: string;
        avatar_url?: string;
    } | null;
}

export const Sidebar: React.FC<SidebarProps> = ({ user }) => {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();

    const handleLogout = async () => {
        await supabase.auth.signOut();
        window.location.href = "/";
    };

    const handleComingSoon = (feature: string) => {
        toast.info(`${feature} is coming soon!`, {
            description: "We are working hard to bring this feature to you.",
        });
    };

    const navItems = [
        {
            title: "Dashboard",
            icon: LayoutGrid,
            path: "/dashboard-overview", // Placeholder
            action: () => handleComingSoon("Dashboard Overview"),
        },
        {
            title: "Active Calls",
            icon: Phone,
            path: "/active-calls",
            action: () => handleComingSoon("Active Calls"),
        },
        {
            title: "Call Log",
            icon: FileText,
            path: "/dashboard", // Main route for now
            action: () => navigate("/dashboard"),
        },
        {
            title: "Agents",
            icon: Users,
            path: "/agents",
            action: () => handleComingSoon("Agents"),
        },
        {
            title: "Analytics",
            icon: BarChart3,
            path: "/analytics",
            action: () => handleComingSoon("Analytics"),
        },
    ];

    return (
        <TooltipProvider>
            <div
                className={cn(
                    "relative flex h-screen flex-col border-r border-slate-200 bg-white transition-all duration-300 ease-in-out",
                    isCollapsed ? "w-20" : "w-64"
                )}
            >
                {/* Toggle Button */}
                <Button
                    variant="ghost"
                    size="icon"
                    className="absolute -right-3 top-6 z-10 h-6 w-6 rounded-full border border-slate-200 bg-white shadow-sm hover:bg-slate-50"
                    onClick={() => setIsCollapsed(!isCollapsed)}
                >
                    {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
                </Button>

                {/* Header / Logo */}
                <div className={cn("flex items-center gap-3 p-6", isCollapsed && "justify-center px-2")}>
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-blue-200 shadow-lg">
                        <AudioWaveform size={20} />
                    </div>
                    {!isCollapsed && (
                        <div className="flex flex-col animate-in fade-in duration-300">
                            <span className="text-lg font-bold tracking-tight text-slate-900">
                                UltraCall AI
                            </span>
                            <span className="text-xs font-medium text-slate-500">
                                Admin Console
                            </span>
                        </div>
                    )}
                </div>

                {/* Navigation */}
                <div className="flex-1 space-y-1 py-6 px-3">
                    {navItems.map((item) => {
                        const isActive = location.pathname === item.path || (item.path === '/dashboard' && location.pathname === '/');

                        return (
                            <Tooltip key={item.title} delayDuration={0}>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant={isActive ? "secondary" : "ghost"}
                                        className={cn(
                                            "w-full justify-start gap-3 px-3",
                                            isActive && "bg-blue-50 text-blue-700 hover:bg-blue-100",
                                            !isActive && "text-slate-600 hover:text-slate-900",
                                            isCollapsed && "justify-center px-0"
                                        )}
                                        onClick={item.action}
                                    >
                                        <item.icon size={20} />
                                        {!isCollapsed && <span>{item.title}</span>}
                                    </Button>
                                </TooltipTrigger>
                                {isCollapsed && (
                                    <TooltipContent side="right" className="flex items-center gap-4">
                                        {item.title}
                                    </TooltipContent>
                                )}
                            </Tooltip>
                        );
                    })}
                </div>

                {/* Footer actions */}
                <div className="border-t border-slate-200 p-3 space-y-2">

                    <Tooltip delayDuration={0}>
                        <TooltipTrigger asChild>
                            <Button
                                variant="ghost"
                                className={cn(
                                    "w-full justify-start gap-3 px-3 text-slate-600 hover:text-slate-900",
                                    isCollapsed && "justify-center px-0"
                                )}
                                onClick={() => handleComingSoon("Settings")}
                            >
                                <Settings size={20} />
                                {!isCollapsed && <span>Settings</span>}
                            </Button>
                        </TooltipTrigger>
                        {isCollapsed && <TooltipContent side="right">Settings</TooltipContent>}
                    </Tooltip>

                    <div className="pt-2">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className={cn("w-full p-2 h-auto flex items-center gap-3 hover:bg-slate-100", isCollapsed ? "justify-center" : "justify-start")}>
                                    <Avatar className="h-8 w-8 border border-slate-200">
                                        <AvatarImage src={user?.avatar_url} />
                                        <AvatarFallback className="bg-slate-800 text-white text-xs">
                                            {user?.email?.charAt(0).toUpperCase() || "U"}
                                        </AvatarFallback>
                                    </Avatar>
                                    {!isCollapsed && (
                                        <div className="flex flex-col items-start overflow-hidden text-left">
                                            <span className="text-sm font-medium truncate w-32">{user?.display_name || "User"}</span>
                                            <span className="text-xs text-slate-500 truncate w-32">{user?.email}</span>
                                        </div>
                                    )}
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56 ml-2" side={isCollapsed ? "right" : "bottom"}>
                                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => handleComingSoon("Profile")}>
                                    <User className="mr-2 h-4 w-4" />
                                    <span>Profile</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleComingSoon("Notifications")}>
                                    <Bell className="mr-2 h-4 w-4" />
                                    <span>Notifications</span>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={handleLogout} className="text-red-600 focus:text-red-600">
                                    <LogOut className="mr-2 h-4 w-4" />
                                    <span>Log out</span>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
            </div>
        </TooltipProvider>
    );
};
