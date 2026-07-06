'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { createPortal } from "react-dom";
import { useRouter, useSearchParams } from "next/navigation";
import {
    Presentation,
    CalendarDays,
    Check,
    ChevronLeft,
    ChevronRight,
    Clock,
    Pencil,
    FileText,
    Play,
    Trash2,
    Eye,
    ArrowUpRight,
    ChevronDown,
    MoreVertical,
    X,
} from "lucide-react";
import { motion } from "framer-motion";
import { useDashboard, RecentPresentation } from "./DashboardContext";
import Sessions from "./sessions/Sessions";
import Profile from "./profile/Profile";
import TopicIdeas from "./ideas/TopicIdeas";
import AiGenerationForm from "./ai-presentation/AiGenerationForm";
import client from "../api/client";
import axios from "axios";
import { useTranslations } from "next-intl";

const TIME_24H_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;
const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const MINUTE_OPTIONS = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const WEEKDAY_SHORT = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function isValid24HourTime(value: string): boolean {
    return TIME_24H_REGEX.test(value);
}

function toDateKey(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

function localToUtcParts(dateKey: string, time: string): { date: string; time: string } {
    const [year, month, day] = dateKey.split('-').map(Number);
    const [hour, minute] = time.split(':').map(Number);
    const local = new Date(year, month - 1, day, hour, minute, 0, 0);

    return {
        date: `${local.getUTCFullYear()}-${String(local.getUTCMonth() + 1).padStart(2, '0')}-${String(local.getUTCDate()).padStart(2, '0')}`,
        time: `${String(local.getUTCHours()).padStart(2, '0')}:${String(local.getUTCMinutes()).padStart(2, '0')}`,
    };
}

function getDaysInMonth(year: number, month: number): number {
    return new Date(year, month, 0).getDate();
}

function fromDateKey(dateKey: string): Date {
    const [year, month, day] = dateKey.split('-').map(Number);
    return new Date(year, month - 1, day, 0, 0, 0, 0);
}

function toDisplayDate(dateKey: string): string {
    const [year, month, day] = dateKey.split('-');
    return `${day}/${month}/${year}`;
}

function subtractMinutes(time: string, minutes: number): string {
    if (!isValid24HourTime(time)) return '00:00';
    const [hour, minute] = time.split(':').map(Number);
    const total = (hour * 60 + minute - minutes + 1440) % 1440;
    const hh = Math.floor(total / 60);
    const mm = total % 60;
    return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

export default function DashboardPage() {
    const t = useTranslations('dashboard');
    const router = useRouter();
    const searchParams = useSearchParams();

    useEffect(() => {
        if (searchParams.get('tab') === 'planner') {
            router.replace('/dashboard/planner');
        }
    }, [router, searchParams]);

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
        setRecentSessions,
        setActiveTab
    } = useDashboard();

    const handleDeleteSession = async (sessionId: number) => {
        if (!confirm(t("deleteSessionConfirm"))) return;

        try {
            await client.delete(`/api/v1/presentations/sessions/${sessionId}`);
            setRecentSessions((prev) => {
                const removed = prev.find((session) => session.id === sessionId);
                const next = prev.filter((session) => session.id !== sessionId);

                if (removed && stats) {
                    const removedMinutes = (removed.duration_seconds || 0) / 60;
                    const nextCount = Math.max(0, stats.total_sessions - 1);
                    const currentTotalMinutes = (stats.avg_session_minutes || 0) * (stats.total_sessions || 0);
                    const nextTotalMinutes = Math.max(0, currentTotalMinutes - removedMinutes);

                    const nextLiveHours = removed.session_type === 'live'
                        ? Math.max(0, (stats.total_live_hours || 0) - removedMinutes / 60)
                        : (stats.total_live_hours || 0);
                    const nextRehearsalHours = removed.session_type === 'rehearsal'
                        ? Math.max(0, (stats.total_rehearsal_hours || 0) - removedMinutes / 60)
                        : (stats.total_rehearsal_hours || 0);

                    setStats({
                        ...stats,
                        total_sessions: nextCount,
                        avg_session_minutes: nextCount > 0 ? Number((nextTotalMinutes / nextCount).toFixed(1)) : 0,
                        total_live_hours: Number(nextLiveHours.toFixed(1)),
                        total_rehearsal_hours: Number(nextRehearsalHours.toFixed(1)),
                    });
                }

                return next;
            });
            setAlert({ type: 'info', message: t('sessionDeleted') });
            setTimeout(() => setAlert(null), 3500);
        } catch {
            setAlert({ type: 'error', message: t('sessionDeleteFailed') });
            setTimeout(() => setAlert(null), 3500);
        }
    };

    const [plannerModalPresentation, setPlannerModalPresentation] = useState<RecentPresentation | null>(null);
    const [plannerDate, setPlannerDate] = useState(() => toDateKey(new Date()));
    const [plannerTime, setPlannerTime] = useState('09:00');
    const [hasSelectedPresentationTime, setHasSelectedPresentationTime] = useState(false);
    const [useReminder, setUseReminder] = useState(true);
    const [customReminderTime, setCustomReminderTime] = useState('');
    const [plannerNote, setPlannerNote] = useState('');
    const [editingPresentationId, setEditingPresentationId] = useState<number | null>(null);
    const [editingPresentationTitle, setEditingPresentationTitle] = useState('');
    const [isSavingPresentationTitle, setIsSavingPresentationTitle] = useState(false);

    const selectedPlannerHour = isValid24HourTime(plannerTime) ? plannerTime.split(':')[0] : '09';
    const selectedPlannerMinute = isValid24HourTime(plannerTime) ? plannerTime.split(':')[1] : '00';
    const displayPlannerDate = useMemo(() => toDisplayDate(plannerDate), [plannerDate]);
    const defaultReminderTime = useMemo(() => subtractMinutes(plannerTime, 30), [plannerTime]);
    const selectedReminderTime = isValid24HourTime(customReminderTime) ? customReminderTime : defaultReminderTime;
    const selectedReminderHour = selectedReminderTime.split(':')[0];
    const selectedReminderMinute = selectedReminderTime.split(':')[1];

    const handleDeletePresentation = async (id: number) => {
        if (!confirm(t("deletePresentationConfirm"))) return;

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
            setAlert({ type: 'info', message: t('presentationDeleted') });
            setTimeout(() => setAlert(null), 3500);
        } catch (error) {
            let msg = t('presentationDeleteFailed');
            const status = axios.isAxiosError(error) ? error.response?.status : undefined;

            if (status === 403) {
                msg = t('permissionDenied');
            } else if (status === 404) {
                msg = t('presentationNotFound');
            } else if (status && status >= 500) {
                msg = t('serverError');
            }

            setAlert({ type: 'error', message: msg });
            setTimeout(() => setAlert(null), 3500);
        }
    };

    const startEditingPresentationTitle = (presentation: RecentPresentation) => {
        setEditingPresentationId(presentation.id);
        setEditingPresentationTitle(presentation.title || '');
    };

    const cancelEditingPresentationTitle = () => {
        setEditingPresentationId(null);
        setEditingPresentationTitle('');
        setIsSavingPresentationTitle(false);
    };

    const savePresentationTitle = async (presentationId: number) => {
        const normalizedTitle = editingPresentationTitle.trim();

        if (!normalizedTitle) {
            setAlert({ type: 'error', message: t('titleEmpty') });
            setTimeout(() => setAlert(null), 3500);
            return;
        }

        try {
            setIsSavingPresentationTitle(true);
            await client.patch(`/api/v1/presentations/${presentationId}`, { title: normalizedTitle });

            setPresentations((prev: RecentPresentation[]) =>
                prev.map((item: RecentPresentation) =>
                    item.id === presentationId ? { ...item, title: normalizedTitle } : item
                )
            );

            setRecentPresentations((prev: RecentPresentation[]) =>
                prev.map((item: RecentPresentation) =>
                    item.id === presentationId ? { ...item, title: normalizedTitle } : item
                )
            );

            setPlannerModalPresentation((prev) =>
                prev && prev.id === presentationId ? { ...prev, title: normalizedTitle } : prev
            );

            setAlert({ type: 'info', message: t('titleUpdated') });
            setTimeout(() => setAlert(null), 3500);
            cancelEditingPresentationTitle();
        } catch {
            setAlert({ type: 'error', message: t('titleUpdateFailed') });
            setTimeout(() => setAlert(null), 3500);
            setIsSavingPresentationTitle(false);
        }
    };

    const filteredPresentations = searchQuery.trim()
        ? presentations.filter(p => p.title?.toLowerCase().includes(searchQuery.toLowerCase()))
        : presentations;

    const openPlannerModal = (presentation: RecentPresentation) => {
        const now = new Date();
        const initialTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        setPlannerModalPresentation(presentation);
        setPlannerDate(toDateKey(new Date()));
        setPlannerTime(initialTime);
        setHasSelectedPresentationTime(false);
        setUseReminder(true);
        setCustomReminderTime(subtractMinutes(initialTime, 30));
        setPlannerNote('');
    };

    const closePlannerModal = () => {
        setPlannerModalPresentation(null);
    };

    const updatePlannerHour = (hour: string) => {
        setHasSelectedPresentationTime(true);
        setPlannerTime(`${hour}:${selectedPlannerMinute}`);
    };

    const updatePlannerMinute = (minute: string) => {
        setHasSelectedPresentationTime(true);
        setPlannerTime(`${selectedPlannerHour}:${minute}`);
    };

    const updateReminderHour = (hour: string) => {
        setUseReminder(true);
        setCustomReminderTime(`${hour}:${selectedReminderMinute}`);
    };

    const updateReminderMinute = (minute: string) => {
        setUseReminder(true);
        setCustomReminderTime(`${selectedReminderHour}:${minute}`);
    };

    const applyReminderThirtyMinutesAgo = () => {
        const value = subtractMinutes(plannerTime, 30);
        setUseReminder(true);
        setCustomReminderTime(value);
    };

    const handleAddToPlanner = async () => {
        if (!plannerModalPresentation || !isValid24HourTime(plannerTime)) return;

        try {
            const scheduledUtc = localToUtcParts(plannerDate, plannerTime);
            const reminderTime = useReminder
                ? selectedReminderTime
                : undefined;
            const reminderUtc = reminderTime ? localToUtcParts(plannerDate, reminderTime) : null;
            const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || undefined;

            await client.post('/api/v1/planner/events', {
                presentation_id: plannerModalPresentation.id,
                scheduled_date: scheduledUtc.date,
                scheduled_time: scheduledUtc.time,
                reminder_date: reminderUtc?.date,
                reminder_time: reminderUtc?.time,
                timezone: browserTimezone,
                note: plannerNote.trim() || undefined,
            });

            setAlert({ type: 'info', message: t('addedToPlanner') });
            setTimeout(() => setAlert(null), 3500);
            closePlannerModal();
        } catch {
            setAlert({ type: 'error', message: t('plannerAddFailed') });
            setTimeout(() => setAlert(null), 3500);
        }
    };

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
                                        {t('stageReady')}
                                    </div>
                                    <div className="flex gap-1">
                                        <div className="w-1 h-1 rounded-full bg-primary animate-pulse" />
                                        <div className="w-1 h-1 rounded-full bg-primary/50" />
                                        <div className="w-1 h-1 rounded-full bg-primary/20" />
                                    </div>
                                </div>

                                <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black mb-3 leading-[1.1] italic uppercase tracking-tighter text-white">
                                    {t('shortestPath')} <br />
                                    <span className="text-primary group-hover:text-white transition-colors duration-500">{t('toPerfection')}</span>
                                </h2>

                                <p className="text-zinc-400 text-sm md:text-base max-w-sm font-medium leading-relaxed">
                                    {t('aiHandlesCues')}
                                </p>
                            </div>

                            <div className="mt-8 md:mt-12 flex flex-wrap gap-4 items-center">
                                <Link href="/upload">
                                    <button className="bg-white text-black hover:bg-primary hover:text-white px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-tight flex items-center gap-2 transition-all active:scale-95 shadow-xl shadow-white/5 border border-transparent hover:border-white/10">
                                        {t('initiateSession')}
                                        <ArrowUpRight size={18} />
                                    </button>
                                </Link>
                                <div className="flex -space-x-2">
                                    {[1, 2, 3].map((i) => (
                                        <div key={i} className="w-8 h-8 rounded-full border-2 border-[#0c0c0c] bg-zinc-800 flex items-center justify-center text-[10px] font-bold">
                                            {i === 3 ? '+' : ''}
                                        </div>
                                    ))}
                                    <span className="ml-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest self-center">
                                        {t('masteredCount', { count: '1.2k+' })}
                                    </span>
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
                                {t('recentPresentations')}
                            </h3>
                            <button
                                onClick={() => setActiveTab('presentations')}
                                className="text-xs text-zinc-500 hover:text-white flex items-center gap-1 transition-colors"
                            >
                                {t('seeAll')} <ArrowUpRight size={14} />
                            </button>
                        </div>

                        <div className="space-y-4">
                            {recentPresentations.length === 0 ? (
                                <div className="py-12 flex flex-col items-center text-zinc-600 gap-3">
                                    <FileText size={48} className="opacity-20" />
                                    <p className="text-sm">{t('noPresentations')}</p>
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
                    <div className="mt-8 space-y-3">
                        <p className="px-1 text-xs font-semibold uppercase tracking-widest text-zinc-500">
                            {t('foundPresentations', { count: filteredPresentations.length })}
                        </p>
                        <div className="bg-[#0C0C0C] border border-white/5 rounded-[2rem] overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="min-w-[760px] w-full text-left">
                                    <thead>
                                        <tr className="border-b border-white/5">
                                            <th className="px-8 py-6 text-xs font-bold text-zinc-500 uppercase tracking-widest">{t('name')}</th>
                                            <th className="px-8 py-6 text-xs font-bold text-zinc-500 uppercase tracking-widest">{t('date')}</th>
                                            <th className="px-8 py-6 text-xs font-bold text-zinc-500 uppercase tracking-widest text-right">{t('actionsCol')}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {filteredPresentations.map((p, i) => (
                                            <PresentationCard
                                                key={p.id}
                                                presentation={p}
                                                index={i}
                                                onDelete={handleDeletePresentation}
                                                onAddToPlanner={openPlannerModal}
                                                editingPresentationId={editingPresentationId}
                                                editingPresentationTitle={editingPresentationTitle}
                                                onEditingPresentationTitleChange={setEditingPresentationTitle}
                                                onStartEditing={startEditingPresentationTitle}
                                                onCancelEditing={cancelEditingPresentationTitle}
                                                onSaveTitle={savePresentationTitle}
                                                isSavingTitle={isSavingPresentationTitle}
                                            />
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            {filteredPresentations.length === 0 && (
                                <div className="py-20 text-center text-zinc-600 italic">{t('noPresentations')}</div>
                            )}
                        </div>
                    </div>
                </motion.div>
            )}

            {/* AI Presentation — Generation Form */}
            {activeTab === 'ai-presentation' && (
                <AiGenerationForm />
            )}

            {/* Topic Ideas */}
            {activeTab === 'ideas-topics' && <TopicIdeas />}

            {/* Ideas — placeholders (hooks & visuals remain pending) */}
            {(activeTab === 'ideas-hooks' || activeTab === 'ideas-visuals') && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="min-h-[40vh]"
                />
            )}

            {/* Sessions Tab */}
            {activeTab === 'sessions' && (
                <Sessions sessions={recentSessions} searchQuery={searchQuery} onDeleteSession={handleDeleteSession} />
            )}

            {/* Profile Tab */}
            {activeTab === 'profile' && (
                <Profile />
            )}

            {/* Billing Tab — placeholder */}
            {activeTab === 'billing' && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="min-h-[40vh]"
                />
            )}

            {plannerModalPresentation && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
                    <div className="w-full max-w-md rounded-[1.5rem] border border-white/10 bg-[#0C0C0C] p-5 sm:p-6">
                        <div className="mb-4 flex items-start justify-between">
                            <div>
                                <h3 className="text-lg font-bold text-white">{t('addToPlannerTitle')}</h3>
                                <p className="mt-1 text-xs text-zinc-400">{plannerModalPresentation.title}</p>
                            </div>
                            <button
                                type="button"
                                onClick={closePlannerModal}
                                className="rounded-md border border-white/10 p-1.5 text-zinc-400 transition-colors hover:text-white"
                            >
                                <X size={14} />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
                                <p className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                                    <CalendarDays size={12} />
                                    {t('dateLabel')}
                                </p>
                                <DatePickerDropdown
                                    value={plannerDate}
                                    onChange={setPlannerDate}
                                    ariaLabel="Planner date"
                                />
                                <p className="mt-2 text-[11px] text-zinc-500">{t('selectedDate')} <span className="font-semibold text-zinc-200">{displayPlannerDate}</span></p>
                            </div>

                            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
                                <p className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                                    <Clock size={12} />
                                    {t('presentationTime')}
                                </p>
                                <p className="mb-2 text-xs text-zinc-300">
                                    {t('presentationTimeDesc')}
                                </p>
                                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                                    <TimeDropdown
                                        value={selectedPlannerHour}
                                        options={HOUR_OPTIONS}
                                        onChange={updatePlannerHour}
                                        ariaLabel="Planner hour"
                                    />
                                    <span className="text-sm font-semibold text-zinc-300">:</span>
                                    <TimeDropdown
                                        value={selectedPlannerMinute}
                                        options={MINUTE_OPTIONS}
                                        onChange={updatePlannerMinute}
                                        ariaLabel="Planner minute"
                                    />
                                </div>
                                <p className="mt-2 text-[11px] text-zinc-500">{t('presentationStartsAt')} <span className="font-semibold text-zinc-200">{plannerTime}</span></p>
                            </div>

                            {hasSelectedPresentationTime && isValid24HourTime(plannerTime) && (
                                <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
                                    <div className="mb-2 flex items-center justify-between">
                                        <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">{t('emailReminder')}</p>
                                        <button
                                            type="button"
                                            onClick={() => setUseReminder((v) => !v)}
                                            className={`rounded-md border px-2 py-1 text-[10px] font-semibold transition-colors ${useReminder
                                                ? 'border-primary/30 text-primary hover:bg-primary/10'
                                                : 'border-white/15 text-zinc-300 hover:bg-white/[0.04]'
                                                }`}
                                        >
                                            {useReminder ? t('disable') : t('enable')}
                                        </button>
                                    </div>
                                    <p className="mb-2 text-xs text-zinc-300">
                                        {t('reminderDesc')}
                                    </p>
                                    <button
                                        type="button"
                                        onClick={applyReminderThirtyMinutesAgo}
                                        className="mb-2 w-full rounded-lg border border-primary/35 bg-primary/12 py-2 text-xs font-semibold text-primary transition-colors hover:bg-primary/20"
                                    >
                                        {t('thirtyMinReminder')}
                                    </button>
                                    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                                        <TimeDropdown
                                            value={selectedReminderHour}
                                            options={HOUR_OPTIONS}
                                            onChange={updateReminderHour}
                                            ariaLabel="Reminder hour"
                                        />
                                        <span className="text-sm font-semibold text-zinc-300">:</span>
                                        <TimeDropdown
                                            value={selectedReminderMinute}
                                            options={MINUTE_OPTIONS}
                                            onChange={updateReminderMinute}
                                            ariaLabel="Reminder minute"
                                        />
                                    </div>
                                    <p className="mt-2 text-[11px] text-zinc-500">{t('emailSentAt')} <span className="font-semibold text-zinc-200">{useReminder ? selectedReminderTime : t('noReminder')}</span></p>
                                </div>
                            )}

                            {!hasSelectedPresentationTime && (
                                <p className="text-[11px] text-zinc-500">
                                    {t('selectTimeFirst')}
                                </p>
                            )}

                            {hasSelectedPresentationTime && isValid24HourTime(plannerTime) && (
                                <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
                                    <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-zinc-500">{t('noteLabel')}</p>
                                    <textarea
                                        value={plannerNote}
                                        onChange={(e) => setPlannerNote(e.target.value)}
                                        maxLength={300}
                                        placeholder={t('notePlaceholder')}
                                        className="invisible-scrollbar min-h-[90px] w-full resize-none rounded-lg border border-white/10 bg-[#0C0C0C] px-3 py-2 text-sm text-white placeholder:text-zinc-500 outline-none focus:border-primary/50"
                                    />
                                </div>
                            )}
                        </div>

                        <div className="mt-5 grid grid-cols-2 gap-2">
                            <button
                                type="button"
                                onClick={closePlannerModal}
                                className="rounded-lg border border-white/10 py-2.5 text-sm font-semibold text-zinc-300 transition-colors hover:bg-white/[0.04]"
                            >
                                {t('cancel')}
                            </button>
                            <button
                                type="button"
                                onClick={handleAddToPlanner}
                                disabled={!hasSelectedPresentationTime || !isValid24HourTime(plannerTime)}
                                className="rounded-lg bg-primary py-2.5 text-sm font-bold text-white transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {t('addToPlannerBtn')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

function TimeDropdown({
    value,
    options,
    onChange,
    ariaLabel,
    allowManual = true,
}: {
    value: string;
    options: string[];
    onChange: (value: string) => void;
    ariaLabel: string;
    allowManual?: boolean;
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [inputValue, setInputValue] = useState(value);
    const wrapperRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        setInputValue(value);
    }, [value]);

    const commitManualValue = useCallback(() => {
        if (!/^\d{1,2}$/.test(inputValue)) {
            setInputValue(value);
            return;
        }

        const parsed = Number(inputValue);
        const max = options.length - 1;
        const clamped = Math.min(Math.max(parsed, 0), max);
        const formatted = String(clamped).padStart(2, '0');
        onChange(formatted);
        setInputValue(formatted);
    }, [inputValue, value, options.length, onChange]);

    useEffect(() => {
        const handleOutsideClick = (event: MouseEvent) => {
            if (!wrapperRef.current) return;
            if (!wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleOutsideClick);
        return () => document.removeEventListener('mousedown', handleOutsideClick);
    }, []);

    return (
        <div ref={wrapperRef} className="relative">
            <div className="flex w-full items-center rounded-md border border-primary/35 bg-[#0C0C0C] px-1.5 py-1 text-sm font-semibold text-white outline-none transition-colors hover:border-primary focus-within:border-primary">
                {allowManual ? (
                    <input
                        type="text"
                        value={inputValue}
                        onChange={(e) => {
                            const next = e.target.value.replace(/\D/g, '').slice(0, 2);
                            setInputValue(next);
                        }}
                        onBlur={commitManualValue}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                commitManualValue();
                                setIsOpen(false);
                            }
                        }}
                        aria-label={ariaLabel}
                        className="w-full bg-transparent px-1 text-center text-sm font-semibold text-white outline-none"
                    />
                ) : (
                    <span className="w-full px-1 text-center text-sm font-semibold text-white">{value}</span>
                )}
                <button
                    type="button"
                    onClick={() => setIsOpen((prev) => !prev)}
                    className="rounded p-1 text-white/80 transition-colors hover:text-white"
                    aria-label={`${ariaLabel} options`}
                >
                    <ChevronDown className={`h-3.5 w-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </button>
            </div>

            {isOpen && (
                <div className="absolute left-0 right-0 z-50 mt-1 rounded-md border border-primary/35 bg-[#0C0C0C] shadow-[0_12px_30px_-10px_rgba(0,0,0,0.9)]">
                    <div className="max-h-48 overflow-y-auto p-1 invisible-scrollbar">
                        {options.map((option) => (
                            <button
                                key={`${ariaLabel}-${option}`}
                                type="button"
                                onClick={() => {
                                    onChange(option);
                                    setInputValue(option);
                                    setIsOpen(false);
                                }}
                                className={`block w-full rounded px-2 py-1 text-left text-sm font-semibold transition-colors ${option === value
                                    ? 'bg-primary text-white'
                                    : 'text-white hover:bg-primary/20'
                                    }`}
                            >
                                {option}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

function DatePickerDropdown({
    value,
    onChange,
    ariaLabel,
}: {
    value: string;
    onChange: (value: string) => void;
    ariaLabel: string;
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [viewDate, setViewDate] = useState(() => fromDateKey(value));
    const wrapperRef = useRef<HTMLDivElement | null>(null);
    const selectedDate = useMemo(() => fromDateKey(value), [value]);

    useEffect(() => {
        setViewDate(fromDateKey(value));
    }, [value]);

    useEffect(() => {
        const handleOutsideClick = (event: MouseEvent) => {
            if (!wrapperRef.current) return;
            if (!wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleOutsideClick);
        return () => document.removeEventListener('mousedown', handleOutsideClick);
    }, []);

    const month = viewDate.getMonth();
    const year = viewDate.getFullYear();
    const daysInMonth = getDaysInMonth(year, month + 1);
    const firstWeekday = new Date(year, month, 1).getDay();
    const cells: (number | null)[] = [];

    for (let i = 0; i < firstWeekday; i++) cells.push(null);
    for (let day = 1; day <= daysInMonth; day++) cells.push(day);

    while (cells.length % 7 !== 0) cells.push(null);

    const goToPreviousMonth = () => setViewDate(new Date(year, month - 1, 1));
    const goToNextMonth = () => setViewDate(new Date(year, month + 1, 1));

    return (
        <div ref={wrapperRef} className="relative">
            <button
                type="button"
                onClick={() => setIsOpen((prev) => !prev)}
                aria-label={ariaLabel}
                className="flex w-full items-center justify-between rounded-lg border border-white/10 bg-[#0C0C0C] px-3 py-2 text-sm font-semibold text-white outline-none transition-colors hover:border-primary/40 focus:border-primary/40"
            >
                <span>{toDisplayDate(value)}</span>
                <CalendarDays className="h-4 w-4 text-zinc-400" />
            </button>

            {isOpen && (
                <div className="absolute left-0 z-50 mt-2 w-full rounded-xl border border-white/10 bg-[#0C0C0C] p-3 shadow-[0_14px_34px_-10px_rgba(0,0,0,0.9)]">
                    <div className="mb-3 flex items-center justify-between">
                        <button
                            type="button"
                            onClick={goToPreviousMonth}
                            className="rounded-md border border-white/10 p-1.5 text-zinc-300 transition-colors hover:border-primary/40 hover:text-white"
                            aria-label="Previous month"
                        >
                            <ChevronLeft className="h-3.5 w-3.5" />
                        </button>
                        <p className="text-sm font-semibold text-white">{MONTH_NAMES[month]} {year}</p>
                        <button
                            type="button"
                            onClick={goToNextMonth}
                            className="rounded-md border border-white/10 p-1.5 text-zinc-300 transition-colors hover:border-primary/40 hover:text-white"
                            aria-label="Next month"
                        >
                            <ChevronRight className="h-3.5 w-3.5" />
                        </button>
                    </div>

                    <div className="mb-2 grid grid-cols-7 gap-1 text-center text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                        {WEEKDAY_SHORT.map((day, index) => (
                            <span key={`${day}-${index}`}>{day}</span>
                        ))}
                    </div>

                    <div className="grid grid-cols-7 gap-1">
                        {cells.map((day, index) => {
                            if (!day) {
                                return <span key={`empty-${index}`} className="h-8" />;
                            }

                            const isSelected =
                                day === selectedDate.getDate() &&
                                month === selectedDate.getMonth() &&
                                year === selectedDate.getFullYear();

                            return (
                                <button
                                    key={`${year}-${month}-${day}`}
                                    type="button"
                                    onClick={() => {
                                        onChange(`${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`);
                                        setIsOpen(false);
                                    }}
                                    className={`h-8 rounded-md text-xs font-semibold transition-colors ${isSelected
                                        ? 'bg-primary text-white'
                                        : 'text-zinc-200 hover:bg-white/[0.08]'
                                        }`}
                                >
                                    {day}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}

function PresentationRow({ presentation, index, onDelete }: { presentation: RecentPresentation, index: number, onDelete: (id: number) => void }) {
    const t = useTranslations('dashboard');
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
                        <span>{presentation.slide_count} {t('slides')}</span>
                        {presentation.is_ai_generated && (
                            <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[9px] font-bold tracking-widest text-primary">
                                {t('aiBadge')}
                            </span>
                        )}
                        <span className="w-1 h-1 rounded-full bg-zinc-700" />
                        <span>{new Date(presentation.created_at).toLocaleDateString('en-US')}</span>
                    </p>
                </div>
            </div>
            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Link href={`/analyze?id=${presentation.id}&returnTo=${encodeURIComponent('/dashboard?tab=overview')}`}>
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

function PresentationCard({
    presentation,
    index,
    onDelete,
    onAddToPlanner,
    editingPresentationId,
    editingPresentationTitle,
    onEditingPresentationTitleChange,
    onStartEditing,
    onCancelEditing,
    onSaveTitle,
    isSavingTitle,
}: {
    presentation: RecentPresentation,
    index: number,
    onDelete: (id: number) => void,
    onAddToPlanner: (presentation: RecentPresentation) => void,
    editingPresentationId: number | null,
    editingPresentationTitle: string,
    onEditingPresentationTitleChange: (value: string) => void,
    onStartEditing: (presentation: RecentPresentation) => void,
    onCancelEditing: () => void,
    onSaveTitle: (presentationId: number) => void,
    isSavingTitle: boolean,
}) {
    const t = useTranslations('dashboard');
    const createdAt = new Date(presentation.created_at);
    const createdDate = `${String(createdAt.getDate()).padStart(2, '0')}/${String(createdAt.getMonth() + 1).padStart(2, '0')}/${createdAt.getFullYear()}`;
    const isEditing = editingPresentationId === presentation.id;
    const [isActionMenuOpen, setIsActionMenuOpen] = useState(false);
    const [actionMenuPosition, setActionMenuPosition] = useState<{ top: number; left: number } | null>(null);

    useEffect(() => {
        if (!isActionMenuOpen) return;

        const closeMenu = () => {
            setIsActionMenuOpen(false);
            setActionMenuPosition(null);
        };

        const handleOutsideClick = (event: MouseEvent) => {
            const target = event.target as Element | null;
            if (target?.closest('[data-presentation-menu-root]')) return;
            closeMenu();
        };

        document.addEventListener('mousedown', handleOutsideClick);
        window.addEventListener('resize', closeMenu);
        window.addEventListener('scroll', closeMenu, true);

        return () => {
            document.removeEventListener('mousedown', handleOutsideClick);
            window.removeEventListener('resize', closeMenu);
            window.removeEventListener('scroll', closeMenu, true);
        };
    }, [isActionMenuOpen]);

    return (
        <motion.tr
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.04 }}
            className="group transition-colors hover:bg-white/[0.02]"
        >
            <td className="px-8 py-5">
                <div className="min-w-0">
                    {isEditing ? (
                        <div className="flex items-center gap-2">
                            <input
                                type="text"
                                value={editingPresentationTitle}
                                onChange={(e) => onEditingPresentationTitleChange(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        onSaveTitle(presentation.id);
                                    }
                                    if (e.key === 'Escape') {
                                        e.preventDefault();
                                        onCancelEditing();
                                    }
                                }}
                                autoFocus
                                maxLength={500}
                                className="w-full max-w-md rounded-md border border-primary/40 bg-[#101010] px-2.5 py-1.5 text-xs font-semibold text-white outline-none focus:border-primary"
                                aria-label={t('editTitle')}
                            />
                            <button
                                type="button"
                                onClick={() => onSaveTitle(presentation.id)}
                                disabled={isSavingTitle}
                                className="inline-flex items-center justify-center rounded-md border border-primary/40 bg-primary/15 p-1.5 text-primary transition-colors hover:bg-primary/25 disabled:cursor-not-allowed disabled:opacity-60"
                                title={t('saveTitle')}
                            >
                                <Check size={13} />
                            </button>
                            <button
                                type="button"
                                onClick={onCancelEditing}
                                disabled={isSavingTitle}
                                className="inline-flex items-center justify-center rounded-md border border-white/10 bg-white/[0.03] p-1.5 text-zinc-300 transition-colors hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-60"
                                title={t('cancelEdit')}
                            >
                                <X size={13} />
                            </button>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2">
                            <h3 className="truncate text-xs font-semibold text-white sm:text-sm">{presentation.title}</h3>
                            <button
                                type="button"
                                onClick={() => onStartEditing(presentation)}
                                className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/[0.03] px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-300 transition-colors hover:bg-white/[0.08] hover:text-white"
                                title={t('editTitle')}
                            >
                                <Pencil size={11} />
                            </button>
                        </div>
                    )}
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
                        <span>{presentation.slide_count} {t('slides')}</span>
                        {presentation.is_ai_generated && (
                            <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[9px] font-bold tracking-widest text-primary">
                                {t('aiBadge')}
                            </span>
                        )}
                    </div>
                </div>
            </td>

            <td className="px-8 py-5 text-xs text-zinc-300 sm:text-sm">
                {createdDate}
            </td>

            <td className="px-8 py-5 text-right">
                <div className="inline-flex" data-presentation-menu-root>
                    <button
                        type="button"
                        onClick={(event) => {
                            if (isActionMenuOpen) {
                                setIsActionMenuOpen(false);
                                setActionMenuPosition(null);
                                return;
                            }

                            const rect = event.currentTarget.getBoundingClientRect();
                            const menuWidth = 192;
                            const margin = 8;
                            const left = Math.min(
                                window.innerWidth - menuWidth - margin,
                                Math.max(margin, rect.right - menuWidth)
                            );

                            setActionMenuPosition({ top: rect.bottom + 6, left });
                            setIsActionMenuOpen(true);
                        }}
                        className="rounded-lg p-2 text-zinc-500 transition-all hover:bg-white/5 hover:text-white"
                        title={t('presentationActions')}
                        aria-label={t('presentationActions')}
                    >
                        <MoreVertical size={16} />
                    </button>

                    {isActionMenuOpen && actionMenuPosition && typeof document !== 'undefined' &&
                        createPortal(
                            <div
                                data-presentation-menu-root
                                className="fixed z-[120] w-48 overflow-hidden rounded-xl border border-white/10 bg-[#111111] shadow-xl"
                                style={{ top: actionMenuPosition.top, left: actionMenuPosition.left }}
                            >
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsActionMenuOpen(false);
                                        setActionMenuPosition(null);
                                        onAddToPlanner(presentation);
                                    }}
                                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-zinc-200 transition-colors hover:bg-primary/15 hover:text-primary"
                                >
                                    <CalendarDays size={14} />
                                    {t('addToPlanner')}
                                </button>

                                <Link
                                    href={`/analyze?id=${presentation.id}&returnTo=${encodeURIComponent('/dashboard?tab=presentations')}`}
                                    onClick={() => {
                                        setIsActionMenuOpen(false);
                                        setActionMenuPosition(null);
                                    }}
                                    className="flex w-full items-center gap-2 px-3 py-2 text-sm text-zinc-200 transition-colors hover:bg-white/5 hover:text-white"
                                >
                                    <Eye size={14} />
                                    {t('view')}
                                </Link>

                                <Link
                                    href={`/presentation/${presentation.id}`}
                                    onClick={() => {
                                        setIsActionMenuOpen(false);
                                        setActionMenuPosition(null);
                                    }}
                                    className="flex w-full items-center gap-2 px-3 py-2 text-sm text-zinc-200 transition-colors hover:bg-white/5 hover:text-white"
                                >
                                    <Play size={14} />
                                    {t('presentAgain')}
                                </Link>

                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsActionMenuOpen(false);
                                        setActionMenuPosition(null);
                                        onDelete(presentation.id);
                                    }}
                                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-zinc-200 transition-colors hover:bg-red-500/10 hover:text-red-400"
                                >
                                    <Trash2 size={14} />
                                    {t('delete')}
                                </button>
                            </div>,
                            document.body
                        )}
                </div>
            </td>
        </motion.tr>
    );
}
