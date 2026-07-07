/** Extracts a user-facing message from an axios error, previously duplicated
 * (in a simpler form on login, a fuller form on register) across the auth pages. */
export function getErrorMessage(err: unknown, fallback: string): string {
    if (err && typeof err === 'object') {
        if ('code' in err && (err as { code?: string }).code === 'ERR_NETWORK') {
            return 'Cannot connect to server. Please make sure the backend is running on http://localhost:8000';
        }
        if ('response' in err) {
            const axiosError = err as { response?: { status?: number; data?: { detail?: string } } };
            if (axiosError.response?.status === 500) {
                return 'Server error. Please try again later.';
            }
            return axiosError.response?.data?.detail || fallback;
        }
        if ('request' in err) {
            return 'Server did not respond. Please check if backend is running.';
        }
    }
    return fallback;
}
