'use client';

import React, { useState } from 'react';
import { Palette, Type, Check, Layers, StickyNote, Sparkles } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { SLIDE_LAYOUT_IDS, SLIDE_LAYOUT_ICONS, SlideLayoutId } from '../lib/slideLayouts';
import type { PresentationMetadata } from '../types/presentation';

interface RightStylePanelProps {
    metadata: PresentationMetadata;
    onUpdateMetadata: (metadata: PresentationMetadata) => void;
    // Active slide info for Slide tab
    activeSlideTitle?: string;
    activeSlideLayout?: SlideLayoutId;
    activeSlideNote?: string;
    onUpdateSlideLayout?: (layout: SlideLayoutId) => void;
    onUpdateSlideNote?: (note: string) => void;
}

export interface ColorPalette {
    name: string;
    displayName: string;
    primary: string;
    accent: string;
}

const PRESET_PALETTES: ColorPalette[] = [
    { name: 'sunset', displayName: 'Sunset Glow', primary: '#f97316', accent: '#06b6d4' },
    { name: 'cyber', displayName: 'Neon Cyber', primary: '#a855f7', accent: '#22c55e' },
    { name: 'royal', displayName: 'Royal Gold', primary: '#3b82f6', accent: '#eab308' },
    { name: 'crimson', displayName: 'Crimson Rose', primary: '#f43f5e', accent: '#cbd5e1' },
    { name: 'forest', displayName: 'Forest Mint', primary: '#10b981', accent: '#6ee7b7' }
];

const FONTS = [
    { name: 'Inter', value: 'Inter, sans-serif' },
    { name: 'Outfit', value: 'Outfit, sans-serif' },
    { name: 'Playfair Display', value: 'Playfair Display, serif' },
    { name: 'Montserrat', value: 'Montserrat, sans-serif' },
    { name: 'Fira Code', value: 'Fira Code, monospace' },
    { name: 'Space Grotesk', value: 'Space Grotesk, sans-serif' }
];

const LAYOUTS = SLIDE_LAYOUT_IDS.map((id) => ({ id, icon: SLIDE_LAYOUT_ICONS[id] }));

type TabId = 'style' | 'slide' | 'notes';

export default function RightStylePanel({
    metadata,
    onUpdateMetadata,
    activeSlideTitle,
    activeSlideLayout,
    activeSlideNote,
    onUpdateSlideLayout,
    onUpdateSlideNote,
}: RightStylePanelProps) {
    const tSettings = useTranslations('editor.settings');
    const tCanvas = useTranslations('editor.canvas');
    const tTabs = useTranslations('editor.tabs');
    const [activeTab, setActiveTab] = useState<TabId>('style');

    const handlePaletteSelect = (palette: ColorPalette) => {
        onUpdateMetadata({
            ...metadata,
            theme: palette.name,
            primary_color: palette.primary,
            accent_color: palette.accent
        });
    };

    const handleColorChange = (key: 'primary_color' | 'accent_color', value: string) => {
        onUpdateMetadata({
            ...metadata,
            [key]: value
        });
    };

    const handleFontChange = (value: string) => {
        onUpdateMetadata({
            ...metadata,
            font_family: value
        });
    };

    const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
        { id: 'style', label: tTabs('style'), icon: <Palette size={13} /> },
        { id: 'slide', label: tTabs('slide'), icon: <Layers size={13} /> },
        { id: 'notes', label: tTabs('notes'), icon: <StickyNote size={13} /> },
    ];

    return (
        <div className="h-full flex flex-col bg-zinc-950 border-l border-white/[0.06] editor-panel-shadow-left select-none overflow-hidden">
            {/* Tab bar */}
            <div className="flex items-center border-b border-white/[0.06] shrink-0">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[10px] font-bold uppercase tracking-wider transition-all border-b-2 ${
                            activeTab === tab.id
                                ? 'text-white border-primary bg-white/[0.02]'
                                : 'text-zinc-500 border-transparent hover:text-zinc-300 hover:bg-white/[0.02]'
                        }`}
                        style={{
                            borderBottomColor: activeTab === tab.id ? metadata.primary_color : undefined,
                        }}
                    >
                        {tab.icon}
                        <span className="hidden xl:inline">{tab.label}</span>
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto invisible-scrollbar p-4 space-y-5">
                {/* === STYLE TAB === */}
                {activeTab === 'style' && (
                    <>
                        {/* Theme Palettes */}
                        <div className="space-y-2">
                            <div className="flex items-center gap-1.5 text-zinc-400 mb-2">
                                <Palette size={12} />
                                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">{tSettings('colorPalettes')}</label>
                            </div>
                            <div className="grid grid-cols-1 gap-1.5">
                                {PRESET_PALETTES.map((palette) => {
                                    const isSelected = metadata.theme === palette.name ||
                                        (metadata.primary_color.toLowerCase() === palette.primary.toLowerCase() &&
                                         metadata.accent_color.toLowerCase() === palette.accent.toLowerCase());
                                    return (
                                        <button
                                            key={palette.name}
                                            onClick={() => handlePaletteSelect(palette)}
                                            className={`w-full p-2.5 rounded-lg border flex items-center justify-between transition-all text-left ${
                                                isSelected
                                                    ? 'bg-white/[0.04] border-white/[0.12]'
                                                    : 'bg-transparent border-white/[0.04] hover:bg-white/[0.03] hover:border-white/[0.08]'
                                            }`}
                                        >
                                            <div className="flex items-center gap-2">
                                                <div className="flex -space-x-1 shrink-0">
                                                    <div className="w-3.5 h-3.5 rounded-full border border-zinc-800" style={{ backgroundColor: palette.primary }} />
                                                    <div className="w-3.5 h-3.5 rounded-full border border-zinc-800" style={{ backgroundColor: palette.accent }} />
                                                </div>
                                                <span className="text-[11px] font-semibold text-zinc-300">{palette.displayName}</span>
                                            </div>
                                            {isSelected && <Check size={11} style={{ color: palette.primary }} />}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Custom Color Pickers */}
                        <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1.5">
                                <label className="text-[9px] font-bold uppercase tracking-wider text-zinc-500">{tSettings('primaryColor')}</label>
                                <div className="flex items-center gap-1.5 bg-zinc-900/60 border border-white/[0.06] p-1 rounded-lg">
                                    <input
                                        type="color"
                                        value={metadata.primary_color}
                                        onChange={(e) => handleColorChange('primary_color', e.target.value)}
                                        className="w-6 h-6 rounded border-none bg-transparent cursor-pointer overflow-hidden outline-none"
                                    />
                                    <input
                                        type="text"
                                        value={metadata.primary_color}
                                        onChange={(e) => handleColorChange('primary_color', e.target.value)}
                                        className="w-full bg-transparent border-none text-[10px] font-mono font-semibold text-zinc-300 uppercase tracking-tight focus:outline-none"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[9px] font-bold uppercase tracking-wider text-zinc-500">{tSettings('accentColor')}</label>
                                <div className="flex items-center gap-1.5 bg-zinc-900/60 border border-white/[0.06] p-1 rounded-lg">
                                    <input
                                        type="color"
                                        value={metadata.accent_color}
                                        onChange={(e) => handleColorChange('accent_color', e.target.value)}
                                        className="w-6 h-6 rounded border-none bg-transparent cursor-pointer overflow-hidden outline-none"
                                    />
                                    <input
                                        type="text"
                                        value={metadata.accent_color}
                                        onChange={(e) => handleColorChange('accent_color', e.target.value)}
                                        className="w-full bg-transparent border-none text-[10px] font-mono font-semibold text-zinc-300 uppercase tracking-tight focus:outline-none"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Font Family selector */}
                        <div className="space-y-1.5">
                            <div className="flex items-center gap-1.5 text-zinc-400">
                                <Type size={12} />
                                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">{tSettings('fontFamily')}</label>
                            </div>
                            <select
                                value={metadata.font_family}
                                onChange={(e) => handleFontChange(e.target.value)}
                                className="w-full bg-zinc-900/60 border border-white/[0.06] hover:border-white/[0.1] focus:border-primary/50 focus:outline-none px-3 py-2.5 rounded-lg text-xs font-semibold text-zinc-300 transition-all cursor-pointer appearance-none"
                                style={{
                                    fontFamily: metadata.font_family,
                                    backgroundImage: `url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='rgba(255,255,255,0.3)' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
                                    backgroundPosition: 'right 10px center',
                                    backgroundSize: '14px',
                                    backgroundRepeat: 'no-repeat'
                                }}
                            >
                                {FONTS.map((font) => (
                                    <option key={font.name} value={font.value} className="bg-zinc-950 font-sans">
                                        {font.name}
                                    </option>
                                ))}
                            </select>
                            {/* Font Preview */}
                            <div
                                className="p-3 rounded-lg bg-zinc-900/30 border border-white/[0.04] text-sm text-zinc-400"
                                style={{ fontFamily: metadata.font_family }}
                            >
                                The quick brown fox jumps over the lazy dog
                            </div>
                        </div>
                    </>
                )}

                {/* === SLIDE TAB === */}
                {activeTab === 'slide' && (
                    <>
                        {/* Current Slide Info */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Current Slide</label>
                            <div className="p-3 rounded-lg bg-zinc-900/40 border border-white/[0.06]">
                                <p className="text-xs font-semibold text-zinc-200 truncate">{activeSlideTitle || 'Untitled'}</p>
                            </div>
                        </div>

                        {/* Layout Selector */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Layout</label>
                            <div className="grid grid-cols-4 gap-1.5">
                                {LAYOUTS.map((layout) => (
                                    <button
                                        key={layout.id}
                                        onClick={() => onUpdateSlideLayout?.(layout.id)}
                                        className={`aspect-[16/9] rounded-lg border-2 flex items-center justify-center text-lg transition-all ${
                                            activeSlideLayout === layout.id
                                                ? 'border-primary bg-primary/10 text-white'
                                                : 'border-white/[0.06] bg-zinc-900/30 text-zinc-500 hover:border-white/[0.12] hover:text-zinc-300'
                                        }`}
                                        style={{
                                            borderColor: activeSlideLayout === layout.id ? metadata.primary_color : undefined,
                                        }}
                                    >
                                        {layout.icon}
                                    </button>
                                ))}
                            </div>
                            <div className="grid grid-cols-4 gap-1.5">
                                {LAYOUTS.map((layout) => (
                                    <span key={layout.id} className="text-[8px] font-bold uppercase tracking-wider text-zinc-600 text-center">
                                        {layout.id === 'standard' ? tCanvas('layoutText') :
                                         layout.id === 'left' ? tCanvas('layoutLeft') :
                                         layout.id === 'right' ? tCanvas('layoutRight') :
                                         tCanvas('layoutBg')}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </>
                )}

                {/* === NOTES TAB === */}
                {activeTab === 'notes' && (
                    <>
                        <div className="space-y-2">
                            <div className="flex items-center gap-1.5">
                                <Sparkles size={12} style={{ color: metadata.primary_color }} />
                                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">{tCanvas('speakerNotesHeader')}</label>
                            </div>
                            <textarea
                                value={activeSlideNote || ''}
                                onChange={(e) => onUpdateSlideNote?.(e.target.value)}
                                placeholder={tCanvas('speakerNotesPlaceholder')}
                                className="w-full h-48 bg-zinc-900/40 border border-white/[0.06] hover:border-white/[0.1] focus:border-primary/40 focus:outline-none p-3 rounded-lg text-xs font-medium leading-relaxed text-zinc-300 placeholder:text-zinc-600 resize-none transition-all custom-scrollbar"
                                maxLength={800}
                            />
                            <div className="flex justify-end text-[9px] text-zinc-600 font-semibold">
                                {tCanvas('charLimit', { count: activeSlideNote?.length || 0 })}
                            </div>
                        </div>

                        {/* Slide title for context */}
                        <div className="p-3 rounded-lg bg-zinc-900/20 border border-white/[0.04]">
                            <p className="text-[9px] font-bold uppercase tracking-wider text-zinc-600 mb-1">Editing notes for:</p>
                            <p className="text-xs font-semibold text-zinc-400 truncate">{activeSlideTitle || 'Untitled'}</p>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
