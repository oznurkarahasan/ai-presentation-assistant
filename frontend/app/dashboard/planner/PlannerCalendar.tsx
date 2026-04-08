'use client';

import React, { useMemo, useState, useCallback } from 'react';
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';
import { motion } from 'framer-motion';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
const WEEKDAYS_SHORT = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'] as const;

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

function buildMonthCells(viewYear: number, viewMonth: number): (number | null)[] {
    const first = new Date(viewYear, viewMonth, 1);
    const last = new Date(viewYear, viewMonth + 1, 0);
    const daysInMonth = last.getDate();
    const pad = first.getDay();
    const cells: (number | null)[] = [];
    for (let i = 0; i < pad; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    return cells;
}

export default function PlannerCalendar() {
    const [cursor, setCursor] = useState(() => {
        const n = new Date();
        return new Date(n.getFullYear(), n.getMonth(), 1);
    });
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
        setCursor((c) => new Date(c.getFullYear(), c.getMonth() - 1, 1));
    }, []);

    const goNext = useCallback(() => {
        setCursor((c) => new Date(c.getFullYear(), c.getMonth() + 1, 1));
    }, []);

    const goToday = useCallback(() => {
        const n = new Date();
        setCursor(new Date(n.getFullYear(), n.getMonth(), 1));
        setSelected(startOfDay(n));
    }, []);

    const selectDay = useCallback(
        (day: number) => {
            setSelected(startOfDay(new Date(viewYear, viewMonth, day)));
        },
        [viewYear, viewMonth]
    );

    const todayStart = startOfDay(new Date());
    const isToday = (day: number) =>
        isSameDay(todayStart, new Date(viewYear, viewMonth, day));

    const isSelected = (day: number) =>
        selected !== null && isSameDay(selected, new Date(viewYear, viewMonth, day));

    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6 sm:space-y-8"
        >
        <div className="grid gap-6 lg:grid-cols-[1fr_minmax(0,280px)] xl:grid-cols-[1fr_minmax(0,320px)]">
                <div className="rounded-[1.5rem] sm:rounded-[2rem] bg-[#0C0C0C] border border-white/5 overflow-hidden shadow-inner">
                    <div className="flex items-center justify-between gap-2 px-4 py-4 sm:px-8 sm:py-6 border-b border-white/5">
                        <button
                            type="button"
                            onClick={goPrev}
                            aria-label="Previous month"
                            className="p-2.5 sm:p-3 rounded-xl text-zinc-400 hover:text-white hover:bg-white/5 border border-transparent hover:border-white/10 transition-all shrink-0"
                        >
                            <ChevronLeft className="h-5 w-5" />
                        </button>
                        <h3 className="text-base sm:text-lg font-bold font-display tracking-tight text-center text-white truncate px-2">
                            {monthLabel}
                        </h3>
                        <button
                            type="button"
                            onClick={goNext}
                            aria-label="Next month"
                            className="p-2.5 sm:p-3 rounded-xl text-zinc-400 hover:text-white hover:bg-white/5 border border-transparent hover:border-white/10 transition-all shrink-0"
                        >
                            <ChevronRight className="h-5 w-5" />
                        </button>
                    </div>

                    <div className="p-3 sm:p-6 sm:pb-8">
                        <div
                            className="grid grid-cols-7 gap-1 sm:gap-2 mb-2 sm:mb-3"
                            role="row"
                            aria-hidden
                        >
                            {WEEKDAYS.map((wd, idx) => (
                                <div
                                    key={wd}
                                    className="text-center text-[10px] sm:text-xs font-bold text-zinc-500 uppercase tracking-widest py-1"
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
                                        className="min-h-[2.75rem] sm:min-h-[3.25rem] md:min-h-[3.5rem]"
                                        aria-hidden
                                    />
                                ) : (
                                    <button
                                        key={day}
                                        type="button"
                                        role="gridcell"
                                        onClick={() => selectDay(day)}
                                        className={`
                                            relative min-h-[2.75rem] sm:min-h-[3.25rem] md:min-h-[3.5rem]
                                            rounded-xl sm:rounded-2xl text-sm font-semibold transition-all
                                            flex items-center justify-center
                                            ${isSelected(day)
                                                ? 'bg-primary/20 text-primary border-2 border-primary shadow-[0_0_20px_-4px_rgba(234,88,12,0.45)] z-[1]'
                                                : 'text-zinc-300 border border-transparent hover:bg-white/[0.06] hover:border-white/10'}
                                            ${isToday(day) && !isSelected(day)
                                                ? 'ring-1 ring-primary/50 bg-primary/5 text-white'
                                                : ''}
                                        `}
                                    >
                                        {day}
                                        {isToday(day) && (
                                            <span className="absolute bottom-1.5 sm:bottom-2 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full bg-primary" />
                                        )}
                                    </button>
                                )
                            )}
                        </div>
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
