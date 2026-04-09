'use client';

import React, { useMemo, useState, useCallback } from 'react';
import { ChevronLeft, ChevronRight, CalendarDays, Plus, Search, Clock, StickyNote, X, Check, Zap, Presentation, ChevronDown } from 'lucide-react';
import { useDashboard, RecentPresentation } from '../DashboardContext';
import { motion } from 'framer-motion';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;
const WEEKDAYS_SHORT = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'] as const;

type PlannerView = 'day' | 'week' | 'month';

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const MINUTE_OPTIONS = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0'));
const TIME_24H_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

interface ScheduledEvent {
    id: string;
    presentation: RecentPresentation;
    time: string;
    notificationTime?: string;
    note?: string;
}

function addDays(d: Date, n: number): Date {
    const x = new Date(d);
    x.setDate(x.getDate() + n);
    return startOfDay(x);
}

/** First column = Monday (ISO week convention). */
function startOfWeekMonday(d: Date): Date {
    const x = startOfDay(d);
    const day = x.getDay();
    const offsetFromMonday = day === 0 ? 6 : day - 1;
    x.setDate(x.getDate() - offsetFromMonday);
    return x;
}

function startOfDay(d: Date): Date {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
}

function isSameDay(a: Date, b: Date): boolean {
    return (
        a.getFullYear() === b.getFullYear() &&
        a.getMonth() === b.getMonth() &&
        a.getDate() === b.getDate()
    );
}

function toDateKey(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

function buildMonthCells(viewYear: number, viewMonth: number): (number | null)[] {
    const first = new Date(viewYear, viewMonth, 1);
    const last = new Date(viewYear, viewMonth + 1, 0);
    const daysInMonth = last.getDate();
    const dow = first.getDay();
    const padBeforeMonday = dow === 0 ? 6 : dow - 1;
    const cells: (number | null)[] = [];
    for (let i = 0; i < padBeforeMonday; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    return cells;
}

function isValid24HourTime(value?: string): boolean {
    if (!value) return false;
    return TIME_24H_REGEX.test(value);
}

export default function PlannerCalendar() {
    const [plannerView, setPlannerView] = useState<PlannerView>('month');
    const [cursor, setCursor] = useState(() => {
        const n = new Date();
        return new Date(n.getFullYear(), n.getMonth(), 1);
    });
    const [weekStart, setWeekStart] = useState(() => startOfWeekMonday(new Date()));
    const [selected, setSelected] = useState<Date | null>(null);
    const { presentations } = useDashboard();

    // Scheduling State
    const [events, setEvents] = useState<Record<string, ScheduledEvent[]>>({});
    const [isAdding, setIsAdding] = useState(false);
    const [addingStep, setAddingStep] = useState<'select' | 'time' | 'note'>('select');
    const [searchTerm, setSearchTerm] = useState('');
    const [tempEvent, setTempEvent] = useState<Partial<ScheduledEvent>>({});
    const [activeTimePanel, setActiveTimePanel] = useState<'presentation-time' | 'reminder' | null>(null);
    const [presentationPickerPart, setPresentationPickerPart] = useState<'hour' | 'minute'>('hour');
    const [reminderPickerPart, setReminderPickerPart] = useState<'hour' | 'minute'>('hour');
    const [useReminder, setUseReminder] = useState(true);

    const filteredPresentations = useMemo(() => {
        return [...presentations]
            .reverse() // Sondan başa
            .filter(p => p.title.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [presentations, searchTerm]);

    const viewYear = cursor.getFullYear();
    const viewMonth = cursor.getMonth();

    const cells = useMemo(
        () => buildMonthCells(viewYear, viewMonth),
        [viewYear, viewMonth]
    );

    const monthLabel = useMemo(
        () =>
            cursor.toLocaleDateString('en-US', {
                month: 'long',
                year: 'numeric',
            }),
        [cursor]
    );

    const goPrev = useCallback(() => {
        if (plannerView === 'month') {
            setCursor((c) => new Date(c.getFullYear(), c.getMonth() - 1, 1));
        } else if (plannerView === 'week') {
            setWeekStart((ws) => addDays(ws, -7));
        } else {
            setSelected((s) => addDays(s ?? startOfDay(new Date()), -1));
        }
    }, [plannerView]);

    const goNext = useCallback(() => {
        if (plannerView === 'month') {
            setCursor((c) => new Date(c.getFullYear(), c.getMonth() + 1, 1));
        } else if (plannerView === 'week') {
            setWeekStart((ws) => addDays(ws, 7));
        } else {
            setSelected((s) => addDays(s ?? startOfDay(new Date()), 1));
        }
    }, [plannerView]);

    const goToday = useCallback(() => {
        const n = startOfDay(new Date());
        setCursor(new Date(n.getFullYear(), n.getMonth(), 1));
        setWeekStart(startOfWeekMonday(n));
        setSelected(n);
    }, []);

    const handlePlannerView = useCallback((v: PlannerView) => {
        setPlannerView(v);
        if (v === 'week') {
            const ref = selected ?? startOfDay(new Date());
            setWeekStart(startOfWeekMonday(ref));
        }
        if (v === 'day') {
            const ref = selected ?? startOfDay(new Date());
            if (!selected) setSelected(ref);
            setCursor(new Date(ref.getFullYear(), ref.getMonth(), 1));
            setWeekStart(startOfWeekMonday(ref));
        }
    }, [selected]);

    // Sync cursor and weekStart when view changes or selection happens
    // Note: Instead of using an effect that triggers cascading renders,
    // we manage these transitions in the click handlers directly.

    const selectDay = useCallback(
        (day: number) => {
            const d = startOfDay(new Date(viewYear, viewMonth, day));
            setSelected(d);
            setWeekStart(startOfWeekMonday(d));
        },
        [viewYear, viewMonth]
    );

    const selectWeekDay = useCallback((d: Date) => {
        const x = startOfDay(d);
        setSelected(x);
        setCursor(new Date(x.getFullYear(), x.getMonth(), 1));
    }, []);

    const weekDays = useMemo(
        () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
        [weekStart]
    );

    const navLabel = useMemo(() => {
        if (plannerView === 'month') {
            return cursor.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        }
        if (plannerView === 'week') {
            const end = addDays(weekStart, 6);
            return `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
        }
        const d = selected ?? startOfDay(new Date());
        return d.toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
            year: 'numeric',
        });
    }, [plannerView, cursor, weekStart, selected]);

    const handleAddEvent = () => {
        if (!selected) return;
        setIsAdding(true);
        setAddingStep('select');
        setTempEvent({});
        setSearchTerm('');
        setActiveTimePanel(null);
        setPresentationPickerPart('hour');
        setReminderPickerPart('hour');
        setUseReminder(true);
    };

    const confirmEvent = () => {
        if (!selected || !tempEvent.presentation || !tempEvent.time) return;
        const key = toDateKey(selected);
        const newEvent: ScheduledEvent = {
            id: Math.random().toString(36).substr(2, 9),
            presentation: tempEvent.presentation,
            time: tempEvent.time,
            notificationTime: tempEvent.notificationTime,
            note: tempEvent.note
        };
        setEvents(prev => ({
            ...prev,
            [key]: [...(prev[key] || []), newEvent]
        }));
        setIsAdding(false);
    };

    const dayFocus = selected ?? startOfDay(new Date());
    const todayStart = startOfDay(new Date());
    const isToday = (day: number) =>
        isSameDay(todayStart, new Date(viewYear, viewMonth, day));

    const isSelected = (day: number) =>
        selected !== null && isSameDay(selected, new Date(viewYear, viewMonth, day));

    const cellClass =
        'relative min-h-[4.25rem] sm:min-h-[5.5rem] md:min-h-[6.25rem] lg:min-h-[7rem] rounded-xl sm:rounded-2xl text-sm font-semibold transition-all flex items-center justify-center';

    const selectedHour = isValid24HourTime(tempEvent.time) ? tempEvent.time?.split(':')[0] ?? '09' : '09';
    const selectedMinute = isValid24HourTime(tempEvent.time) ? tempEvent.time?.split(':')[1] ?? '00' : '00';

    const updatePresentationHour = (hour: string) => {
        setTempEvent((prev) => ({ ...prev, time: `${hour}:${selectedMinute}` }));
    };

    const updatePresentationMinute = (minute: string) => {
        setTempEvent((prev) => ({ ...prev, time: `${selectedHour}:${minute}` }));
    };

    const subtractMinutes = (time: string, minutes: number): string => {
        if (!isValid24HourTime(time)) return '00:00';
        const [hour, minute] = time.split(':').map(Number);
        const total = (hour * 60 + minute - minutes + 1440) % 1440;
        const hh = Math.floor(total / 60);
        const mm = total % 60;
        return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
    };

    const safePresentationTime = isValid24HourTime(tempEvent.time) ? tempEvent.time : undefined;
    const defaultReminderTime = safePresentationTime
        ? subtractMinutes(safePresentationTime, 30)
        : '08:30';
    const selectedReminderHour = isValid24HourTime(tempEvent.notificationTime)
        ? tempEvent.notificationTime?.split(':')[0] ?? defaultReminderTime.split(':')[0]
        : defaultReminderTime.split(':')[0];
    const selectedReminderMinute = isValid24HourTime(tempEvent.notificationTime)
        ? tempEvent.notificationTime?.split(':')[1] ?? defaultReminderTime.split(':')[1]
        : defaultReminderTime.split(':')[1];

    const updateReminderHour = (hour: string) => {
        setUseReminder(true);
        setTempEvent((prev) => ({ ...prev, notificationTime: `${hour}:${selectedReminderMinute}` }));
    };

    const updateReminderMinute = (minute: string) => {
        setUseReminder(true);
        setTempEvent((prev) => ({ ...prev, notificationTime: `${selectedReminderHour}:${minute}` }));
    };

    const applyReminderThirtyMinutesAgo = () => {
        if (!safePresentationTime) return;
        const value = subtractMinutes(safePresentationTime, 30);
        setUseReminder(true);
        setTempEvent((prev) => ({ ...prev, notificationTime: value }));
    };

    const proceedToNote = () => {
        if (!safePresentationTime) return;
        const fallbackReminder = subtractMinutes(safePresentationTime, 30);
        setTempEvent((prev) => ({
            ...prev,
            notificationTime: useReminder
                ? (isValid24HourTime(prev.notificationTime) ? prev.notificationTime : fallbackReminder)
                : undefined,
        }));
        setAddingStep('note');
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6 sm:space-y-8"
        >
            <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                    <h1 className="text-base font-bold tracking-tight text-white sm:text-lg">
                        Planner
                    </h1>
                    <div className="mt-3 flex flex-wrap items-center gap-2 sm:gap-3">
                        <button
                            type="button"
                            onClick={goPrev}
                            aria-label={
                                plannerView === 'month'
                                    ? 'Previous month'
                                    : plannerView === 'week'
                                        ? 'Previous week'
                                        : 'Previous day'
                            }
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-zinc-700 text-zinc-400 transition-colors hover:border-zinc-600 hover:text-white"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </button>
                        <span className="min-w-[8rem] text-center text-sm font-medium text-white sm:min-w-[10rem] sm:text-base">
                            {navLabel}
                        </span>
                        <button
                            type="button"
                            onClick={goNext}
                            aria-label={
                                plannerView === 'month'
                                    ? 'Next month'
                                    : plannerView === 'week'
                                        ? 'Next week'
                                        : 'Next day'
                            }
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-zinc-700 text-zinc-400 transition-colors hover:border-zinc-600 hover:text-white"
                        >
                            <ChevronRight className="h-4 w-4" />
                        </button>
                        <button
                            type="button"
                            onClick={goToday}
                            aria-label="Go to today"
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-zinc-700 text-zinc-400 transition-colors hover:border-zinc-600 hover:text-white"
                        >
                            <CalendarDays className="h-4 w-4" />
                        </button>
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-3 lg:gap-4">
                    <div
                        className="inline-flex overflow-hidden rounded-md border border-zinc-700"
                        role="group"
                        aria-label="Calendar view"
                    >
                        {(['day', 'week', 'month'] as const).map((v) => (
                            <button
                                key={v}
                                type="button"
                                onClick={() => handlePlannerView(v)}
                                className={`px-3 py-2 text-[11px] font-semibold tracking-wide transition-colors sm:px-4 sm:text-xs ${plannerView === v
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-transparent text-zinc-300 hover:bg-white/[0.06] hover:text-white'
                                    }`}
                            >
                                {v.toUpperCase()}
                            </button>
                        ))}
                    </div>
                </div>
            </header>

            <div className="grid gap-6 lg:grid-cols-[1fr_minmax(0,280px)] xl:grid-cols-[1fr_minmax(0,320px)]">
                <div className="rounded-[1.5rem] sm:rounded-[2rem] bg-[#0C0C0C] border border-white/5 overflow-hidden shadow-inner">
                    <div className="p-3 sm:p-6 sm:pb-10">
                        {plannerView === 'month' && (
                            <>
                                <div
                                    className="mb-2 grid grid-cols-7 gap-1 sm:mb-3 sm:gap-2"
                                    role="row"
                                    aria-hidden
                                >
                                    {WEEKDAYS.map((wd, idx) => (
                                        <div
                                            key={wd}
                                            className="py-1 text-center text-[10px] font-bold uppercase tracking-widest text-zinc-500 sm:text-xs"
                                        >
                                            <span className="hidden sm:inline">{wd}</span>
                                            <span className="sm:hidden">{WEEKDAYS_SHORT[idx]}</span>
                                        </div>
                                    ))}
                                </div>

                                <div
                                    className="grid grid-cols-7 gap-1 sm:gap-2"
                                    role="grid"
                                    aria-label={`Calendar for ${monthLabel}`}
                                >
                                    {cells.map((day, i) =>
                                        day === null ? (
                                            <div
                                                key={`empty-${i}`}
                                                className="min-h-[4.25rem] sm:min-h-[5.5rem] md:min-h-[6.25rem] lg:min-h-[7rem]"
                                                aria-hidden
                                            />
                                        ) : (
                                            <button
                                                key={day}
                                                type="button"
                                                role="gridcell"
                                                onClick={() => selectDay(day)}
                                                className={`${cellClass}
                                                    ${isSelected(day)
                                                        ? 'z-[1] border-2 border-primary bg-primary/20 text-primary shadow-[0_0_20px_-4px_rgba(234,88,12,0.45)]'
                                                        : 'border border-transparent text-zinc-300 hover:border-white/10 hover:bg-white/[0.06]'}
                                                    ${isToday(day) && !isSelected(day)
                                                        ? 'bg-primary/5 text-white ring-1 ring-primary/50'
                                                        : ''}
                                                `}
                                            >
                                                {day}
                                                {isToday(day) && (
                                                    <span className="absolute bottom-1.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-primary sm:bottom-2" />
                                                )}

                                                <div className="absolute inset-x-1 top-7 bottom-1 overflow-hidden pointer-events-none hidden sm:flex flex-col gap-1">
                                                    {(events[toDateKey(new Date(viewYear, viewMonth, day))] || []).slice(0, 2).map(ev => (
                                                        <div key={ev.id} className="px-1.5 py-0.5 rounded-[4px] bg-primary/10 border border-primary/20 text-[9px] text-primary truncate">
                                                            {ev.time} {ev.presentation.title}
                                                        </div>
                                                    ))}
                                                    {(events[toDateKey(new Date(viewYear, viewMonth, day))] || []).length > 2 && (
                                                        <div className="text-[8px] text-zinc-500 pl-1">
                                                            +{(events[toDateKey(new Date(viewYear, viewMonth, day))] || []).length - 2} more
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="absolute inset-x-1 bottom-1 sm:hidden">
                                                    {(events[toDateKey(new Date(viewYear, viewMonth, day))] || []).slice(0, 1).map(ev => (
                                                        <div key={ev.id} className="rounded-[4px] border border-primary/20 bg-primary/10 px-1 py-0.5 text-[8px] leading-tight text-primary truncate">
                                                            {ev.time} {ev.presentation.title}
                                                        </div>
                                                    ))}
                                                </div>
                                            </button>
                                        )
                                    )}
                                </div>
                            </>
                        )}

                        {plannerView === 'week' && (
                            <>
                                <div
                                    className="mb-2 grid grid-cols-7 gap-1 sm:mb-3 sm:gap-2"
                                    role="row"
                                    aria-hidden
                                >
                                    {WEEKDAYS.map((wd, idx) => (
                                        <div
                                            key={wd}
                                            className="py-1 text-center text-[10px] font-bold uppercase tracking-widest text-zinc-500 sm:text-xs"
                                        >
                                            <span className="hidden sm:inline">{wd}</span>
                                            <span className="sm:hidden">{WEEKDAYS_SHORT[idx]}</span>
                                        </div>
                                    ))}
                                </div>
                                <div
                                    className="grid grid-cols-7 gap-1 sm:gap-2"
                                    role="grid"
                                    aria-label={`Week of ${navLabel}`}
                                >
                                    {weekDays.map((d) => {
                                        const sel =
                                            selected !== null && isSameDay(selected, d);
                                        const today = isSameDay(todayStart, d);
                                        return (
                                            <button
                                                key={toDateKey(d)}
                                                type="button"
                                                role="gridcell"
                                                onClick={() => selectWeekDay(d)}
                                                className={`${cellClass}
                                                    ${sel
                                                        ? 'z-[1] border-2 border-primary bg-primary/20 text-primary shadow-[0_0_20px_-4px_rgba(234,88,12,0.45)]'
                                                        : 'border border-transparent text-zinc-300 hover:border-white/10 hover:bg-white/[0.06]'}
                                                    ${today && !sel
                                                        ? 'bg-primary/5 text-white ring-1 ring-primary/50'
                                                        : ''}
                                                `}
                                            >
                                                {d.getDate()}
                                                {today && (
                                                    <span className="absolute bottom-1.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-primary sm:bottom-2" />
                                                )}

                                                <div className="absolute inset-x-1 top-7 bottom-1 overflow-hidden pointer-events-none hidden sm:flex flex-col gap-1">
                                                    {(events[toDateKey(d)] || []).slice(0, 2).map(ev => (
                                                        <div key={ev.id} className="px-1.5 py-0.5 rounded-[4px] bg-primary/10 border border-primary/20 text-[9px] text-primary truncate">
                                                            {ev.time} {ev.presentation.title}
                                                        </div>
                                                    ))}
                                                    {(events[toDateKey(d)] || []).length > 2 && (
                                                        <div className="text-[8px] text-zinc-500 pl-1">
                                                            +{(events[toDateKey(d)] || []).length - 2} more
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="absolute inset-x-1 bottom-1 sm:hidden">
                                                    {(events[toDateKey(d)] || []).slice(0, 1).map(ev => (
                                                        <div key={ev.id} className="rounded-[4px] border border-primary/20 bg-primary/10 px-1 py-0.5 text-[8px] leading-tight text-primary truncate">
                                                            {ev.time} {ev.presentation.title}
                                                        </div>
                                                    ))}
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </>
                        )}

                        {plannerView === 'day' && (
                            <div
                                className="flex min-h-[280px] flex-col items-center justify-center gap-4 p-6 sm:min-h-[320px]"
                                role="region"
                                aria-label="Day view"
                            >
                                <button
                                    type="button"
                                    className={`${cellClass} h-36 w-36 max-w-[85vw] cursor-default text-3xl sm:h-40 sm:w-40
                                        border-2 border-primary bg-primary/20 text-primary shadow-[0_0_20px_-4px_rgba(234,88,12,0.45)]`}
                                >
                                    {dayFocus.getDate()}
                                    {isSameDay(dayFocus, todayStart) && (
                                        <span className="absolute bottom-4 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-primary" />
                                    )}
                                </button>

                                <div className="w-full max-w-sm space-y-2 mt-2">
                                    {(events[toDateKey(dayFocus)] || []).map(ev => (
                                        <div key={ev.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/5">
                                            <div className="flex flex-col items-center justify-center h-10 w-12 rounded-lg bg-primary/10 text-primary font-bold text-xs">
                                                <span>{ev.time.split(':')[0]}</span>
                                                <span className="text-[9px] opacity-70">HRS</span>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-semibold text-white truncate">{ev.presentation.title}</p>
                                                <p className="text-xs text-zinc-500 truncate">{ev.note || 'No notes added'}</p>
                                            </div>
                                        </div>
                                    ))}
                                    {(events[toDateKey(dayFocus)] || []).length === 0 && (
                                        <p className="text-center text-sm text-zinc-500">
                                            No presentations scheduled for this day.
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <aside className="relative flex min-h-[400px] flex-col rounded-[1.5rem] border border-white/5 bg-[#0C0C0C] p-5 sm:p-6 lg:min-h-0 sm:rounded-[2rem]">
                    <div className="flex items-center justify-between mb-4">
                        <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">
                            Selected day
                        </h4>
                        {selected && (
                            <button
                                onClick={handleAddEvent}
                                className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                                title="Add Presentation"
                            >
                                <Plus className="h-4 w-4" />
                            </button>
                        )}
                    </div>
                    {selected ? (
                        <div className="flex-1 space-y-4">
                            <div>
                                <p className="text-xl font-bold font-display text-white">
                                    {selected.toLocaleDateString('en-US', {
                                        weekday: 'long',
                                        month: 'long',
                                        day: 'numeric',
                                    })}
                                </p>
                                <p className="text-sm text-zinc-500">
                                    {selected.getFullYear()}
                                </p>
                            </div>

                            <div className="space-y-3 mt-4">
                                {(events[toDateKey(selected)] || []).length > 0 ? (
                                    events[toDateKey(selected)].map((ev) => (
                                        <div key={ev.id} className="group relative rounded-xl border border-white/5 bg-white/[0.02] p-3 hover:bg-white/[0.04] transition-all">
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-semibold text-white truncate">{ev.presentation.title}</p>
                                                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-zinc-500">
                                                        <div className="flex items-center gap-1">
                                                            <Clock className="h-3 w-3" />
                                                            <span>Present: {ev.time}</span>
                                                        </div>
                                                        {ev.notificationTime && (
                                                            <div className="flex items-center gap-1 text-primary/70">
                                                                <Zap className="h-3 w-3" />
                                                                <span>Alert: {ev.notificationTime}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            {ev.note && (
                                                <p className="mt-2 text-xs text-zinc-400 border-t border-white/5 pt-2 flex items-start gap-1.5">
                                                    <StickyNote className="h-3 w-3 mt-0.5 shrink-0" />
                                                    <span className="italic">&quot;{ev.note}&quot;</span>
                                                </p>
                                            )}
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-sm text-zinc-600 leading-relaxed">
                                        No events yet. Click the + button to schedule a presentation.
                                    </p>
                                )}
                            </div>
                        </div>
                    ) : (
                        <p className="text-sm text-zinc-600 leading-relaxed mt-1">
                            Tap a date on the calendar to see it here.
                        </p>
                    )}

                    {/* Add Event Overlay / Modal */}
                    {isAdding && (
                        <div className="absolute inset-0 z-20 flex flex-col bg-[#0C0C0C] p-5 sm:p-6 rounded-[1.5rem] sm:rounded-[2rem]">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-sm font-bold text-white">
                                    {addingStep === 'select' && 'Select Presentation'}
                                    {addingStep === 'time' && 'Select Time'}
                                    {addingStep === 'note' && 'Add Note'}
                                </h3>
                                <button
                                    onClick={() => setIsAdding(false)}
                                    className="text-zinc-500 hover:text-white"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>

                            {addingStep === 'select' && (
                                <div className="flex flex-col flex-1 gap-3 overflow-hidden">
                                    <div className="relative">
                                        <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-zinc-500" />
                                        <input
                                            type="text"
                                            placeholder="Search presentations..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="w-full rounded-lg bg-white/5 border border-white/10 py-2 pl-8 pr-3 text-xs text-white placeholder-zinc-500 focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/50"
                                        />
                                    </div>
                                    <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                                        {filteredPresentations.length > 0 ? (
                                            filteredPresentations.map((p) => (
                                                <button
                                                    key={p.id}
                                                    onClick={() => {
                                                        setTempEvent({ ...tempEvent, presentation: p });
                                                        setAddingStep('time');
                                                    }}
                                                    className="w-full text-left rounded-lg border border-white/5 bg-white/[0.03] p-2.5 hover:bg-white/[0.08] transition-colors"
                                                >
                                                    <p className="text-xs font-semibold text-white truncate">{p.title}</p>
                                                    <p className="text-[10px] text-zinc-500 mt-0.5">{p.slide_count} slides • {new Date(p.created_at).toLocaleDateString()}</p>
                                                </button>
                                            ))
                                        ) : (
                                            <p className="text-center text-xs text-zinc-600 mt-8">No presentations found.</p>
                                        )}
                                    </div>
                                </div>
                            )}

                            {addingStep === 'time' && (
                                <div className="flex flex-col flex-1 gap-6 overflow-hidden">
                                    <div className="flex-1 overflow-y-auto space-y-6 pr-1 custom-scrollbar">
                                        <section>
                                            <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                                                <Presentation className="h-3 w-3" />
                                                Presentation Time
                                            </h4>
                                            <div className="space-y-3 rounded-xl border border-white/10 bg-white/[0.02] p-3">
                                                <div>
                                                    <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-zinc-500">Time (24h)</p>
                                                    <div className="rounded-lg border border-primary/25 bg-transparent">
                                                        <div className="flex items-center justify-between px-3 py-2">
                                                            <div className="flex items-center gap-1 text-sm font-semibold text-primary">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setPresentationPickerPart('hour');
                                                                        setActiveTimePanel('presentation-time');
                                                                    }}
                                                                    className={`rounded px-1.5 py-0.5 transition-colors ${presentationPickerPart === 'hour' ? 'bg-primary/20' : 'hover:bg-primary/15'}`}
                                                                >
                                                                    {selectedHour}
                                                                </button>
                                                                <span>:</span>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setPresentationPickerPart('minute');
                                                                        setActiveTimePanel('presentation-time');
                                                                    }}
                                                                    className={`rounded px-1.5 py-0.5 transition-colors ${presentationPickerPart === 'minute' ? 'bg-primary/20' : 'hover:bg-primary/15'}`}
                                                                >
                                                                    {selectedMinute}
                                                                </button>
                                                            </div>
                                                            <button
                                                                type="button"
                                                                onClick={() => setActiveTimePanel((p) => p === 'presentation-time' ? null : 'presentation-time')}
                                                                className="rounded-md border border-primary/30 bg-primary/15 p-1 text-primary transition-colors hover:bg-primary/25"
                                                                aria-label="Toggle time options"
                                                            >
                                                                <ChevronDown className={`h-3.5 w-3.5 transition-transform ${activeTimePanel === 'presentation-time' ? 'rotate-180' : ''}`} />
                                                            </button>
                                                        </div>
                                                        {activeTimePanel === 'presentation-time' && (
                                                            <div className="border-t border-primary/20 p-2">
                                                                <div className="mb-2 grid grid-cols-2 gap-2">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setPresentationPickerPart('hour')}
                                                                        className={`rounded-md border py-1 text-[10px] font-semibold transition-all ${presentationPickerPart === 'hour'
                                                                            ? 'border-primary bg-primary/20 text-primary'
                                                                            : 'border-white/10 bg-white/[0.03] text-zinc-300 hover:border-white/25 hover:text-white'
                                                                            }`}
                                                                    >
                                                                        Hour
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setPresentationPickerPart('minute')}
                                                                        className={`rounded-md border py-1 text-[10px] font-semibold transition-all ${presentationPickerPart === 'minute'
                                                                            ? 'border-primary bg-primary/20 text-primary'
                                                                            : 'border-white/10 bg-white/[0.03] text-zinc-300 hover:border-white/25 hover:text-white'
                                                                            }`}
                                                                    >
                                                                        Minute
                                                                    </button>
                                                                </div>

                                                                <div className="grid max-h-32 grid-cols-6 gap-1 overflow-y-auto custom-scrollbar">
                                                                    {(presentationPickerPart === 'hour' ? HOUR_OPTIONS : MINUTE_OPTIONS).map((value) => (
                                                                        <button
                                                                            key={`${presentationPickerPart}-${value}`}
                                                                            type="button"
                                                                            onClick={() => {
                                                                                if (presentationPickerPart === 'hour') {
                                                                                    updatePresentationHour(value);
                                                                                } else {
                                                                                    updatePresentationMinute(value);
                                                                                }
                                                                                setActiveTimePanel(null);
                                                                            }}
                                                                            className={`rounded-md py-1 text-[10px] font-semibold transition-all ${(presentationPickerPart === 'hour' ? selectedHour : selectedMinute) === value
                                                                                ? 'bg-primary text-primary-foreground'
                                                                                : 'bg-white/[0.03] text-zinc-300 hover:bg-primary/20 hover:text-primary'
                                                                                }`}
                                                                        >
                                                                            {value}
                                                                        </button>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                <p className="text-[10px] text-zinc-500">Selected presentation time: <span className="font-semibold text-zinc-200">{tempEvent.time || `${selectedHour}:${selectedMinute}`}</span></p>
                                            </div>
                                        </section>

                                        {isValid24HourTime(tempEvent.time) && (
                                            <section>
                                                <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                                                    <Zap className="h-3 w-3" />
                                                    Reminder
                                                </h4>
                                                <p className="text-xs text-zinc-300">
                                                    How long before the presentation would you like to receive a reminder?
                                                </p>

                                                <div className="mt-3 space-y-3 rounded-xl border border-white/10 bg-white/[0.02] p-3">
                                                    <button
                                                        type="button"
                                                        onClick={applyReminderThirtyMinutesAgo}
                                                        className="w-full rounded-lg border border-primary/35 bg-primary/12 py-2 text-xs font-semibold text-primary transition-all hover:bg-primary/20"
                                                    >
                                                        Reminder 30 minutes ago
                                                    </button>

                                                    <div className="rounded-lg border border-primary/25 bg-transparent">
                                                        <div className="flex items-center justify-between px-3 py-2">
                                                            <div className="flex items-center gap-1 text-sm font-semibold text-primary">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setReminderPickerPart('hour');
                                                                        setActiveTimePanel('reminder');
                                                                    }}
                                                                    className={`rounded px-1.5 py-0.5 transition-colors ${reminderPickerPart === 'hour' ? 'bg-primary/20' : 'hover:bg-primary/15'}`}
                                                                >
                                                                    {selectedReminderHour}
                                                                </button>
                                                                <span>:</span>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setReminderPickerPart('minute');
                                                                        setActiveTimePanel('reminder');
                                                                    }}
                                                                    className={`rounded px-1.5 py-0.5 transition-colors ${reminderPickerPart === 'minute' ? 'bg-primary/20' : 'hover:bg-primary/15'}`}
                                                                >
                                                                    {selectedReminderMinute}
                                                                </button>
                                                            </div>
                                                            <button
                                                                type="button"
                                                                onClick={() => setActiveTimePanel((p) => p === 'reminder' ? null : 'reminder')}
                                                                className="rounded-md border border-primary/30 bg-primary/15 p-1 text-primary transition-colors hover:bg-primary/25"
                                                                aria-label="Toggle reminder options"
                                                            >
                                                                <ChevronDown className={`h-3.5 w-3.5 transition-transform ${activeTimePanel === 'reminder' ? 'rotate-180' : ''}`} />
                                                            </button>
                                                        </div>
                                                        {activeTimePanel === 'reminder' && (
                                                            <div className="border-t border-primary/20 p-2">
                                                                <div className="mb-2 grid grid-cols-2 gap-2">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setReminderPickerPart('hour')}
                                                                        className={`rounded-md border py-1 text-[10px] font-semibold transition-all ${reminderPickerPart === 'hour'
                                                                            ? 'border-primary bg-primary/20 text-primary'
                                                                            : 'bg-white/[0.03] text-zinc-300 hover:bg-primary/20 hover:text-primary'
                                                                            }`}
                                                                    >
                                                                        Hour
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setReminderPickerPart('minute')}
                                                                        className={`rounded-md border py-1 text-[10px] font-semibold transition-all ${reminderPickerPart === 'minute'
                                                                            ? 'border-primary bg-primary/20 text-primary'
                                                                            : 'bg-white/[0.03] text-zinc-300 hover:bg-primary/20 hover:text-primary'
                                                                            }`}
                                                                    >
                                                                        Minute
                                                                    </button>
                                                                </div>

                                                                <div className="grid max-h-32 grid-cols-6 gap-1 overflow-y-auto custom-scrollbar">
                                                                    {(reminderPickerPart === 'hour' ? HOUR_OPTIONS : MINUTE_OPTIONS).map((value) => (
                                                                        <button
                                                                            key={`rem-${reminderPickerPart}-${value}`}
                                                                            type="button"
                                                                            onClick={() => {
                                                                                if (reminderPickerPart === 'hour') {
                                                                                    updateReminderHour(value);
                                                                                } else {
                                                                                    updateReminderMinute(value);
                                                                                }
                                                                                setActiveTimePanel(null);
                                                                            }}
                                                                            className={`rounded-md py-1 text-[10px] font-semibold transition-all ${(reminderPickerPart === 'hour' ? selectedReminderHour : selectedReminderMinute) === value
                                                                                ? 'bg-primary text-primary-foreground'
                                                                                : 'bg-white/[0.03] text-zinc-300 hover:bg-primary/20 hover:text-primary'
                                                                                }`}
                                                                        >
                                                                            {value}
                                                                        </button>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="text-[10px] text-zinc-500">
                                                        Selected reminder time: <span className="font-semibold text-zinc-200">{useReminder ? (tempEvent.notificationTime || defaultReminderTime) : 'No reminder'}</span>
                                                    </div>

                                                    <button
                                                        type="button"
                                                        onClick={() => setUseReminder((v) => !v)}
                                                        className={`w-full rounded-lg border py-2 text-xs font-semibold transition-all ${useReminder
                                                            ? 'border-primary/30 text-primary hover:bg-primary/10'
                                                            : 'border-white/10 text-zinc-300 hover:border-white/25 hover:text-white'
                                                            }`}
                                                    >
                                                        {useReminder ? 'Disable reminder' : 'Enable reminder'}
                                                    </button>
                                                </div>
                                            </section>
                                        )}
                                    </div>

                                    <div className="mt-auto flex gap-2 pt-4 border-t border-white/5">
                                        <button
                                            onClick={() => setAddingStep('select')}
                                            className="flex-1 py-2 text-xs font-semibold text-zinc-400 hover:text-white transition-colors"
                                        >
                                            Back
                                        </button>
                                        <button
                                            disabled={!isValid24HourTime(tempEvent.time)}
                                            onClick={proceedToNote}
                                            className="flex-[2] py-2 rounded-lg bg-primary text-white text-xs font-bold hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            Next: Add Note
                                        </button>
                                    </div>
                                </div>
                            )}

                            {addingStep === 'note' && (
                                <div className="flex flex-col flex-1 gap-4">
                                    <textarea
                                        autoFocus
                                        placeholder="Add a note... (optional)"
                                        value={tempEvent.note || ''}
                                        onChange={(e) => setTempEvent({ ...tempEvent, note: e.target.value })}
                                        className="w-full flex-1 rounded-xl bg-white/5 border border-white/10 p-4 text-sm text-white placeholder-zinc-500 focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/50 resize-none"
                                    />
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setAddingStep('time')}
                                            className="flex-1 py-3 text-xs font-semibold text-zinc-400 hover:text-white transition-colors"
                                        >
                                            Back
                                        </button>
                                        <button
                                            onClick={confirmEvent}
                                            className="flex-[2] py-3 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary/90 transition-all shadow-[0_4px_20px_-4px_rgba(234,88,12,0.45)] flex items-center justify-center gap-2"
                                        >
                                            <Check className="h-4 w-4" />
                                            Confirm Schedule
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </aside>
            </div>
        </motion.div>
    );
}
