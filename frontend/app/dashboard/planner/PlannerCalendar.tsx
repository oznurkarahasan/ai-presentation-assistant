'use client';

import React, { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, CalendarDays, Plus, Search, Clock, StickyNote, X, Check, Zap, Presentation, BellOff, Trash2, ChevronDown, Pencil } from 'lucide-react';
import { useDashboard, RecentPresentation } from '../DashboardContext';
import { motion } from 'framer-motion';
import client from '../../api/client';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;
const WEEKDAYS_SHORT = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'] as const;

type PlannerView = 'day' | 'week' | 'month';

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const MINUTE_OPTIONS = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));
const TIME_24H_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

interface ScheduledEvent {
    id: string;
    presentation: RecentPresentation;
    time: string;
    notificationTime?: string;
    note?: string;
}

interface PlannerApiEvent {
    id: number;
    presentation_id: number;
    presentation_title: string;
    scheduled_date: string;
    scheduled_time: string;
    reminder_date?: string | null;
    reminder_time?: string | null;
    note?: string | null;
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

function parseDateKey(dateKey: string): { year: number; month: number; day: number } {
    const [year, month, day] = dateKey.split('-').map(Number);
    return { year, month, day };
}

function localToUtcParts(dateKey: string, time: string): { date: string; time: string } {
    const { year, month, day } = parseDateKey(dateKey);
    const [hour, minute] = time.split(':').map(Number);
    const local = new Date(year, month - 1, day, hour, minute, 0, 0);
    return {
        date: `${local.getUTCFullYear()}-${String(local.getUTCMonth() + 1).padStart(2, '0')}-${String(local.getUTCDate()).padStart(2, '0')}`,
        time: `${String(local.getUTCHours()).padStart(2, '0')}:${String(local.getUTCMinutes()).padStart(2, '0')}`,
    };
}

function utcToLocalParts(dateKey: string, time: string): { date: string; time: string } {
    const { year, month, day } = parseDateKey(dateKey);
    const [hour, minute] = time.split(':').map(Number);
    const utc = new Date(Date.UTC(year, month - 1, day, hour, minute, 0, 0));
    return {
        date: toDateKey(utc),
        time: `${String(utc.getHours()).padStart(2, '0')}:${String(utc.getMinutes()).padStart(2, '0')}`,
    };
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

interface TimeDropdownProps {
    value: string;
    options: string[];
    onChange: (value: string) => void;
    ariaLabel: string;
}

function TimeDropdown({ value, options, onChange, ariaLabel }: TimeDropdownProps) {
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

export default function PlannerCalendar() {
    const [plannerView, setPlannerView] = useState<PlannerView>('month');
    const [cursor, setCursor] = useState(() => {
        const n = new Date();
        return new Date(n.getFullYear(), n.getMonth(), 1);
    });
    const [weekStart, setWeekStart] = useState(() => startOfWeekMonday(new Date()));
    const [selected, setSelected] = useState<Date | null>(() => startOfDay(new Date()));
    const { presentations, setAlert } = useDashboard();

    // Scheduling State
    const [events, setEvents] = useState<Record<string, ScheduledEvent[]>>({});
    const [isAdding, setIsAdding] = useState(false);
    const [addingStep, setAddingStep] = useState<'select' | 'time' | 'note'>('select');
    const [searchTerm, setSearchTerm] = useState('');
    const [tempEvent, setTempEvent] = useState<Partial<ScheduledEvent>>({});
    const [useReminder, setUseReminder] = useState(true);
    const [editingEventId, setEditingEventId] = useState<string | null>(null);
    const [editingDateKey, setEditingDateKey] = useState<string | null>(null);

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
        const now = new Date();
        const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        setIsAdding(true);
        setEditingEventId(null);
        setEditingDateKey(null);
        setAddingStep('select');
        setTempEvent({
            time: currentTime,
            notificationTime: subtractMinutes(currentTime, 30),
        });
        setSearchTerm('');
        setUseReminder(true);
    };

    const handleEditEvent = (dateKey: string, event: ScheduledEvent) => {
        setIsAdding(true);
        setEditingEventId(event.id);
        setEditingDateKey(dateKey);
        setSearchTerm(event.presentation.title);
        setTempEvent({
            presentation: event.presentation,
            time: event.time,
            notificationTime: event.notificationTime,
            note: event.note,
        });
        setUseReminder(Boolean(event.notificationTime));
        setAddingStep('time');
    };

    const toScheduledEvent = useCallback((apiEvent: PlannerApiEvent): ScheduledEvent => {
        const scheduledLocal = utcToLocalParts(apiEvent.scheduled_date, apiEvent.scheduled_time);
        const reminderLocal = apiEvent.reminder_time
            ? utcToLocalParts(apiEvent.reminder_date || apiEvent.scheduled_date, apiEvent.reminder_time)
            : null;

        const presentation = presentations.find((p) => p.id === apiEvent.presentation_id) ?? {
            id: apiEvent.presentation_id,
            title: apiEvent.presentation_title,
            file_name: '',
            file_type: 'unknown',
            slide_count: 0,
            status: 'scheduled',
            created_at: new Date().toISOString(),
        };

        return {
            id: String(apiEvent.id),
            presentation,
            time: scheduledLocal.time,
            notificationTime: reminderLocal?.time ?? undefined,
            note: apiEvent.note ?? undefined,
        };
    }, [presentations]);

    const loadPlannerEvents = useCallback(async () => {
        try {
            const response = await client.get<PlannerApiEvent[]>('/api/v1/planner/events');
            const grouped = response.data.reduce<Record<string, ScheduledEvent[]>>((acc, event) => {
                const scheduledLocal = utcToLocalParts(event.scheduled_date, event.scheduled_time);
                const key = scheduledLocal.date;
                const mapped = toScheduledEvent(event);
                if (!acc[key]) acc[key] = [];
                acc[key].push(mapped);
                return acc;
            }, {});
            setEvents(grouped);
        } catch {
            setAlert({ type: 'error', message: 'Planner events could not be loaded.' });
            setTimeout(() => setAlert(null), 3500);
        }
    }, [setAlert, toScheduledEvent]);

    useEffect(() => {
        const frameId = window.requestAnimationFrame(() => {
            void loadPlannerEvents();
        });

        return () => window.cancelAnimationFrame(frameId);
    }, [loadPlannerEvents]);

    const confirmEvent = async () => {
        if (!tempEvent.presentation || !tempEvent.time) return;
        const scheduledDate = selected ? toDateKey(selected) : editingDateKey;
        if (!scheduledDate) return;
        const scheduledUtc = localToUtcParts(scheduledDate, tempEvent.time);
        const reminderUtc = tempEvent.notificationTime
            ? localToUtcParts(scheduledDate, tempEvent.notificationTime)
            : null;
        const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || undefined;

        try {
            const payload = {
                presentation_id: tempEvent.presentation.id,
                scheduled_date: scheduledUtc.date,
                scheduled_time: scheduledUtc.time,
                reminder_date: reminderUtc?.date,
                reminder_time: reminderUtc?.time,
                timezone: browserTimezone,
                note: tempEvent.note || undefined,
            };

            const response = editingEventId
                ? await client.put<PlannerApiEvent>(`/api/v1/planner/events/${editingEventId}`, payload)
                : await client.post<PlannerApiEvent>('/api/v1/planner/events', payload);

            const saved = toScheduledEvent(response.data);
            const savedLocal = utcToLocalParts(response.data.scheduled_date, response.data.scheduled_time);
            const targetDateKey = savedLocal.date;

            setEvents((prev) => {
                const sourceDateKey = editingDateKey || scheduledDate;
                const withoutOld = Object.fromEntries(
                    Object.entries(prev).map(([key, dayEvents]) => [
                        key,
                        key === sourceDateKey ? dayEvents.filter((event) => event.id !== String(response.data.id)) : dayEvents,
                    ])
                ) as Record<string, ScheduledEvent[]>;

                const nextDayEvents = [...(withoutOld[targetDateKey] || []), saved];
                return {
                    ...withoutOld,
                    [targetDateKey]: nextDayEvents,
                };
            });

            setIsAdding(false);
            setEditingEventId(null);
            setEditingDateKey(null);
            setAlert({ type: 'info', message: editingEventId ? 'Event updated.' : 'Event saved to planner.' });
            setTimeout(() => setAlert(null), 3500);
        } catch {
            setAlert({ type: 'error', message: editingEventId ? 'Event could not be updated.' : 'Event could not be saved.' });
            setTimeout(() => setAlert(null), 3500);
        }
    };

    const removeReminder = async (dateKey: string, eventId: string) => {
        try {
            await client.delete(`/api/v1/planner/events/${eventId}/reminder`);
            setEvents((prev) => ({
                ...prev,
                [dateKey]: (prev[dateKey] || []).map((event) =>
                    event.id === eventId
                        ? { ...event, notificationTime: undefined }
                        : event
                ),
            }));
            setAlert({ type: 'info', message: 'Reminder removed.' });
            setTimeout(() => setAlert(null), 3500);
        } catch {
            setAlert({ type: 'error', message: 'Reminder could not be removed.' });
            setTimeout(() => setAlert(null), 3500);
        }
    };

    const removeEvent = async (dateKey: string, eventId: string) => {
        try {
            await client.delete(`/api/v1/planner/events/${eventId}`);
            setEvents((prev) => {
                const updatedDayEvents = (prev[dateKey] || []).filter((event) => event.id !== eventId);
                if (updatedDayEvents.length === 0) {
                    return Object.fromEntries(
                        Object.entries(prev).filter(([key]) => key !== dateKey)
                    );
                }
                return {
                    ...prev,
                    [dateKey]: updatedDayEvents,
                };
            });
            setAlert({ type: 'info', message: 'Scheduled presentation removed.' });
            setTimeout(() => setAlert(null), 3500);
        } catch {
            setAlert({ type: 'error', message: 'Scheduled presentation could not be removed.' });
            setTimeout(() => setAlert(null), 3500);
        }
    };

    const dayFocus = selected ?? startOfDay(new Date());
    const todayStart = startOfDay(new Date());
    const isToday = (day: number) =>
        isSameDay(todayStart, new Date(viewYear, viewMonth, day));

    const isSelected = (day: number) =>
        selected !== null && isSameDay(selected, new Date(viewYear, viewMonth, day));

    const cellClass =
        'relative min-h-[4.25rem] sm:min-h-[5.5rem] md:min-h-[6.25rem] lg:min-h-[7rem] rounded-xl sm:rounded-2xl text-sm font-semibold transition-all';

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
                                                `}
                                            >
                                                <span className="absolute left-2 top-2 inline-flex items-center gap-1 text-xs font-semibold sm:text-sm">
                                                    <span>{day}</span>
                                                    {isToday(day) && (
                                                        <span className="h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_8px_rgba(234,88,12,0.8)]" aria-hidden="true" />
                                                    )}
                                                </span>

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
                                                `}
                                            >
                                                <span className="absolute left-2 top-2 inline-flex items-center gap-1 text-xs font-semibold sm:text-sm">
                                                    <span>{d.getDate()}</span>
                                                    {today && (
                                                        <span className="h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_8px_rgba(234,88,12,0.8)]" aria-hidden="true" />
                                                    )}
                                                </span>

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
                                            <div className="flex items-center gap-1.5">
                                                <button
                                                    type="button"
                                                    onClick={() => handleEditEvent(toDateKey(dayFocus), ev)}
                                                    className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-white/10 text-zinc-400 transition-colors hover:border-primary/40 hover:bg-primary/10 hover:text-primary"
                                                    title="Edit scheduled presentation"
                                                >
                                                    <Pencil className="h-3.5 w-3.5" />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => removeEvent(toDateKey(dayFocus), ev.id)}
                                                    className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-white/10 text-zinc-400 transition-colors hover:border-red-500/50 hover:bg-red-500/10 hover:text-red-300"
                                                    title="Remove scheduled presentation"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </button>
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
                                                                <button
                                                                    type="button"
                                                                    onClick={() => removeReminder(toDateKey(selected), ev.id)}
                                                                    className="ml-1 inline-flex items-center gap-1 rounded-md border border-primary/25 px-1.5 py-0.5 text-[10px] font-semibold text-primary transition-colors hover:bg-primary/10"
                                                                    title="Remove reminder"
                                                                >
                                                                    <BellOff className="h-3 w-3" />
                                                                    Remove
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="ml-2 flex shrink-0 items-center gap-1">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleEditEvent(toDateKey(selected), ev)}
                                                        className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-white/10 text-zinc-400 transition-colors hover:border-primary/40 hover:bg-primary/10 hover:text-primary"
                                                        title="Edit scheduled presentation"
                                                    >
                                                        <Pencil className="h-3.5 w-3.5" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => removeEvent(toDateKey(selected), ev.id)}
                                                        className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-white/10 text-zinc-400 transition-colors hover:border-red-500/50 hover:bg-red-500/10 hover:text-red-300"
                                                        title="Remove scheduled presentation"
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </button>
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
                                    {editingEventId ? 'Edit Planner Event' : addingStep === 'select' ? 'Select Presentation' : addingStep === 'time' ? 'Select Time' : 'Add Note'}
                                </h3>
                                <button
                                    onClick={() => {
                                        setIsAdding(false);
                                        setEditingEventId(null);
                                        setEditingDateKey(null);
                                    }}
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
                                                    <div className="rounded-lg border border-primary/25 bg-transparent p-3">
                                                        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                                                            <TimeDropdown
                                                                value={selectedHour}
                                                                options={HOUR_OPTIONS}
                                                                onChange={updatePresentationHour}
                                                                ariaLabel="Presentation hour"
                                                            />
                                                            <span className="text-sm font-semibold text-primary">:</span>
                                                            <TimeDropdown
                                                                value={selectedMinute}
                                                                options={MINUTE_OPTIONS}
                                                                onChange={updatePresentationMinute}
                                                                ariaLabel="Presentation minute"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>

                                                <p className="text-[10px] text-zinc-500">Selected presentation time: <span className="font-semibold text-zinc-200">{tempEvent.time || `${selectedHour}:${selectedMinute}`}</span></p>
                                            </div>
                                        </section>

                                        {isValid24HourTime(tempEvent.time) && (
                                            <section>
                                                <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                                                    <Zap className="h-3 w-3" />
                                                    Email Reminder
                                                </h4>
                                                <p className="text-xs text-zinc-300">
                                                    When would you like to receive the reminder email?
                                                </p>

                                                <div className="mt-3 space-y-3 rounded-xl border border-white/10 bg-white/[0.02] p-3">
                                                    <button
                                                        type="button"
                                                        onClick={applyReminderThirtyMinutesAgo}
                                                        className="w-full rounded-lg border border-primary/35 bg-primary/12 py-2 text-xs font-semibold text-primary transition-all hover:bg-primary/20"
                                                    >
                                                        Email reminder 30 minutes ago
                                                    </button>

                                                    <div className="rounded-lg border border-primary/25 bg-transparent p-3">
                                                        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                                                            <TimeDropdown
                                                                value={selectedReminderHour}
                                                                options={HOUR_OPTIONS}
                                                                onChange={updateReminderHour}
                                                                ariaLabel="Reminder hour"
                                                            />
                                                            <span className="text-sm font-semibold text-primary">:</span>
                                                            <TimeDropdown
                                                                value={selectedReminderMinute}
                                                                options={MINUTE_OPTIONS}
                                                                onChange={updateReminderMinute}
                                                                ariaLabel="Reminder minute"
                                                            />
                                                        </div>
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
                                            {editingEventId ? 'Save Changes' : 'Confirm Schedule'}
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
