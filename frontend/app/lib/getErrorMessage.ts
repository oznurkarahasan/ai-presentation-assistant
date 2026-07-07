import axios from 'axios';

/** Extracts a user-facing message from an axios error: a `detail` field from
 * the backend response, a generic network/server-down message, or the
 * caller's fallback. Previously this exact chain (network error / 5xx /
 * response detail / no-response) was duplicated across 8+ call sites — auth
 * pages, the upload flow, AI generation, and every profile settings form. */
export function getErrorMessage(err: unknown, fallback: string): string {
    if (axios.isAxiosError(err)) {
        if (err.code === 'ERR_NETWORK') {
            return 'Cannot connect to server. Please make sure the backend is running on http://localhost:8000';
        }
        if (err.response) {
            if (err.response.status === 500) {
                return 'Server error. Please try again later.';
            }
            const data = err.response.data as { detail?: string } | undefined;
            return data?.detail || fallback;
        }
        if (err.request) {
            return 'Server did not respond. Please check if backend is running.';
        }
    }
    return fallback;
}
