import { useCallback, useRef, useState } from 'react';
import client from '../api/client';
import type { PresentationSlide, PresentationMetadata } from '../types/presentation';
import { writeStoredPresentation } from '../lib/editorDefaults';

const ACTIVE_PRESENTATION_ID_KEY = 'precue_active_presentation_id';
const AUTO_SAVE_DEBOUNCE_MS = 1500;

export type AutoSaveStatus = 'idle' | 'saving' | 'saved' | 'error';

/** Debounced persistence of editor state to the backend, following the same
 * pattern as a typical document editor's "saved a few seconds after you stop typing". */
export function useAutoSave() {
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [status, setStatus] = useState<AutoSaveStatus>('idle');

    const persistToServer = useCallback(async (slides: PresentationSlide[], metadata: PresentationMetadata) => {
        const presentationId = typeof window !== 'undefined'
            ? sessionStorage.getItem(ACTIVE_PRESENTATION_ID_KEY)
            : null;
        if (!presentationId) return;

        setStatus('saving');
        try {
            const state = { metadata, slides };
            await client.put(`/api/v1/presentations/${presentationId}/ai-state`, state);
            writeStoredPresentation(state);
            setStatus('saved');
            setTimeout(() => setStatus('idle'), 2500);
        } catch {
            setStatus('error');
            setTimeout(() => setStatus('idle'), 3000);
        }
    }, []);

    const scheduleAutoSave = useCallback((slides: PresentationSlide[], metadata: PresentationMetadata) => {
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
            persistToServer(slides, metadata);
        }, AUTO_SAVE_DEBOUNCE_MS);
    }, [persistToServer]);

    return { autoSaveStatus: status, scheduleAutoSave, persistToServer };
}
