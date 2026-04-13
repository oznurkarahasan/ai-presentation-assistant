'use client';

import React, { useMemo } from 'react';
import { Eye, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { RecentSession } from '../DashboardContext';

interface SessionsProps {
    sessions: RecentSession[];
    searchQuery: string;
    onDeleteSession: (sessionId: number) => void;
}

export default function Sessions({ sessions, searchQuery, onDeleteSession }: SessionsProps) {
    const filteredSessions = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        if (!query) return sessions;
        return sessions.filter((session) =>
            session.presentation.title?.toLowerCase().includes(query)
        );
    }, [sessions, searchQuery]);

    const formatDuration = (durationSeconds?: number, fallbackMinutes?: number) => {
        const total = Number.isFinite(durationSeconds as number)
            ? Math.max(0, Math.floor(durationSeconds as number))
            : Math.max(0, Math.floor((fallbackMinutes || 0) * 60));
        const minutes = Math.floor(total / 60);
        const seconds = total % 60;
        return `${minutes}:${String(seconds).padStart(2, '0')}`;
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
        >
            <div className="mt-8 space-y-3">
                <p className="px-1 text-xs font-semibold uppercase tracking-widest text-zinc-500">
                    Found {filteredSessions.length} sessions
                </p>

                <div className="bg-[#0C0C0C] border border-white/5 rounded-[2rem] overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-[760px] w-full text-left">
                            <thead>
                                <tr className="border-b border-white/5">
                                    <th className="px-8 py-6 text-xs font-bold text-zinc-500 uppercase tracking-widest">Presentation</th>
                                    <th className="px-8 py-6 text-xs font-bold text-zinc-500 uppercase tracking-widest">Type</th>
                                    <th className="px-8 py-6 text-xs font-bold text-zinc-500 uppercase tracking-widest">Duration</th>
                                    <th className="px-8 py-6 text-xs font-bold text-zinc-500 uppercase tracking-widest">Date</th>
                                    <th className="px-8 py-6 text-xs font-bold text-zinc-500 uppercase tracking-widest text-right">Action</th>
                                </tr>
                            </thead>

                            <tbody className="divide-y divide-white/5">
                                {filteredSessions.map((s) => (
                                    <tr key={s.id} className="group transition-colors hover:bg-white/[0.02]">
                                        <td className="px-8 py-5">
                                            <div className="text-sm font-semibold text-white">{s.presentation.title}</div>
                                        </td>
                                        <td className="px-8 py-5">
                                            <span
                                                className={`inline-flex rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${
                                                    s.session_type === 'rehearsal'
                                                        ? 'bg-blue-500/10 text-blue-500'
                                                        : 'bg-emerald-500/10 text-emerald-500'
                                                }`}
                                            >
                                                {s.session_type === 'rehearsal' ? 'Rehearsal' : 'Live'}
                                            </span>
                                        </td>
                                        <td className="px-8 py-5 text-sm text-zinc-400">
                                            {formatDuration(s.duration_seconds, s.duration_minutes)}
                                        </td>
                                        <td className="px-8 py-5 text-sm text-zinc-400">
                                            {new Date(s.started_at).toLocaleDateString('en-GB')}
                                        </td>
                                        <td className="px-8 py-5 text-right">
                                            <div className="inline-flex items-center gap-1">
                                                <button className="rounded-lg p-2 text-zinc-500 transition-all hover:bg-white/5 hover:text-white">
                                                    <Eye size={16} />
                                                </button>
                                                <button
                                                    onClick={() => onDeleteSession(s.id)}
                                                    className="rounded-lg p-2 text-zinc-500 transition-all hover:bg-red-500/10 hover:text-red-400"
                                                    title="Delete session"
                                                    aria-label="Delete session"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {filteredSessions.length === 0 && (
                        <div className="py-20 text-center text-zinc-600 italic">No recorded sessions found.</div>
                    )}
                </div>
            </div>
        </motion.div>
    );
}
