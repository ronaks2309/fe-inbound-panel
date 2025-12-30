import React, { useEffect } from 'react';
import { CheckCircle, XCircle, X } from 'lucide-react';

interface SimpleToastProps {
    message: string;
    type?: 'success' | 'error';
    onClose: () => void;
    duration?: number;
}

export const SimpleToast: React.FC<SimpleToastProps> = ({ message, type = 'success', onClose, duration = 3000 }) => {
    useEffect(() => {
        const timer = setTimeout(() => {
            onClose();
        }, duration);
        return () => clearTimeout(timer);
    }, [duration, onClose]);

    return (
        <div className="fixed bottom-6 right-6 z-[100] animate-in slide-in-from-bottom-2 fade-in">
            <div className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg border ${type === 'success' ? 'bg-white border-green-200 text-green-800' : 'bg-white border-red-200 text-red-800'
                }`}>
                {type === 'success' ? <CheckCircle size={20} className="text-green-500" /> : <XCircle size={20} className="text-red-500" />}
                <p className="text-sm font-medium">{message}</p>
                <button onClick={onClose} className="ml-2 text-slate-400 hover:text-slate-600">
                    <X size={16} />
                </button>
            </div>
        </div>
    );
};
