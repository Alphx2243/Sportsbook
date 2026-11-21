import { useEffect } from 'react';
export default function Toast({ message, type = 'info', onClose }: { message: string; type?: 'success' | 'error' | 'info' | 'warning'; onClose: () => void }) {
    useEffect(() => {
        const timer = setTimeout(() => {
            onClose();
        }, 3500);
        return () => clearTimeout(timer);
    }, [onClose]);

    const baseStyles = `fixed bottom-5 right-5 max-w-sm px-4 py-3 rounded-lg border shadow-lg text-white animate-fade-in-out z-50`;
    const typeStyles: Record<string, string> = {
        success: 'bg-emerald-600 border-emerald-700',
        error: 'bg-red-600 border-red-700',
        info: 'bg-primary border-primary',
        warning: 'bg-amber-400 text-slate-950 border-amber-500',
    };

    return (
        <div className={`${baseStyles} ${typeStyles[type] || typeStyles.info}`}>
            <p className="text-sm font-medium">{message}</p>
        </div>
    );
}
