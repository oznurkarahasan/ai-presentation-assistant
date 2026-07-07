import { useEffect, useState } from 'react';
import client from '../api/client';
import type { PresentationSlide } from '../types/presentation';

export interface AiColors {
    primary: string;
    accent: string;
}

export interface PresentationData {
    title: string | null;
    file: string | null;
    fileType: string | null;
    orientation: 'landscape' | 'portrait';
    aspectRatio: number | null;
    totalPages: number;
    aiSlides: PresentationSlide[];
    aiColors: AiColors;
}

const DEFAULT_AI_COLORS: AiColors = { primary: '#f97316', accent: '#06b6d4' };

const INITIAL_DATA: PresentationData = {
    title: null,
    file: null,
    fileType: null,
    orientation: 'landscape',
    aspectRatio: null,
    totalPages: 1,
    aiSlides: [],
    aiColors: DEFAULT_AI_COLORS,
};

/**
 * Fetches presentation metadata, and — for AI-generated presentations — the
 * generated slide state, in the shape both the analyze page and the
 * real-time presentation page need. Both pages previously duplicated this
 * fetch/parse logic independently; this hook is the single source of truth.
 */
export function usePresentationData(presentationId: string | null | undefined) {
    const [data, setData] = useState<PresentationData>(INITIAL_DATA);
    const [error, setError] = useState<unknown>(null);

    useEffect(() => {
        if (!presentationId) return;

        let cancelled = false;

        (async () => {
            try {
                const response = await client.get(`/api/v1/presentations/${presentationId}`);
                const meta = response.data;
                if (cancelled) return;

                const next: PresentationData = { ...INITIAL_DATA, title: meta.title };

                if (meta.file_type === 'ai') {
                    next.file = null;
                    next.fileType = 'ai';
                    try {
                        const stateRes = await client.get(`/api/v1/presentations/${presentationId}/ai-state`);
                        const state = stateRes.data;
                        if (cancelled) return;
                        if (state.slides?.length > 0) {
                            next.aiSlides = state.slides;
                            next.totalPages = state.slides.length;
                        }
                        if (state.metadata) {
                            next.aiColors = {
                                primary: state.metadata.primary_color || DEFAULT_AI_COLORS.primary,
                                accent: state.metadata.accent_color || DEFAULT_AI_COLORS.accent,
                            };
                        }
                    } catch (e) {
                        console.error('Failed to fetch AI state:', e);
                    }
                } else {
                    next.file = meta.pdf_preview_path || meta.file_path;
                    next.fileType = meta.pdf_preview_path ? 'pdf' : meta.file_type;
                    next.totalPages = meta.total_pages || meta.slide_count || 1;
                }

                if (meta.aspect_ratio) next.aspectRatio = meta.aspect_ratio;
                if (meta.orientation) next.orientation = meta.orientation;

                setData(next);
            } catch (e) {
                console.error('Failed to fetch presentation:', e);
                if (!cancelled) setError(e);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [presentationId]);

    return { data, error };
}
