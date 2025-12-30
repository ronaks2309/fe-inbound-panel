import React, { useState } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "../lib/utils";

interface CopyButtonProps {
    textToCopy: string | (() => Promise<string>) | (() => string);
    className?: string;
    iconSize?: number;
    title?: string;
}

export const CopyButton: React.FC<CopyButtonProps> = ({
    textToCopy,
    className,
    iconSize = 10,
    title = "Copy"
}) => {
    const [isCopied, setIsCopied] = useState(false);

    const handleCopy = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        try {
            let text = textToCopy;
            if (typeof textToCopy === 'function') {
                text = await textToCopy();
            }

            await navigator.clipboard.writeText(text as string);
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 1500);
        } catch (err) {
            console.error("Failed to copy:", err);
        }
    };

    return (
        <button
            type="button"
            onClick={handleCopy}
            className={cn(
                "cursor-pointer transition-all p-0.5 rounded outline-none focus:outline-none",
                "text-slate-400 hover:text-slate-600 hover:bg-slate-100",
                className
            )}
            title={isCopied ? "Copied!" : title}
        >
            {isCopied ? (
                <Check size={iconSize} className="text-emerald-500" />
            ) : (
                <Copy size={iconSize} />
            )}
        </button>
    );
};
