import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const ACCESS_TOKEN_KEY = 'access_token';

/** A stored token can be the literal string "undefined"/"null" or empty after
 * certain storage races; treat all of those the same as "no token". */
export function hasValidAccessToken(): boolean {
    if (typeof window === 'undefined') return false;
    const token = localStorage.getItem(ACCESS_TOKEN_KEY);
    return !!token && token !== 'undefined' && token !== 'null' && token !== '';
}

/** Gates a page behind a valid access token, redirecting to `redirectTo`
 * when missing. Consolidates the auth-check boilerplate previously
 * duplicated across the editor, analyze, and dashboard pages — client.ts's
 * response interceptor already clears an invalid token on a 401, but nothing
 * previously handled the initial "is there a token at all" page guard in one place. */
export function useRequireAuth(redirectTo: string = '/login') {
    const router = useRouter();
    const [isChecking, setIsChecking] = useState(true);

    useEffect(() => {
        if (!hasValidAccessToken()) {
            router.push(redirectTo);
            return;
        }
        // The check must run in an effect (not during render) to stay in sync
        // with server-rendered markup, which never has access to localStorage.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setIsChecking(false);
    }, [router, redirectTo]);

    return { isChecking };
}
