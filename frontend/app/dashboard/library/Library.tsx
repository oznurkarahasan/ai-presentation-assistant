'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { CalendarDays, ChevronDown, Clock, Eye, FileText, Play, PlusCircle, Trash2, X, Zap } from 'lucide-react';
import { motion } from 'framer-motion';
import client from '../../api/client';
import { RecentPresentation } from '../DashboardContext';

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const MINUTE_OPTIONS = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));
const TIME_24H_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;
const NOTE_MAX_LENGTH = 300;

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

function subtractMinutes(time: string, minutes: number): string {
    if (!isValid24HourTime(time)) return '00:00';
    const [hour, minute] = time.split(':').map(Number);
    const total = (hour * 60 + minute - minutes + 1440) % 1440;
    const hh = Math.floor(total / 60);
    const mm = total % 60;
    return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

type AlertSetter = (alert: { type: 'info' | 'error'; message: string } | null) => void;

interface LibraryProps {
    presentations: RecentPresentation[];
    searchQuery: string;
    onDelete: (id: number) => void;
    setAlert: AlertSetter;
}

export default function Library({ presentations, searchQuery, onDelete, setAlert }: LibraryProps) {
    const [plannerModalPresentation, setPlannerModalPresentation] = useState<RecentPresentation | null>(null);
    const [plannerDate, setPlannerDate] = useState(() => toDateKey(new Date()));
    const [plannerTime, setPlannerTime] = useState('09:00');
    const [useReminder, setUseReminder] = useState(true);
    const [customReminderTime, setCustomReminderTime] = useState('');
    const [plannerNote, setPlannerNote] = useState('');

    const filteredPresentations = searchQuery.trim()
        ? presentations.filter((p) => p.title?.toLowerCase().includes(searchQuery.toLowerCase()))
        : presentations;

    const totalSlides = useMemo(
        () => presentations.reduce((acc, p) => acc + (p.slide_count || 0), 0),
        [presentations]
    );

    const latestUploadDate = useMemo(() => {
        if (presentations.length === 0) return 'No uploads yet';
        const latest = [...presentations]
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
        return new Date(latest.created_at).toLocaleDateString('en-US');
    }, [presentations]);

    const selectedPlannerHour = isValid24HourTime(plannerTime) ? plannerTime.split(':')[0] : '09';
    const selectedPlannerMinute = isValid24HourTime(plannerTime) ? plannerTime.split(':')[1] : '00';
    const defaultReminderTime = useMemo(() => subtractMinutes(plannerTime, 30), [plannerTime]);
    const selectedReminderTime = isValid24HourTime(customReminderTime) ? customReminderTime : defaultReminderTime;
    const selectedReminderHour = selectedReminderTime.split(':')[0];
    const selectedReminderMinute = selectedReminderTime.split(':')[1];

    const openPlannerModal = (presentation: RecentPresentation) => {
        const now = new Date();
        const initialTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        setPlannerModalPresentation(presentation);
        setPlannerDate(toDateKey(new Date()));
        setPlannerTime(initialTime);
        setUseReminder(true);
        setCustomReminderTime(subtractMinutes(initialTime, 30));
        setPlannerNote('');
    };

    const closePlannerModal = () => {
        setPlannerModalPresentation(null);
    };

    const updatePlannerHour = (hour: string) => {
        setPlannerTime(`${hour}:${selectedPlannerMinute}`);
    };

    const updatePlannerMinute = (minute: string) => {
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
            const reminderTime = useReminder ? selectedReminderTime : undefined;
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

            setAlert({ type: 'info', message: 'Presentation added to planner.' });
            setTimeout(() => setAlert(null), 3500);
            closePlannerModal();
        } catch {
            setAlert({ type: 'error', message: 'Presentation could not be added to planner.' });
            setTimeout(() => setAlert(null), 3500);
        }
    };

    return (
        <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                <div className="rounded-[1.75rem] border border-white/5 bg-[#0C0C0C] p-4 sm:p-6 lg:p-7">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                        <div>
                            <h2 className="text-2xl font-bold font-display tracking-tight sm:text-3xl">My Library</h2>
                            <p className="mt-1 text-sm text-zinc-500">Clean, searchable access to all your presentations.</p>
                        </div>
                        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center sm:justify-end sm:gap-3">
                            <div className="rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Files</p>
                                <p className="text-sm font-semibold text-white">{presentations.length}</p>
                            </div>
                            <div className="rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Slides</p>
                                <p className="text-sm font-semibold text-white">{totalSlides}</p>
                            </div>
                            <div className="col-span-2 rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2 sm:col-span-1">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Latest Upload</p>
                                <p className="text-sm font-semibold text-white">{latestUploadDate}</p>
                            </div>
                        </div>
                    </div>

                    <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-xs text-zinc-400">
                            Showing {filteredPresentations.length} of {presentations.length} presentations.
                        </p>
                        <Link href="/upload">
                            <button className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white transition-all hover:bg-primary-hover sm:w-auto">
                                <PlusCircle size={18} />
                                Add New
                            </button>
                        </Link>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {filteredPresentations.map((p, i) => (
                        <PresentationCard
                            key={p.id}
                            presentation={p}
                            index={i}
                            onDelete={onDelete}
                            onAddToPlanner={openPlannerModal}
                        />
                    ))}
                    {filteredPresentations.length === 0 && (
                        <div className="col-span-full flex flex-col items-center gap-4 rounded-[1.5rem] border border-dashed border-white/10 bg-[#0C0C0C] py-16 text-center text-zinc-500">
                            <FileText size={56} className="opacity-20" />
                            <div className="space-y-1">
                                <p className="text-sm font-medium text-zinc-300">Your library is empty.</p>
                                <p className="text-xs">Upload your first presentation to get started.</p>
                            </div>
                            <Link href="/upload">
                                <button className="inline-flex items-center gap-2 rounded-xl border border-primary/40 bg-primary/15 px-4 py-2 text-xs font-bold text-primary transition-colors hover:bg-primary/20">
                                    <PlusCircle size={14} />
                                    Upload Presentation
                                </button>
                            </Link>
                        </div>
                    )}
                </div>
            </motion.div>

            {plannerModalPresentation && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
                    <div className="w-full max-w-md rounded-[1.5rem] border border-white/10 bg-[#0C0C0C] p-5 sm:p-6">
                        <div className="mb-4 flex items-start justify-between">
                            <div>
                                <h3 className="text-lg font-bold text-white">Add To Planner</h3>
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
                                    Date
                                </p>
                                <input
                                    type="date"
                                    value={plannerDate}
                                    onChange={(e) => setPlannerDate(e.target.value)}
                                    className="w-full rounded-lg border border-white/10 bg-[#0C0C0C] px-3 py-2 text-sm text-white outline-none focus:border-primary/50"
                                />
                            </div>

                            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
                                <p className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                                    <Clock size={12} />
                                    Presentation Time
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
                                <p className="mt-2 text-[11px] text-zinc-500">Selected time: <span className="font-semibold text-zinc-200">{plannerTime}</span></p>
                            </div>

                            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
                                <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                                    <Zap size={12} />
                                    Reminder
                                </div>
                                <button
                                    type="button"
                                    onClick={applyReminderThirtyMinutesAgo}
                                    className="mb-2 w-full rounded-lg border border-primary/35 bg-primary/12 py-2 text-xs font-semibold text-primary transition-colors hover:bg-primary/20"
                                >
                                    Email reminder 30 minutes ago
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
                                <div className="mt-2 flex items-center justify-between">
                                    <p className="text-[11px] text-zinc-500">Selected reminder: <span className="font-semibold text-zinc-200">{useReminder ? selectedReminderTime : 'No reminder'}</span></p>
                                    <button
                                        type="button"
                                        onClick={() => setUseReminder((v) => !v)}
                                        className={`rounded-md border px-2 py-1 text-[10px] font-semibold transition-colors ${useReminder
                                            ? 'border-primary/30 text-primary hover:bg-primary/10'
                                            : 'border-white/15 text-zinc-300 hover:bg-white/[0.04]'
                                            }`}
                                    >
                                        {useReminder ? 'Disable' : 'Enable'}
                                    </button>
                                </div>
                            </div>

                            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
                                <div className="mb-2 flex items-center justify-between">
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Note (Optional)</p>
                                    <p className="text-[10px] text-zinc-500">{plannerNote.length}/{NOTE_MAX_LENGTH}</p>
                                </div>
                                <textarea
                                    value={plannerNote}
                                    onChange={(e) => setPlannerNote(e.target.value)}
                                    maxLength={NOTE_MAX_LENGTH}
                                    placeholder="Add a note for this planner event..."
                                    className="invisible-scrollbar min-h-[90px] w-full resize-none rounded-lg border border-white/10 bg-[#0C0C0C] px-3 py-2 text-sm text-white placeholder:text-zinc-500 outline-none focus:border-primary/50"
                                />
                            </div>
                        </div>

                        <div className="mt-5 grid grid-cols-2 gap-2">
                            <button
                                type="button"
                                onClick={closePlannerModal}
                                className="rounded-lg border border-white/10 py-2.5 text-sm font-semibold text-zinc-300 transition-colors hover:bg-white/[0.04]"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleAddToPlanner}
                                className="rounded-lg bg-primary py-2.5 text-sm font-bold text-white transition-colors hover:bg-primary-hover"
                            >
                                Add To Planner
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

function PresentationCard({
    presentation,
    index,
    onDelete,
    onAddToPlanner
}: {
    presentation: RecentPresentation,
    index: number,
    onDelete: (id: number) => void,
    onAddToPlanner: (presentation: RecentPresentation) => void,
}) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="group flex h-full flex-col rounded-[1.4rem] border border-white/5 bg-[#0C0C0C] p-4 transition-all hover:border-primary/30 sm:p-5"
        >
            <div className="mb-4 flex items-start justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-zinc-900 text-primary transition-transform group-hover:scale-105">
                    <FileText size={28} />
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => onDelete(presentation.id)}
                        className="rounded-lg border border-white/10 bg-zinc-900 p-2 text-zinc-500 transition-colors hover:border-red-500/40 hover:text-red-400"
                    >
                        <Trash2 size={16} />
                    </button>
                </div>
            </div>

            <h3 className="mb-2 line-clamp-2 min-h-[2.75rem] text-base font-bold leading-snug text-white transition-colors group-hover:text-primary sm:text-lg">
                {presentation.title}
            </h3>

            <div className="mb-5 flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                <span className="rounded-md border border-white/10 bg-white/[0.02] px-2 py-1">{presentation.slide_count} Slides</span>
                <span className="rounded-md border border-white/10 bg-white/[0.02] px-2 py-1">{new Date(presentation.created_at).toLocaleDateString('en-US')}</span>
            </div>

            <button
                type="button"
                onClick={() => onAddToPlanner(presentation)}
                className="mb-2 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-primary/35 bg-primary/10 px-3 py-2 text-xs font-bold text-primary transition-colors hover:bg-primary/20"
            >
                <CalendarDays size={14} />
                Add To Planner
            </button>

            <div className="mt-auto grid grid-cols-2 gap-2">
                <Link href={`/analyze?id=${presentation.id}&returnTo=${encodeURIComponent('/dashboard?tab=presentations')}`} className="flex-1">
                    <button className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5 text-xs font-bold text-zinc-200 transition-colors hover:bg-white/[0.08] hover:text-white">
                        View
                        <Eye size={14} />
                    </button>
                </Link>
                <Link href={`/presentation/${presentation.id}`} className="flex-1">
                    <button className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2.5 text-xs font-bold text-white transition-colors hover:bg-primary-hover active:scale-[0.99]">
                        Start
                        <Play size={14} className="fill-white" />
                    </button>
                </Link>
            </div>
        </motion.div>
    );
}

function TimeDropdown({
    value,
    options,
    onChange,
    ariaLabel,
}: {
    value: string;
    options: string[];
    onChange: (value: string) => void;
    ariaLabel: string;
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [inputValue, setInputValue] = useState(value);
    const wrapperRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        setInputValue(value);
    }, [value]);

    const commitManualValue = () => {
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
    };

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
                    <div className="invisible-scrollbar max-h-48 overflow-y-auto p-1">
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
