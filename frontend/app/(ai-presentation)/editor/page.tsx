'use client';
/* eslint-disable react-hooks/set-state-in-effect */

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import PresentationEditor from '../../components/PresentationEditor';
import client from '../../api/client';

const ACTIVE_PRESENTATION_KEY = 'precue_active_presentation_id';
const SESSION_PRESENTATION_KEY = 'precue_generated_presentation';

export default function PresentationEditorPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const t = useTranslations('aiGeneration');
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    useEffect(() => {
        const token = localStorage.getItem('access_token');
        if (!token) {
            router.push('/login');
            return;
        }

        const stored = sessionStorage.getItem(SESSION_PRESENTATION_KEY);
        const presentationId = searchParams.get('presentationId');
        const activePresentationId = sessionStorage.getItem(ACTIVE_PRESENTATION_KEY);

        if (presentationId && presentationId !== activePresentationId) {
            client
                .get(`/api/v1/presentations/${presentationId}/ai-state`)
                .then((response) => {
                    sessionStorage.setItem(SESSION_PRESENTATION_KEY, JSON.stringify(response.data));
                    sessionStorage.setItem(ACTIVE_PRESENTATION_KEY, String(presentationId));
                    setIsAuthenticated(true);
                })
                .catch(() => {
                    router.push('/dashboard?tab=ai-presentation');
                });
            return;
        }

        if (!stored) {
            if (presentationId) {
                client
                    .get(`/api/v1/presentations/${presentationId}/ai-state`)
                    .then((response) => {
                        sessionStorage.setItem(SESSION_PRESENTATION_KEY, JSON.stringify(response.data));
                        sessionStorage.setItem(ACTIVE_PRESENTATION_KEY, String(presentationId));
                        setIsAuthenticated(true);
                    })
                    .catch(() => {
                        router.push('/dashboard?tab=ai-presentation');
                    });
                return;
            }
            router.push('/dashboard?tab=ai-presentation');
            return;
        }

        setIsAuthenticated(true);
    }, [router, searchParams]);

    if (!isAuthenticated) {
        return (
            <div className="w-screen h-screen flex items-center justify-center bg-zinc-950">
                <div className="relative w-12 h-12">
                    <div className="absolute inset-0 rounded-full border-4 border-white/5" />
                    <div className="absolute inset-0 rounded-full border-4 border-t-primary border-r-transparent border-b-transparent border-l-transparent animate-spin" />
                </div>
            </div>
        );
    }

    return (
        <div className="w-screen h-screen bg-zinc-950 flex flex-col overflow-hidden relative">
            {/* Editor takes full viewport - toolbar is inside PresentationEditor */}
            <main className="flex-1 w-full overflow-hidden relative">
                <PresentationEditor />
            </main>
        </div>
    );
}
