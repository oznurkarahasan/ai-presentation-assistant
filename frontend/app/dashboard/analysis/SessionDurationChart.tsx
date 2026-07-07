'use client';

import { motion } from 'framer-motion';

interface SessionBar {
    id: number;
    started_at: string;
    duration_minutes: number;
    session_type: string;
}

interface SessionDurationChartProps {
    sessions: SessionBar[];
}

const REHEARSAL_COLOR = '#06b6d4';
const LIVE_COLOR = '#f97316';

export default function SessionDurationChart({ sessions }: SessionDurationChartProps) {
    const maxDuration = Math.max(1, ...sessions.map((s) => s.duration_minutes));

    return (
        <div className="flex items-end gap-1.5 h-24">
            {sessions.map((s, i) => {
                const heightPct = Math.max(6, (s.duration_minutes / maxDuration) * 100);
                const color = s.session_type === 'live' ? LIVE_COLOR : REHEARSAL_COLOR;
                return (
                    <motion.div
                        key={s.id}
                        className="flex-1 rounded-t-md min-w-[4px]"
                        style={{ backgroundColor: color }}
                        initial={{ height: 0 }}
                        animate={{ height: `${heightPct}%` }}
                        transition={{ duration: 0.4, delay: i * 0.03, ease: 'easeOut' }}
                        title={`${s.duration_minutes}m · ${new Date(s.started_at).toLocaleDateString('en-GB')}`}
                    />
                );
            })}
        </div>
    );
}
