'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, MessageSquare, Globe, ArrowRight, AlertCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import client from '../../api/client';

export default function AiGenerationForm() {
    const router = useRouter();
    const t = useTranslations('aiGeneration');
    const tLang = useTranslations('language');

    const [topic, setTopic] = useState('');
    const [language, setLanguage] = useState('Turkish');
    const [isLoading, setIsLoading] = useState(false);
    const [loadingStep, setLoadingStep] = useState('');
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!topic.trim()) return;

        setIsLoading(true);
        setError(null);

        // Sequence of engaging messages during generation from translations
        const steps = [
            t('step1'),
            t('step2'),
            t('step3'),
            t('step4'),
            t('step5'),
            t('step6')
        ];

        let stepIndex = 0;
        setLoadingStep(steps[0]);

        const interval = setInterval(() => {
            stepIndex = (stepIndex + 1) % steps.length;
            setLoadingStep(steps[stepIndex]);
        }, 3000);

        try {
            const token = localStorage.getItem('access_token');
            if (!token) {
                router.push('/login');
                clearInterval(interval);
                return;
            }

            const response = await client.post('/api/v1/presentations/generate', {
                topic,
                language,
                theme: 'sunset' // Default theme seed
            });

            if (response.data) {
                // Store the PresentationState JSON globally in sessionStorage
                sessionStorage.setItem('precue_generated_presentation', JSON.stringify(response.data));

                // Clear any manual query ID in storage
                sessionStorage.removeItem('precue_active_presentation_id');

                // Redirect to the new independent editor route
                router.push('/editor');
            } else {
                throw new Error('No data returned.');
            }
        } catch (err: unknown) {
            console.error('Presentation generation failed:', err);
            const axiosError = err as { response?: { data?: { detail?: string } } };
            const errorMessage = axiosError.response?.data?.detail || t('errorTitle');
            setError(errorMessage);
            setIsLoading(false);
        } finally {
            clearInterval(interval);
        }
    };

    return (
        <div className="w-full min-h-[70vh] flex items-center justify-center p-4 relative select-none">
            {/* Ambient background glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] pointer-events-none z-0" />

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-xl bg-zinc-950/65 border border-white/5 p-8 rounded-3xl backdrop-blur-xl relative overflow-hidden shadow-2xl z-10"
            >
                {/* Decorative top gradient line */}
                <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-primary/50 to-transparent" />

                {/* Form Header */}
                <div className="text-center space-y-3 mb-8">
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mx-auto shadow-inner">
                        <Sparkles size={20} className="animate-pulse" />
                    </div>
                    <div>
                        <h2 className="text-xl font-black italic uppercase tracking-wider text-white">{t('title')}</h2>
                        <p className="text-[10px] text-zinc-500 font-semibold uppercase tracking-widest mt-1">{t('subtitle')}</p>
                    </div>
                </div>

                {/* Error Banner */}
                <AnimatePresence>
                    {error && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="bg-red-950/40 border border-red-500/20 rounded-2xl p-4 flex items-start gap-3 mb-6"
                        >
                            <AlertCircle className="text-red-400 shrink-0 mt-0.5" size={16} />
                            <div>
                                <h4 className="text-xs font-bold text-red-200">{t('errorTitle')}</h4>
                                <p className="text-[10px] text-red-400/90 font-medium mt-1 leading-normal">{error}</p>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Main Form */}
                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Topic Area */}
                    <div className="space-y-2">
                        <div className="flex items-center gap-1.5 text-zinc-400">
                            <MessageSquare size={13} />
                            <label className="text-[10px] font-black uppercase tracking-wider text-zinc-500">{t('topicLabel')}</label>
                        </div>
                        <textarea
                            value={topic}
                            onChange={(e) => setTopic(e.target.value)}
                            placeholder={t('topicPlaceholder')}
                            className="w-full h-36 bg-zinc-900/40 border border-white/5 hover:border-white/10 focus:border-primary/50 focus:outline-none p-4.5 rounded-2xl text-xs text-zinc-200 font-medium placeholder-zinc-600 resize-none transition-all duration-300 custom-scrollbar leading-relaxed"
                            required
                        />
                    </div>

                    {/* Language Dropdown */}
                    <div className="space-y-2">
                        <div className="flex items-center gap-1.5 text-zinc-400">
                            <Globe size={13} />
                            <label className="text-[10px] font-black uppercase tracking-wider text-zinc-500">{t('languageLabel')}</label>
                        </div>
                        <div className="relative">
                            <select
                                value={language}
                                onChange={(e) => setLanguage(e.target.value)}
                                className="w-full bg-zinc-900/40 border border-white/5 hover:border-white/10 focus:border-primary/50 focus:outline-none px-4 py-4 rounded-2xl text-xs font-bold text-zinc-300 transition-all cursor-pointer appearance-none"
                                style={{
                                    backgroundImage: `url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='rgba(255,255,255,0.4)' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
                                    backgroundPosition: 'right 18px center',
                                    backgroundSize: '14px',
                                    backgroundRepeat: 'no-repeat'
                                }}
                            >
                                <option value="Turkish" className="bg-zinc-950">{tLang('turkish')}</option>
                                <option value="English" className="bg-zinc-950">{tLang('english')}</option>
                                <option value="German" className="bg-zinc-950">Deutsch</option>
                                <option value="French" className="bg-zinc-950">Français</option>
                                <option value="Spanish" className="bg-zinc-950">Español</option>
                            </select>
                        </div>
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={!topic.trim() || isLoading}
                        className="w-full py-4.5 rounded-2xl bg-primary hover:bg-orange-500 active:scale-[0.98] transition-all font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 text-white shadow-[0_4px_25px_rgba(249,115,22,0.25)] hover:shadow-[0_4px_30px_rgba(249,115,22,0.4)] disabled:opacity-50 disabled:pointer-events-none mt-2"
                    >
                        <span>{t('submitButton')}</span>
                        <ArrowRight size={14} />
                    </button>
                </form>
            </motion.div>

            {/* AI Generation Loading Overlay */}
            <AnimatePresence>
                {isLoading && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 backdrop-blur-md"
                    >
                        <div className="text-center space-y-6 max-w-sm px-6">
                            {/* Animated glowing spinner */}
                            <div className="relative w-20 h-20 mx-auto">
                                <div className="absolute inset-0 rounded-full border-4 border-white/5" />
                                <motion.div
                                    animate={{ rotate: 360 }}
                                    transition={{ repeat: Infinity, duration: 1.2, ease: "linear" }}
                                    className="absolute inset-0 rounded-full border-4 border-t-primary border-r-transparent border-b-transparent border-l-transparent"
                                />
                                <div className="absolute inset-2 bg-zinc-950 rounded-full flex items-center justify-center">
                                    <Sparkles size={20} className="text-primary animate-pulse" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-sm font-black italic uppercase tracking-wider text-zinc-100">{t('loadingTitle')}</h3>
                                <p className="text-xs text-zinc-400 font-semibold h-8 leading-normal">{loadingStep}</p>
                                <p className="text-[10px] text-zinc-600 font-medium">{t('loadingNote')}</p>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
