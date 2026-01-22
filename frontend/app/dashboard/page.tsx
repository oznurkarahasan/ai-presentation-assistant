'use client';

import React from "react";
import Link from "next/link";
import {
    Presentation,
    FileText,
    Play,
    Trash2,
    Eye,
    PlusCircle,
    ArrowUpRight,
} from "lucide-react";
import { motion } from "framer-motion";
import { useDashboard, RecentPresentation } from "./DashboardContext";
import client from "../api/client";
import axios from "axios";

export default function DashboardPage() {
    const {
        activeTab,
        presentations,
        recentPresentations,
        recentSessions,
        searchQuery,
        setStats,
        stats,
        setAlert,
        alert,
        setRecentPresentations,
        setPresentations,
        setActiveTab
    } = useDashboard();

    const handleDeletePresentation = async (id: number) => {
        if (!confirm("Are you sure you want to delete this presentation?")) return;

        try {
            await client.delete(`/api/v1/presentations/${id}`);
            setRecentPresentations((prev: RecentPresentation[]) => prev.filter((p: RecentPresentation) => p.id !== id));
            setPresentations((prev: RecentPresentation[]) => prev.filter((p: RecentPresentation) => p.id !== id));
            if (stats) {
                setStats({
                    ...stats,
                    total_presentations: stats.total_presentations - 1
                });
            }
            setAlert({ type: 'info', message: 'Presentation deleted.' });
            setTimeout(() => setAlert(null), 3500);
        } catch (error) {
            let msg = 'An error occurred while deleting the presentation.';
            const status = axios.isAxiosError(error) ? error.response?.status : undefined;

            if (status === 403) {
                msg = "Permission denied. You don't have authority to delete this.";
            } else if (status === 404) {
                msg = "Presentation not found.";
            } else if (status && status >= 500) {
                msg = "Server error. Please try again later.";
            }

            setAlert({ type: 'error', message: msg });
            setTimeout(() => setAlert(null), 4500);
        }
    };

    const filteredPresentations = searchQuery.trim()
        ? presentations.filter(p => p.title?.toLowerCase().includes(searchQuery.toLowerCase()))
        : presentations;

    return (
        <>
            {alert && (
                <div className={`fixed right-6 top-6 z-50 max-w-sm ${alert.type === 'error' ? 'bg-red-600' : 'bg-zinc-900/90'} text-white p-4 rounded-xl shadow-lg border border-white/5`}>
                    <div className="text-sm font-medium">{alert.message}</div>
                </div>
            )}

            {/* Overview Tab Content */}
            {activeTab === 'overview' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 min-h-[420px]">
                    {/* Large Welcome/CTA Card */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                        className="p-6 md:p-10 rounded-[2.5rem] bg-[#0c0c0c] border border-white/10 relative overflow-hidden group shadow-2xl transition-all duration-500 hover:border-primary/20"
                    >
                        {/* Futuristic Background Glows */}
                        <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/20 rounded-full blur-[100px] opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-primary/10 rounded-full blur-[80px] opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

                        <div className="relative z-10 h-full flex flex-col justify-between">
                            <div className="space-y-4 md:space-y-6">
                                <div className="flex items-center gap-3">
                                    <div className="bg-primary/10 border border-primary/20 backdrop-blur-md rounded-full px-4 py-1.5 text-[10px] md:text-[11px] font-black text-primary tracking-[0.2em] w-fit">
                                        STAGE READY
                                    </div>
                                    <div className="flex gap-1">
                                        <div className="w-1 h-1 rounded-full bg-primary animate-pulse" />
                                        <div className="w-1 h-1 rounded-full bg-primary/50" />
                                        <div className="w-1 h-1 rounded-full bg-primary/20" />
                                    </div>
                                </div>

                                <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black mb-3 leading-[1.1] italic uppercase tracking-tighter text-white">
                                    The Shortest Path <br />
                                    <span className="text-primary group-hover:text-white transition-colors duration-500">to Perfection</span>
                                </h2>

                                <p className="text-zinc-400 text-sm md:text-base max-w-sm font-medium leading-relaxed">
                                    Scale your public speaking mastery. AI handles the cues, you capture the audience.
                                </p>
                            </div>

                            <div className="mt-8 md:mt-12 flex flex-wrap gap-4 items-center">
                                <Link href="/upload">
                                    <button className="bg-white text-black hover:bg-primary hover:text-white px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-tight flex items-center gap-2 transition-all active:scale-95 shadow-xl shadow-white/5 border border-transparent hover:border-white/10">
                                        Initiate Session
                                        <ArrowUpRight size={18} />
                                    </button>
                                </Link>
                                <div className="flex -space-x-2">
                                    {[1, 2, 3].map((i) => (
                                        <div key={i} className="w-8 h-8 rounded-full border-2 border-[#0c0c0c] bg-zinc-800 flex items-center justify-center text-[10px] font-bold">
                                            {i === 3 ? '+' : ''}
                                        </div>
                                    ))}
                                    <span className="ml-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest self-center">1.2k+ Mastered</span>
                                </div>
                            </div>
                        </div>

                        <div className="absolute right-[-5%] bottom-[-10%] opacity-[0.03] group-hover:opacity-[0.07] pointer-events-none group-hover:scale-110 group-hover:-rotate-12 transition-all duration-1000">
                            <Presentation size={320} className="text-white stroke-[1.5px]" />
                        </div>
                    </motion.div>

                    {/* Recent Presentations Section */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.15 }}
                        className="bg-[#0C0C0C] border border-white/5 rounded-[2rem] p-8 overflow-hidden relative shadow-inner"
                    >
                        <div className="flex items-center justify-between mb-8">
                            <h3 className="text-xl font-bold flex items-center gap-3">
                                <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                                Recent Presentations
                            </h3>
                            <button
                                onClick={() => setActiveTab('presentations')}
                                className="text-xs text-zinc-500 hover:text-white flex items-center gap-1 transition-colors"
                            >
                                See All <ArrowUpRight size={14} />
                            </button>
                        </div>

                        <div className="space-y-4">
                            {recentPresentations.length === 0 ? (
                                <div className="py-12 flex flex-col items-center text-zinc-600 gap-3">
                                    <FileText size={48} className="opacity-20" />
                                    <p className="text-sm">No presentations found.</p>
                                </div>
                            ) : (
                                recentPresentations.slice(0, 4).map((p, i) => (
                                    <PresentationRow key={p.id} presentation={p} index={i} onDelete={handleDeletePresentation} />
                                ))
                            )}
                        </div>
                    </motion.div>
                </div>
            )}

            {/* Presentations Tab */}
            {activeTab === 'presentations' && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="space-y-6"
                >
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h2 className="text-3xl font-bold font-display tracking-tight">My Library</h2>
                            <p className="text-zinc-500 text-sm mt-1">Found a total of {presentations.length} presentations.</p>
                        </div>
                        <Link href="/upload">
                            <button className="bg-primary hover:bg-primary-hover text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-orange-900/20">
                                <PlusCircle size={20} />
                                Add New
                            </button>
                        </Link>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredPresentations.map((p, i) => (
                            <PresentationCard key={p.id} presentation={p} index={i} onDelete={handleDeletePresentation} />
                        ))}
                        {filteredPresentations.length === 0 && (
                            <div className="col-span-full py-20 bg-zinc-900/20 rounded-[2rem] border border-dashed border-white/5 flex flex-col items-center gap-4 text-zinc-500">
                                <FileText size={64} className="opacity-10" />
                                <p>You haven&apos;t added anything to your presentation library yet.</p>
                            </div>
                        )}
                    </div>
                </motion.div>
            )}

            {/* Sessions Tab */}
            {activeTab === 'sessions' && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="space-y-6"
                >
                    <h2 className="text-3xl font-bold font-display tracking-tight mb-8">Session History</h2>
                    <div className="bg-[#0C0C0C] border border-white/5 rounded-[2rem] overflow-hidden">
                        <table className="w-full text-left">
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
                                {recentSessions.map((s) => (
                                    <tr key={s.id} className="hover:bg-white/[0.02] transition-colors group">
                                        <td className="px-8 py-6">
                                            <div className="font-semibold text-sm">{s.presentation.title}</div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${s.session_type === 'rehearsal' ? 'bg-blue-500/10 text-blue-500' : 'bg-emerald-500/10 text-emerald-500'
                                                }`}>
                                                {s.session_type === 'rehearsal' ? 'Rehearsal' : 'Live'}
                                            </span>
                                        </td>
                                        <td className="px-8 py-6 text-sm text-zinc-400">{s.duration_minutes} min</td>
                                        <td className="px-8 py-6 text-sm text-zinc-400">{new Date(s.started_at).toLocaleDateString('en-US')}</td>
                                        <td className="px-8 py-6 text-right">
                                            <button className="text-zinc-500 hover:text-white p-2 rounded-lg hover:bg-white/5 transition-all">
                                                <Eye size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {recentSessions.length === 0 && (
                            <div className="py-20 text-center text-zinc-600 italic">No recorded sessions found.</div>
                        )}
                    </div>
                </motion.div>
            )}
        </>
    );
}

function PresentationRow({ presentation, index, onDelete }: { presentation: RecentPresentation, index: number, onDelete: (id: number) => void }) {
    return (
        <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 + (index * 0.1) }}
            className="group flex items-center justify-between p-4 rounded-2xl hover:bg-white/[0.03] border border-transparent hover:border-white/5 transition-all"
        >
            <div className="flex items-center gap-4 min-w-0">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all shadow-sm">
                    <FileText size={20} />
                </div>
                <div className="min-w-0">
                    <p className="font-bold text-sm truncate pr-4">{presentation.title}</p>
                    <p className="text-[10px] text-zinc-500 flex items-center gap-2 mt-0.5 font-medium uppercase tracking-tighter">
                        <span>{presentation.slide_count} Slides</span>
                        <span className="w-1 h-1 rounded-full bg-zinc-700" />
                        <span>{new Date(presentation.created_at).toLocaleDateString('en-US')}</span>
                    </p>
                </div>
            </div>
            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Link href={`/analyze?id=${presentation.id}`}>
                    <button className="p-2 rounded-lg bg-zinc-900 border border-white/5 text-zinc-400 hover:text-white transition-all hover:shadow-lg">
                        <Eye size={16} />
                    </button>
                </Link>
                <button
                    onClick={() => onDelete(presentation.id)}
                    className="p-2 rounded-lg bg-zinc-900 border border-white/5 text-zinc-400 hover:text-red-500 transition-all hover:shadow-lg"
                >
                    <Trash2 size={16} />
                </button>
            </div>
        </motion.div>
    );
}

function PresentationCard({ presentation, index, onDelete }: { presentation: RecentPresentation, index: number, onDelete: (id: number) => void }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="bg-[#0C0C0C] border border-white/5 rounded-[2rem] p-6 group hover:border-primary/30 transition-all hover:shadow-2xl hover:shadow-primary/5 flex flex-col h-full"
        >
            <div className="flex items-start justify-between mb-6">
                <div className="w-14 h-14 rounded-2xl bg-zinc-900 flex items-center justify-center text-primary group-hover:scale-110 transition-transform shadow-inner">
                    <FileText size={28} />
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => onDelete(presentation.id)}
                        className="p-2 rounded-xl bg-zinc-900 border border-white/5 text-zinc-600 hover:text-red-500 transition-all"
                    >
                        <Trash2 size={16} />
                    </button>
                </div>
            </div>

            <h3 className="text-lg font-bold mb-2 truncate group-hover:text-primary transition-colors">{presentation.title}</h3>
            <div className="flex items-center gap-3 mb-6">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{presentation.slide_count} Slides</span>
                <span className="w-1 h-1 rounded-full bg-zinc-700"></span>
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{new Date(presentation.created_at).toLocaleDateString('en-US')}</span>
            </div>

            <div className="mt-auto flex items-center gap-3">
                <Link href={`/analyze?id=${presentation.id}`} className="flex-1">
                    <button className="w-full py-3 px-4 rounded-xl bg-white/5 border border-white/5 text-zinc-300 hover:text-white hover:bg-white/10 font-bold text-xs transition-all flex items-center justify-center gap-2">
                        View
                        <Eye size={14} />
                    </button>
                </Link>
                <Link href={`/analyze?id=${presentation.id}`} className="flex-1">
                    <button className="w-full py-3 px-4 rounded-xl bg-primary text-white font-bold text-xs transition-all shadow-lg shadow-orange-900/10 hover:shadow-orange-900/30 flex items-center justify-center gap-2 active:scale-95">
                        Start
                        <Play size={14} className="fill-white" />
                    </button>
                </Link>
            </div>
        </motion.div>
    );
}
