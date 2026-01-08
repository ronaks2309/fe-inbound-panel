import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { supabase } from "./supabase"

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

export const authenticatedFetch = async (url: string, options: RequestInit = {}) => {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) throw new Error("No authentication token available");

    const headers = {
        ...(options.headers || {}),
        "Authorization": `Bearer ${token}`
    };

    const res = await fetch(url, { ...options, headers });
    if (res.status === 401) throw new Error("Unauthorized");
    return res;
};
