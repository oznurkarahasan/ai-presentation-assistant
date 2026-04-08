'use client';

import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';
import { motion } from 'framer-motion';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;
const WEEKDAYS_SHORT = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'] as const;

type PlannerView = 'day' | 'week' | 'month';

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

export default function PlannerCalendar() {
    const [plannerView, setPlannerView] = useState<PlannerView>('month');
    const [cursor, setCursor] = useState(() => {
        const n = new Date();
        return new Date(n.getFullYear(), n.getMonth(), 1);
    });
    const [weekStart, setWeekStart] = useState(() => startOfWeekMonday(new Date()));
    const [selected, setSelected] = useState<Date | null>(null);

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
        if (v === 'day' && !selected) {
            setSelected(startOfDay(new Date()));
        }
    }, [selected]);

    useEffect(() => {
        if (plannerView !== 'day' || !selected) return;
        setCursor(new Date(selected.getFullYear(), selected.getMonth(), 1));
        setWeekStart(startOfWeekMonday(selected));
    }, [selected, plannerView]);

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

    const dayFocus = selected ?? startOfDay(new Date());
    const todayStart = startOfDay(new Date());
    const isToday = (day: number) =>
        isSameDay(todayStart, new Date(viewYear, viewMonth, day));

    const isSelected = (day: number) =>
        selected !== null && isSameDay(selected, new Date(viewYear, viewMonth, day));

    const cellClass =
        'relative min-h-[4.25rem] sm:min-h-[5.5rem] md:min-h-[6.25rem] lg:min-h-[7rem] rounded-xl sm:rounded-2xl text-sm font-semibold transition-all flex items-center justify-center';

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
                                className={`px-3 py-2 text-[11px] font-semibold tracking-wide transition-colors sm:px-4 sm:text-xs ${
                                    plannerView === v
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
                                <p className="text-center text-sm text-zinc-500">
                                    Use the arrows to change day, or switch to week / month.
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                <aside className="rounded-[1.5rem] sm:rounded-[2rem] bg-[#0C0C0C] border border-white/5 p-5 sm:p-6 flex flex-col min-h-[200px] lg:min-h-0">
                    <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4">
                        Selected day
                    </h4>
                    {selected ? (
                        <div className="space-y-2">
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
                            <p className="text-sm text-zinc-600 mt-4 leading-relaxed">
                                No events yet. Use this space for rehearsals or deadlines when you connect data.
                            </p>
                        </div>
                    ) : (
                        <p className="text-sm text-zinc-600 leading-relaxed mt-1">
                            Tap a date on the calendar to see it here.
                        </p>
                    )}
                </aside>
            </div>
        </motion.div>
    );
}
