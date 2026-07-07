'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, AlertCircle, ThumbsUp, Lightbulb } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import { useDashboard } from '../DashboardContext';
import { useAiAnalysis } from '../../hooks/useAiAnalysis';
import Spinner from '../../components/Spinner';

const SELECTED_ID_KEY = 'precue_analysis_selected_id';

const SELECT_CLASSNAME =
    'w-full bg-zinc-900/40 border border-white/5 hover:border-white/10 focus:border-primary/50 focus:outline-none px-4 py-3.5 rounded-2xl text-xs font-bold text-zinc-300 transition-all cursor-pointer appearance-none';
const SELECT_STYLE = {
    backgroundImage: `url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='rgba(255,255,255,0.4)' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
    backgroundPosition: 'right 14px center',
    backgroundRepeat: 'no-repeat',
    backgroundSize: '16px',
} as const;

function ScoreCard({ label, score }: { label: string; score: number }) {
    const color = score >= 75 ? '#22c55e' : score >= 50 ? '#f59e0b' : '#ef4444';
    return (
        <div className="bg-zinc-900/40 border border-white/5 rounded-2xl p-4 flex flex-col gap-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">{label}</span>
            <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black tabular-nums" style={{ color }}>{score}</span>
                <span className="text-xs text-zinc-600 font-bold">/100</span>
            </div>
        </div>
    );
}

export default function AiAnalysis() {
    const t = useTranslations('aiAnalysis');
    const locale = useLocale();
    const { presentations } = useDashboard();
    const { result, isAnalyzing, error, analyze, loadCached } = useAiAnalysis();

    const analyzable = useMemo(
        () => presentations.filter((p) => p.status === 'completed' && p.slide_count > 0),
        [presentations]
    );

    const [selectedId, setSelectedId] = useState<string>('');

    useEffect(() => {
        const storedId = sessionStorage.getItem(SELECTED_ID_KEY);
        if (storedId) {
            setSelectedId(storedId);
            loadCached(storedId);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleSelect = (id: string) => {
        setSelectedId(id);
        sessionStorage.setItem(SELECTED_ID_KEY, id);
        loadCached(id);
    };

    const handleAnalyze = () => {
        if (!selectedId) return;
        analyze(selectedId, locale, t('errorMessage'));
    };

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-3xl">
            <div className="mb-6">
                <p className="text-sm text-zinc-500">{t('subtitle')}</p>
            </div>

            {analyzable.length === 0 ? (
                <div className="bg-zinc-900/40 border border-white/5 rounded-2xl p-8 text-center text-sm text-zinc-500">
                    {t('noPresentations')}
                </div>
            ) : (
                <div className="flex flex-col sm:flex-row gap-3 mb-6">
                    <div className="relative flex-1">
                        <select
                            value={selectedId}
                            onChange={(e) => handleSelect(e.target.value)}
                            className={SELECT_CLASSNAME}
                            style={SELECT_STYLE}
                        >
                            <option value="" disabled>{t('selectPlaceholder')}</option>
                            {analyzable.map((p) => (
                                <option key={p.id} value={p.id}>
                                    {p.title} · {p.slide_count} {t('slidesUnit')}
                                </option>
                            ))}
                        </select>
                    </div>
                    <button
                        onClick={handleAnalyze}
                        disabled={!selectedId || isAnalyzing}
                        className="flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-primary text-black text-xs font-black uppercase tracking-wider hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                    >
                        {isAnalyzing && <Spinner size={14} borderColorClassName="border-black" />}
                        {isAnalyzing ? t('analyzing') : result ? t('reanalyze') : t('analyze')}
                    </button>
                </div>
            )}

            {error && (
                <div className="flex items-center gap-2 text-red-400 text-xs font-bold bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 mb-6">
                    <AlertCircle size={14} />
                    {error}
                </div>
            )}

            <AnimatePresence mode="wait">
                {result && (
                    <motion.div
                        key={selectedId}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="space-y-6"
                    >
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            <ScoreCard label={t('overallScore')} score={result.overall_score} />
                            <ScoreCard label={t('readabilityScore')} score={result.readability_score} />
                            <ScoreCard label={t('structureScore')} score={result.structure_score} />
                            <ScoreCard label={t('visualBalanceScore')} score={result.visual_balance_score} />
                        </div>

                        <div className="bg-zinc-900/40 border border-white/5 rounded-2xl p-5">
                            <h2 className="text-xs font-black uppercase tracking-widest text-zinc-500 mb-2">{t('summaryLabel')}</h2>
                            <p className="text-sm text-zinc-300 leading-relaxed">{result.summary}</p>
                        </div>

                        <div>
                            <h2 className="text-xs font-black uppercase tracking-widest text-zinc-500 mb-3">{t('slideFeedbackLabel')}</h2>
                            <div className="space-y-3">
                                {result.slide_feedback.map((slide) => (
                                    <div key={slide.page_number} className="bg-zinc-900/40 border border-white/5 rounded-2xl p-4">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-primary">
                                            {t('slideLabel')} {slide.page_number}
                                        </span>
                                        <div className="mt-2 flex gap-2 items-start">
                                            <ThumbsUp size={13} className="text-emerald-400 mt-0.5 shrink-0" />
                                            <p className="text-xs text-zinc-300 leading-relaxed">{slide.strength}</p>
                                        </div>
                                        <div className="mt-1.5 flex gap-2 items-start">
                                            <Lightbulb size={13} className="text-amber-400 mt-0.5 shrink-0" />
                                            <p className="text-xs text-zinc-300 leading-relaxed">{slide.improvement}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {isAnalyzing && !result && (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                    <Spinner size={32} />
                    <p className="text-xs text-zinc-500 flex items-center gap-1.5">
                        <RefreshCw size={12} className="animate-spin" />
                        {t('analyzing')}
                    </p>
                </div>
            )}
        </motion.div>
    );
}
