'use client';
/* eslint-disable react-hooks/set-state-in-effect */

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronLeft, HelpCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import PresentationEditor from '../../components/PresentationEditor';
import client from '../../api/client';
import LanguageSwitcher from '../../components/LanguageSwitcher';
const ACTIVE_PRESENTATION_KEY = 'precue_active_presentation_id';
const SESSION_PRESENTATION_KEY = 'precue_generated_presentation';

export default function PresentationEditorPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const t = useTranslations('aiGeneration');
    const tEditor = useTranslations('editor');
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
            {/* Ambient background glow */}
            <div className="absolute top-0 left-1/4 w-[600px] h-[300px] bg-primary/5 rounded-full blur-[120px] pointer-events-none z-0" />

            {/* Top Navigation Bar - full-width edge-to-edge header */}
            <header className="h-16 border-b border-white/5 bg-zinc-950/80 backdrop-blur-md flex items-center justify-between px-6 z-10 select-none shrink-0 w-full">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => router.push('/dashboard?tab=ai-presentation')}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 border border-white/5 text-xs text-zinc-400 hover:text-white hover:bg-zinc-800 hover:border-white/10 transition-all font-bold"
                    >
                        <ChevronLeft size={14} />
                        <span>{t('backToLibrary')}</span>
                    </button>
                    <div className="h-4 w-[1px] bg-white/10" />
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black italic tracking-wider text-primary uppercase bg-primary/10 px-2 py-0.5 rounded-md border border-primary/20">
                            PRECUE.AI
                        </span>
                        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                            {t('presentationEditor')}
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <LanguageSwitcher />
                    <button 
                        className="text-zinc-500 hover:text-zinc-300 transition-colors p-1.5 rounded-lg"
                        title={tEditor('misc.help')}
                    >
                        <HelpCircle size={16} />
                    </button>
                </div>
            </header>

            {/* Editor Workspace - takes full screen height minus header */}
            <main className="flex-1 w-full overflow-hidden relative z-10">
                <PresentationEditor />
            </main>
        </div>
    );
}
