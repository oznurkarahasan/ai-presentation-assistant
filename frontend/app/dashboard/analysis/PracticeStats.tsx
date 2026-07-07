'use client';

import { Clock, Mic2, Radio } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { RecentSession } from '../DashboardContext';
import SessionDurationChart from './SessionDurationChart';

interface PracticeStatsProps {
    sessions: RecentSession[];
}

export default function PracticeStats({ sessions }: PracticeStatsProps) {
    const t = useTranslations('aiAnalysis');

    if (sessions.length === 0) {
        return (
            <div className="bg-zinc-900/40 border border-white/5 rounded-2xl p-5">
                <h2 className="text-xs font-black uppercase tracking-widest text-zinc-500 mb-2">{t('practiceStatsLabel')}</h2>
                <p className="text-xs text-zinc-500">{t('noSessions')}</p>
            </div>
        );
    }

    const sorted = [...sessions].sort((a, b) => new Date(a.started_at).getTime() - new Date(b.started_at).getTime());
    const chartSessions = sorted.slice(-10);

    const totalMinutes = sessions.reduce((sum, s) => sum + s.duration_minutes, 0);
    const rehearsalCount = sessions.filter((s) => s.session_type === 'rehearsal').length;
    const liveCount = sessions.filter((s) => s.session_type === 'live').length;
    const lastPracticed = sorted[sorted.length - 1].started_at;

    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    return (
        <div className="bg-zinc-900/40 border border-white/5 rounded-2xl p-5">
            <h2 className="text-xs font-black uppercase tracking-widest text-zinc-500 mb-4">{t('practiceStatsLabel')}</h2>

            <div className="grid grid-cols-3 gap-2 mb-3">
                <div>
                    <div className="flex items-center gap-1.5 text-white">
                        <Clock size={12} className="text-primary shrink-0" />
                        <span className="text-sm font-black tabular-nums">{hours}h {minutes}m</span>
                    </div>
                    <div className="text-[9px] uppercase tracking-wider text-zinc-500 mt-0.5">{t('totalPracticeTime')}</div>
                </div>
                <div>
                    <div className="flex items-center gap-1.5 text-white">
                        <Mic2 size={12} className="text-[#06b6d4] shrink-0" />
                        <span className="text-sm font-black tabular-nums">{rehearsalCount}</span>
                    </div>
                    <div className="text-[9px] uppercase tracking-wider text-zinc-500 mt-0.5">{t('rehearsals')}</div>
                </div>
                <div>
                    <div className="flex items-center gap-1.5 text-white">
                        <Radio size={12} className="text-primary shrink-0" />
                        <span className="text-sm font-black tabular-nums">{liveCount}</span>
                    </div>
                    <div className="text-[9px] uppercase tracking-wider text-zinc-500 mt-0.5">{t('liveSessions')}</div>
                </div>
            </div>

            <p className="text-[10px] text-zinc-500 mb-4">
                {t('lastPracticed')}: {new Date(lastPracticed).toLocaleDateString('en-GB')}
            </p>

            <SessionDurationChart sessions={chartSessions} />

            <div className="flex items-center gap-4 mt-3">
                <span className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider text-zinc-500">
                    <span className="w-2 h-2 rounded-full bg-[#06b6d4]" /> {t('rehearsals')}
                </span>
                <span className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider text-zinc-500">
                    <span className="w-2 h-2 rounded-full bg-primary" /> {t('liveSessions')}
                </span>
            </div>
        </div>
    );
}
