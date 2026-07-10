import { useCallback, useEffect, useState } from 'react';

const DEFAULT_ZOOM = 150;

export function useZoomFullscreen() {
    const [zoom, setZoom] = useState(DEFAULT_ZOOM); // 0 = fit
    const [isFullscreen, setIsFullscreen] = useState(false);

    const handleZoomIn = useCallback(() => setZoom(prev => prev === 0 ? 125 : Math.min(prev + 25, 200)), []);
    const handleZoomOut = useCallback(() => setZoom(prev => prev === 0 ? 75 : Math.max(prev - 25, 50)), []);
    const handleZoomFit = useCallback(() => setZoom(0), []);

    const handleToggleFullscreen = useCallback(() => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen?.().catch(() => {});
            setIsFullscreen(true);
        } else {
            document.exitFullscreen?.().catch(() => {});
            setIsFullscreen(false);
        }
    }, []);

    useEffect(() => {
        const handler = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', handler);
        return () => document.removeEventListener('fullscreenchange', handler);
    }, []);

    return {
        zoom,
        setZoom,
        isFullscreen,
        handleZoomIn,
        handleZoomOut,
        handleZoomFit,
        handleToggleFullscreen,
    };
}
