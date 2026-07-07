import { useState } from 'react';
import client from '../api/client';
import type { PresentationAnalysis } from '../types/analysis';
import { getErrorMessage } from '../lib/getErrorMessage';

const CACHE_KEY = 'precue_analysis_cache';

function readCache(): Record<string, PresentationAnalysis> {
    if (typeof window === 'undefined') return {};
    try {
        const stored = sessionStorage.getItem(CACHE_KEY);
        return stored ? JSON.parse(stored) : {};
    } catch (e) {
        console.error('Failed to parse cached analysis:', e);
        return {};
    }
}

/** Last analysis per presentation, cached client-side (like the trending-ideas
 * cache) so re-selecting or refreshing doesn't lose the result. Re-analyzing
 * simply overwrites the cached entry — there's no history across runs. */
export function getCachedAnalysis(presentationId: string): PresentationAnalysis | null {
    return readCache()[presentationId] ?? null;
}

export function useAiAnalysis() {
    const [result, setResult] = useState<PresentationAnalysis | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const analyze = async (presentationId: string, language: string, fallbackError: string) => {
        setIsAnalyzing(true);
        setError(null);
        try {
            const response = await client.post<PresentationAnalysis>(
                `/api/v1/presentations/${presentationId}/analyze`,
                { language }
            );
            setResult(response.data);
            const cache = readCache();
            cache[presentationId] = response.data;
            sessionStorage.setItem(CACHE_KEY, JSON.stringify(cache));
        } catch (err) {
            setError(getErrorMessage(err, fallbackError));
        } finally {
            setIsAnalyzing(false);
        }
    };

    const loadCached = (presentationId: string) => {
        setResult(presentationId ? getCachedAnalysis(presentationId) : null);
        setError(null);
    };

    return { result, isAnalyzing, error, analyze, loadCached };
}
