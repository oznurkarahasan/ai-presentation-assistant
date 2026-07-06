'use client';

import React from 'react';
import { Minus, Plus, Maximize2, Minimize2, StickyNote } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface EditorStatusBarProps {
    currentSlide: number;
    totalSlides: number;
    zoom: number;
    onZoomChange: (zoom: number) => void;
    onZoomIn: () => void;
    onZoomOut: () => void;
    onZoomFit: () => void;
    isNotesOpen: boolean;
    onToggleNotes: () => void;
    isFullscreen: boolean;
    onToggleFullscreen: () => void;
}

const ZOOM_PRESETS = [75, 100, 150];

export default function EditorStatusBar({
    currentSlide,
    totalSlides,
    zoom,
    onZoomChange,
    onZoomIn,
    onZoomOut,
    onZoomFit,
    isNotesOpen,
    onToggleNotes,
    isFullscreen,
    onToggleFullscreen,
}: EditorStatusBarProps) {
    const t = useTranslations('editor.statusBar');

    return (
        <div className="h-8 border-t border-white/[0.06] bg-zinc-950/90 backdrop-blur-lg flex items-center justify-between px-3 z-20 select-none shrink-0">
            {/* Left: Slide indicator */}
            <div className="flex items-center gap-2">
                <span className="text-[10px] font-semibold text-zinc-500 tabular-nums">
                    {t('slide')} {currentSlide} {t('of')} {totalSlides}
                </span>
            </div>

            {/* Center: Zoom controls */}
            <div className="flex items-center gap-1">
                <button
                    onClick={onZoomOut}
                    className="w-6 h-6 rounded flex items-center justify-center text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.06] transition-colors"
                    title={t('zoom') + ' -'}
                >
                    <Minus size={12} />
                </button>

                <button
                    onClick={onZoomFit}
                    className="px-2 h-6 rounded flex items-center justify-center text-[10px] font-bold text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-colors tabular-nums min-w-[42px]"
                >
                    {zoom === 0 ? 'Fit' : `${zoom}%`}
                </button>

                <button
                    onClick={onZoomIn}
                    className="w-6 h-6 rounded flex items-center justify-center text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.06] transition-colors"
                    title={t('zoom') + ' +'}
                >
                    <Plus size={12} />
                </button>

                {/* Zoom presets dropdown-like row (visible on wider screens) */}
                <div className="hidden lg:flex items-center gap-0.5 ml-1 border-l border-white/[0.06] pl-1.5">
                    {ZOOM_PRESETS.map((preset) => (
                        <button
                            key={preset}
                            onClick={() => onZoomChange(preset)}
                            className={`px-1.5 h-5 rounded text-[9px] font-bold transition-colors ${
                                zoom === preset
                                    ? 'text-white bg-white/[0.08]'
                                    : 'text-zinc-600 hover:text-zinc-400'
                            }`}
                        >
                            {preset}%
                        </button>
                    ))}
                </div>
            </div>

            {/* Right: Notes toggle + Fullscreen */}
            <div className="flex items-center gap-1">
                <button
                    onClick={onToggleNotes}
                    className={`h-6 px-2 rounded flex items-center gap-1 text-[10px] font-semibold transition-colors ${
                        isNotesOpen
                            ? 'text-zinc-200 bg-white/[0.06]'
                            : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.04]'
                    }`}
                    title={t('notes')}
                >
                    <StickyNote size={11} />
                    <span className="hidden sm:inline">{t('notes')}</span>
                </button>

                <button
                    onClick={onToggleFullscreen}
                    className="w-6 h-6 rounded flex items-center justify-center text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.06] transition-colors"
                >
                    {isFullscreen ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
                </button>
            </div>
        </div>
    );
}
