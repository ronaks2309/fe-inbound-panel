import React from 'react';
import { type LucideIcon, Sparkles } from "lucide-react";

interface ComingSoonProps {
    title: string;
    subtitle: string;
    icon?: LucideIcon;
    description?: string;
}

export const ComingSoon: React.FC<ComingSoonProps> = ({
    title,
    subtitle,
    icon: Icon = Sparkles,
    description = "We're crafting an exceptional experience for you. Stay tuned for something amazing."
}) => {
    return (
        <div className="flex flex-col h-full bg-slate-50">
            {/* Page Header */}
            <div className="flex items-center justify-between px-6 py-3 bg-white border-b border-slate-200 shadow-sm transition-all duration-200">
                <div>
                    <h1 className="text-xl font-semibold tracking-tight text-slate-900">{title}</h1>
                    <p className="text-slate-500 text-xs">
                        {subtitle}
                    </p>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 overflow-auto flex items-center justify-center p-6 bg-gradient-to-b from-slate-50 to-white">
                <div className="flex flex-col items-center justify-center text-center max-w-md mx-auto space-y-6">

                    {/* Elegant Icon Container */}
                    <div className="relative group">
                        <div className="absolute -inset-1 bg-gradient-to-r from-blue-100 to-indigo-100 rounded-full blur opacity-75 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>
                        <div className="relative bg-white p-6 rounded-full shadow-lg border border-slate-100">
                            <Icon className="w-12 h-12 text-blue-600" strokeWidth={1.5} />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <h2 className="text-2xl font-semibold text-slate-900 tracking-tight">{title} is coming soon</h2>
                        <p className="text-slate-500 text-base leading-relaxed max-w-xs mx-auto">
                            {description}
                        </p>
                    </div>

                    <div className="h-1 w-24 bg-gradient-to-r from-transparent via-blue-200 to-transparent rounded-full opacity-50"></div>
                </div>
            </div>
        </div>
    );
};
