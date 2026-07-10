import { useCallback, useEffect, useState } from 'react';

export interface ToastState {
    type: 'success' | 'error';
    message: string;
}

const AUTO_DISMISS_MS = 4000;

export function useToast() {
    const [toast, setToast] = useState<ToastState | null>(null);

    useEffect(() => {
        if (!toast) return;
        const timer = setTimeout(() => setToast(null), AUTO_DISMISS_MS);
        return () => clearTimeout(timer);
    }, [toast]);

    const showToast = useCallback((type: ToastState['type'], message: string) => {
        setToast({ type, message });
    }, []);

    return { toast, showToast };
}
