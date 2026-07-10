'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
    id: string;
    type: ToastType;
    title: string;
    message?: string;
    duration?: number;
    // Set when the toast is dismissed to play the exit animation before it is
    // removed from the DOM (in onAnimationEnd). Internal — callers never set it.
    leaving?: boolean;
}

interface ToastContextType {
    toasts: Toast[];
    addToast: (toast: Omit<Toast, 'id'>) => void;
    removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

const icons: Record<ToastType, React.ReactNode> = {
    success: <CheckCircle className="h-5 w-5 text-green-500" />,
    error: <AlertCircle className="h-5 w-5 text-red-500" />,
    info: <Info className="h-5 w-5 text-blue-500" />,
    warning: <AlertTriangle className="h-5 w-5 text-yellow-500" />,
};

const bgColors: Record<ToastType, string> = {
    success: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
    error: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
    info: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
    warning: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800',
};

export function ToastProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const removeToast = useCallback((id: string) => {
        // Flag the toast as leaving so it plays the exit animation; the actual
        // removal happens in handleAnimationEnd once that animation completes.
        setToasts((prev) =>
            prev.map((t) => (t.id === id ? { ...t, leaving: true } : t))
        );
    }, []);

    const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
        const id = Math.random().toString(36).substring(2, 9);
        setToasts((prev) => [...prev, { ...toast, id }]);

        // Auto-dismiss after duration (default 5s)
        setTimeout(() => {
            removeToast(id);
        }, toast.duration || 5000);
    }, [removeToast]);

    const handleAnimationEnd = useCallback((id: string) => {
        // Both enter and exit animations fire this event; only unmount once the
        // exit (leaving) animation has finished.
        setToasts((prev) => {
            const toast = prev.find((t) => t.id === id);
            return toast?.leaving ? prev.filter((t) => t.id !== id) : prev;
        });
    }, []);

    return (
        <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
            {children}
            {/* Toast Container */}
            <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2" aria-live="polite" aria-label="Notifications">
                {toasts.map((toast) => (
                    <div
                        key={toast.id}
                        onAnimationEnd={() => handleAnimationEnd(toast.id)}
                        className={`flex items-start gap-3 p-4 rounded-lg border shadow-lg max-w-sm ${bgColors[toast.type]} ${toast.leaving ? 'animate-toast-out' : 'animate-toast-in'}`}
                    >
                        {icons[toast.type]}
                        <div className="flex-1 min-w-0">
                            <p className="font-medium text-foreground dark:text-foreground">{toast.title}</p>
                            {toast.message && (
                                <p className="text-sm text-muted-foreground dark:text-muted-foreground/50 mt-1">{toast.message}</p>
                            )}
                        </div>
                        <button
                            onClick={() => removeToast(toast.id)}
                            className="text-muted-foreground/70 hover:text-muted-foreground dark:hover:text-foreground"
                            aria-label="Dismiss notification"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
}

export function useToast() {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
}
