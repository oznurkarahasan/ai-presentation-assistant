'use client';

import React from 'react';
import { Palette, Type, Download, Sparkles, Check, ChevronRight } from 'lucide-react';
import { useTranslations } from 'next-intl';

export interface PresentationMetadata {
    title: string;
    theme: string;
    primary_color: string;
    accent_color: string;
    font_family: string;
}

interface RightStylePanelProps {
    metadata: PresentationMetadata;
    onUpdateMetadata: (metadata: PresentationMetadata) => void;
    onDownloadPPTX: () => void;
    onSendToAnalysis: () => void;
    isSaving: boolean;
    isDownloading: boolean;
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

export default function RightStylePanel({
    metadata,
    onUpdateMetadata,
    onDownloadPPTX,
    onSendToAnalysis,
    isSaving,
    isDownloading
}: RightStylePanelProps) {
    const t = useTranslations('editor.settings');

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

    const handleTitleChange = (value: string) => {
        onUpdateMetadata({
            ...metadata,
            title: value
        });
    };

    return (
        <div className="w-full flex flex-col h-full bg-zinc-950/65 border border-white/5 rounded-2xl p-5 backdrop-blur-xl relative overflow-hidden justify-between">
            {/* Scrollable controls */}
            <div className="flex-1 overflow-y-auto space-y-6 invisible-scrollbar pr-0.5">
                {/* Header */}
                <div className="pb-3 border-b border-white/5">
                    <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400">{t('header')}</h3>
                    <p className="text-[10px] text-zinc-500 font-medium mt-0.5">{t('subtitle')}</p>
                </div>

                {/* Presentation Title Field */}
                <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-wider text-zinc-500">{t('titleLabel')}</label>
                    <input
                        type="text"
                        value={metadata.title}
                        onChange={(e) => handleTitleChange(e.target.value)}
                        placeholder={t('titlePlaceholder')}
                        className="w-full bg-zinc-900 border border-white/5 hover:border-white/10 focus:border-primary/50 focus:outline-none px-4 py-3 rounded-xl text-xs text-white font-bold transition-all placeholder-zinc-600"
                    />
                </div>

                {/* Theme Palettes */}
                <div className="space-y-2.5">
                    <div className="flex items-center gap-1.5 text-zinc-400">
                        <Palette size={13} />
                        <label className="text-[10px] font-black uppercase tracking-wider text-zinc-500">{t('colorPalettes')}</label>
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                        {PRESET_PALETTES.map((palette) => {
                            const isSelected = metadata.theme === palette.name || 
                                (metadata.primary_color.toLowerCase() === palette.primary.toLowerCase() && 
                                 metadata.accent_color.toLowerCase() === palette.accent.toLowerCase());
                            return (
                                <button
                                    key={palette.name}
                                    onClick={() => handlePaletteSelect(palette)}
                                    className={`w-full p-3 rounded-xl border flex items-center justify-between transition-all text-left ${
                                        isSelected
                                            ? 'bg-zinc-900 border-white/15 shadow-md'
                                            : 'bg-zinc-900/30 border-white/5 hover:bg-zinc-900/60 hover:border-white/10'
                                    }`}
                                >
                                    <div className="flex items-center gap-2.5">
                                        {/* Color circles */}
                                        <div className="flex -space-x-1.5 shrink-0">
                                            <div className="w-4 h-4 rounded-full border border-black" style={{ backgroundColor: palette.primary }} />
                                            <div className="w-4 h-4 rounded-full border border-black" style={{ backgroundColor: palette.accent }} />
                                        </div>
                                        <span className="text-xs font-bold text-zinc-300">{palette.displayName}</span>
                                    </div>
                                    {isSelected && <Check size={12} className="text-primary shrink-0" style={{ color: palette.primary }} />}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Custom Color Pickers */}
                <div className="grid grid-cols-2 gap-3 pt-2">
                    <div className="space-y-2">
                        <label className="text-[9px] font-black uppercase tracking-wider text-zinc-500">{t('primaryColor')}</label>
                        <div className="flex items-center gap-1.5 bg-zinc-900 border border-white/5 p-1 rounded-xl">
                            <input
                                type="color"
                                value={metadata.primary_color}
                                onChange={(e) => handleColorChange('primary_color', e.target.value)}
                                className="w-7 h-7 rounded-lg border-none bg-transparent cursor-pointer overflow-hidden outline-none"
                            />
                            <input
                                type="text"
                                value={metadata.primary_color}
                                onChange={(e) => handleColorChange('primary_color', e.target.value)}
                                className="w-full bg-transparent border-none text-[10px] font-mono font-bold text-zinc-300 uppercase tracking-tight focus:outline-none"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[9px] font-black uppercase tracking-wider text-zinc-500">{t('accentColor')}</label>
                        <div className="flex items-center gap-1.5 bg-zinc-900 border border-white/5 p-1 rounded-xl">
                            <input
                                type="color"
                                value={metadata.accent_color}
                                onChange={(e) => handleColorChange('accent_color', e.target.value)}
                                className="w-7 h-7 rounded-lg border-none bg-transparent cursor-pointer overflow-hidden outline-none"
                            />
                            <input
                                type="text"
                                value={metadata.accent_color}
                                onChange={(e) => handleColorChange('accent_color', e.target.value)}
                                className="w-full bg-transparent border-none text-[10px] font-mono font-bold text-zinc-300 uppercase tracking-tight focus:outline-none"
                            />
                        </div>
                    </div>
                </div>

                {/* Font Family selector */}
                <div className="space-y-2 pt-2">
                    <div className="flex items-center gap-1.5 text-zinc-400">
                        <Type size={13} />
                        <label className="text-[10px] font-black uppercase tracking-wider text-zinc-500">{t('fontFamily')}</label>
                    </div>
                    <select
                        value={metadata.font_family}
                        onChange={(e) => handleFontChange(e.target.value)}
                        className="w-full bg-zinc-900 border border-white/5 hover:border-white/10 focus:border-primary/50 focus:outline-none px-4 py-3 rounded-xl text-xs font-bold text-zinc-300 transition-all cursor-pointer appearance-none"
                        style={{
                            backgroundImage: `url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='rgba(255,255,255,0.4)' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
                            backgroundPosition: 'right 16px center',
                            backgroundSize: '14px',
                            backgroundRepeat: 'no-repeat'
                        }}
                    >
                        {FONTS.map((font) => (
                            <option key={font.name} value={font.value} className="bg-zinc-950 font-sans font-bold">
                                {font.name}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-4 border-t border-white/5 space-y-3 mt-6">
                {/* Download PPTX Button */}
                <button
                    onClick={onDownloadPPTX}
                    disabled={isDownloading}
                    className="w-full py-3.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-white/5 hover:border-white/10 active:scale-[0.98] transition-all font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 text-zinc-300 disabled:opacity-50 disabled:pointer-events-none"
                >
                    {isDownloading ? (
                        <div className="w-4 h-4 border border-zinc-500 border-t-transparent rounded-full animate-spin" />
                    ) : (
                        <Download size={14} className="text-zinc-400" />
                    )}
                    <span>{isDownloading ? t('downloadingPptx') : t('downloadPptx')}</span>
                </button>

                {/* Send to Analysis Button */}
                <button
                    onClick={onSendToAnalysis}
                    disabled={isSaving}
                    className="w-full py-4 rounded-xl bg-primary hover:bg-orange-500 active:scale-[0.98] transition-all font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 text-white shadow-[0_4px_20px_rgba(234,88,12,0.25)] disabled:opacity-50 disabled:pointer-events-none"
                    style={{
                        backgroundColor: metadata.primary_color
                    }}
                >
                    {isSaving ? (
                        <div className="w-4 h-4 border border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                        <Sparkles size={14} className="text-white animate-pulse" />
                    )}
                    <span>{isSaving ? t('sendingToAnalysis') : t('sendToAnalysis')}</span>
                    <ChevronRight size={14} className="ml-0.5 text-white/70" />
                </button>
            </div>
        </div>
    );
}
