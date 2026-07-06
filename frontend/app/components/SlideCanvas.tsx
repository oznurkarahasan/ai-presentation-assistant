'use client';
/* eslint-disable @next/next/no-img-element */

import React, { useState, useEffect } from 'react';
import { Image as ImageIcon, Plus, Trash2, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { PresentationSlide } from './SlideList';

interface SlideCanvasProps {
    slide: PresentationSlide;
    primaryColor: string;
    accentColor: string;
    fontFamily: string;
    zoom: number; // 0 = fit
    onUpdateSlideTitle: (id: string, title: string) => void;
    onUpdateSlideItem: (id: string, index: number, value: string) => void;
    onDeleteSlideItem: (id: string, index: number) => void;
    onAddSlideItem: (id: string) => void;
    onUpdateSpeakerNote: (id: string, note: string) => void;
    onTriggerImageSearch: (id: string) => void;
    onRemoveImage: (id: string) => void;
    // Speaker notes (now handled externally but shown in bottom section)
    isNotesOpen: boolean;
    onToggleNotes: () => void;
}

export default function SlideCanvas({
    slide,
    primaryColor,
    accentColor,
    fontFamily,
    zoom,
    onUpdateSlideTitle,
    onUpdateSlideItem,
    onDeleteSlideItem,
    onAddSlideItem,
    onUpdateSpeakerNote,
    onTriggerImageSearch,
    onRemoveImage,
    isNotesOpen,
    onToggleNotes,
}: SlideCanvasProps) {
    const t = useTranslations('editor.canvas');

    // Dynamically inject selected Google Font
    useEffect(() => {
        if (!fontFamily) return;
        const fontName = fontFamily.split(',')[0].replace(/['"]/g, '').trim();
        const linkId = `font-link-${fontName.toLowerCase().replace(/\s+/g, '-')}`;

        if (document.getElementById(linkId)) return;

        const link = document.createElement('link');
        link.id = linkId;
        link.rel = 'stylesheet';
        link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontName)}:ital,wght@0,300;0,400;0,500;0,700;0,900;1,300;1,400;1,500;1,700;1,900&display=swap`;
        document.head.appendChild(link);
    }, [fontFamily]);

    const resolvedFontFamily = fontFamily || 'Inter, sans-serif';

    // Compute the transform scale from zoom
    const scale = zoom === 0 ? 1 : zoom / 100;

    // Slide Layout Renderers
    const renderContent = (textColorClass = 'text-zinc-200') => {
        return (
            <div className="flex flex-col justify-center h-full p-6 md:p-8 relative z-10 w-full">
                {/* Title */}
                <input
                    type="text"
                    value={slide.title}
                    onChange={(e) => onUpdateSlideTitle(slide.id, e.target.value)}
                    placeholder={t('titlePlaceholder')}
                    className="w-full bg-transparent border-b-2 border-transparent hover:border-white/10 focus:border-primary/60 focus:outline-none text-2xl md:text-3xl font-black tracking-tight mb-4 md:mb-6 pb-2 transition-all duration-200"
                    style={{
                        fontFamily: resolvedFontFamily,
                        color: '#ffffff',
                    }}
                />

                {/* Items */}
                <div className="space-y-2 md:space-y-3 flex-1 overflow-y-auto invisible-scrollbar">
                    {slide.items.map((item, idx) => (
                        <div key={idx} className="flex items-center gap-3 group/item rounded-lg hover:bg-white/[0.02] px-1 -mx-1 transition-colors">
                            <span
                                className="w-2 h-2 rounded-full shrink-0 shadow-sm"
                                style={{ backgroundColor: accentColor }}
                            />
                            <input
                                type="text"
                                value={item}
                                onChange={(e) => onUpdateSlideItem(slide.id, idx, e.target.value)}
                                placeholder={t('itemPlaceholder')}
                                className={`flex-1 bg-transparent border-b border-transparent hover:border-white/[0.06] focus:border-white/20 focus:outline-none text-sm font-medium py-1.5 transition-all ${textColorClass}`}
                                style={{ fontFamily: resolvedFontFamily }}
                            />
                            <button
                                onClick={() => onDeleteSlideItem(slide.id, idx)}
                                className="opacity-0 group-hover/item:opacity-100 p-1 rounded-md text-zinc-600 hover:text-red-400 hover:bg-red-500/10 transition-all duration-150"
                                title={t('deleteItem')}
                            >
                                <Trash2 size={12} />
                            </button>
                        </div>
                    ))}

                    {/* Add Item Button */}
                    <button
                        onClick={() => onAddSlideItem(slide.id)}
                        className="flex items-center gap-2 text-[11px] font-bold text-zinc-600 hover:text-zinc-300 transition-colors pt-1 group"
                    >
                        <Plus size={13} className="text-zinc-600 group-hover:text-primary" style={{ transition: 'color 0.15s' }} />
                        <span>{t('addItem')}</span>
                    </button>
                </div>
            </div>
        );
    };

    const renderImagePlaceholder = () => {
        if (slide.image && slide.image.url) {
            return (
                <div className="relative w-full h-full group overflow-hidden rounded-lg border border-white/[0.06]">
                    <img
                        src={slide.image.url}
                        alt={slide.image.alt || slide.title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-2">
                        <button
                            onClick={() => onTriggerImageSearch(slide.id)}
                            className="px-3 py-1.5 rounded-lg bg-zinc-900/90 border border-white/10 hover:border-white/20 text-white font-bold text-[10px] uppercase tracking-wider transition-all"
                        >
                            {t('changeImage')}
                        </button>
                        <button
                            onClick={() => onRemoveImage(slide.id)}
                            className="p-1.5 rounded-lg bg-red-950/80 border border-red-500/20 hover:border-red-500/40 text-red-400 transition-all"
                            title={t('removeImage')}
                        >
                            <Trash2 size={12} />
                        </button>
                    </div>
                </div>
            );
        }

        return (
            <div
                onClick={() => onTriggerImageSearch(slide.id)}
                className="w-full h-full border border-dashed border-white/[0.08] hover:border-primary/30 bg-zinc-900/20 hover:bg-zinc-900/40 rounded-lg flex flex-col items-center justify-center gap-2 cursor-pointer group transition-all duration-200"
            >
                <div className="w-10 h-10 rounded-xl bg-zinc-900/60 border border-white/[0.06] flex items-center justify-center text-zinc-500 group-hover:text-primary transition-colors duration-200">
                    <ImageIcon size={18} />
                </div>
                <div className="text-center">
                    <p className="text-[10px] font-semibold text-zinc-400 group-hover:text-white transition-colors">{t('findImage')}</p>
                    <p className="text-[8px] text-zinc-600 uppercase tracking-widest mt-0.5">{t('visualizeSubtitle')}</p>
                </div>
            </div>
        );
    };

    // Canvas rendering style
    const canvasStyle: React.CSSProperties = {
        fontFamily: resolvedFontFamily,
        backgroundColor: '#0a0a0c',
        backgroundImage: `radial-gradient(circle at 10% 20%, ${primaryColor}10 0%, transparent 45%), radial-gradient(circle at 90% 80%, ${accentColor}10 0%, transparent 45%)`,
    };

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden relative">
            {/* Canvas Area with checkerboard */}
            <div className="flex-1 editor-checkerboard flex items-center justify-center p-4 md:p-6 lg:p-8 overflow-auto">
                <div
                    className="transition-transform duration-200 ease-out origin-center"
                    style={{
                        transform: zoom === 0 ? 'none' : `scale(${scale})`,
                    }}
                >
                    <div
                        style={canvasStyle}
                        className="aspect-video w-[820px] max-w-[90vw] rounded-lg border border-white/[0.08] shadow-[0_4px_40px_rgba(0,0,0,0.6)] relative overflow-hidden transition-all duration-300"
                    >
                        {/* Top accent bar */}
                        <div className="absolute top-0 left-0 right-0 h-[3px] z-20" style={{ backgroundColor: primaryColor }} />

                        {/* Render different layout types */}
                        {slide.content_type === 'standard' && (
                            <div className="grid grid-cols-1 h-full w-full">
                                {renderContent('text-zinc-300')}
                            </div>
                        )}

                        {slide.content_type === 'left' && (
                            <div className="grid grid-cols-2 h-full w-full p-4 gap-4">
                                <div className="h-full flex items-center justify-center">
                                    {renderImagePlaceholder()}
                                </div>
                                <div className="h-full">
                                    {renderContent('text-zinc-300')}
                                </div>
                            </div>
                        )}

                        {slide.content_type === 'right' && (
                            <div className="grid grid-cols-2 h-full w-full p-4 gap-4">
                                <div className="h-full">
                                    {renderContent('text-zinc-300')}
                                </div>
                                <div className="h-full flex items-center justify-center">
                                    {renderImagePlaceholder()}
                                </div>
                            </div>
                        )}

                        {slide.content_type === 'background' && (
                            <div className="relative h-full w-full">
                                {slide.image && slide.image.url ? (
                                    <img
                                        src={slide.image.url}
                                        alt={slide.image.alt || slide.title}
                                        className="absolute inset-0 w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className="absolute inset-0 p-6 flex items-center justify-center bg-zinc-950/20">
                                        <div className="w-1/3 aspect-video">
                                            {renderImagePlaceholder()}
                                        </div>
                                    </div>
                                )}
                                {/* Glassmorphic content overlay */}
                                <div className="absolute inset-0 bg-black/35 flex items-center">
                                    <div className="ml-6 mr-10 p-5 rounded-xl bg-zinc-950/70 border border-white/10 backdrop-blur-md shadow-2xl max-w-lg">
                                        {renderContent('text-zinc-200')}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Speaker Notes - Collapsible bottom panel */}
            {isNotesOpen && (
                <div className="border-t border-white/[0.06] bg-zinc-950 shrink-0">
                    <button
                        onClick={onToggleNotes}
                        className="w-full px-4 py-2 flex items-center justify-between text-zinc-400 hover:text-white hover:bg-white/[0.02] transition-colors"
                    >
                        <div className="flex items-center gap-2">
                            <Sparkles size={12} style={{ color: primaryColor }} />
                            <span className="text-[10px] font-bold uppercase tracking-widest">{t('speakerNotesHeader')}</span>
                        </div>
                        <ChevronDown size={12} />
                    </button>
                    <div className="px-4 pb-3">
                        <textarea
                            value={slide.speaker_note || ''}
                            onChange={(e) => onUpdateSpeakerNote(slide.id, e.target.value)}
                            placeholder={t('speakerNotesPlaceholder')}
                            className="w-full h-20 bg-zinc-900/40 border border-white/[0.06] hover:border-white/[0.1] focus:border-primary/40 focus:outline-none p-3 rounded-lg text-xs font-medium leading-relaxed text-zinc-300 placeholder:text-zinc-600 resize-none transition-all custom-scrollbar"
                            maxLength={800}
                        />
                        <div className="flex justify-end text-[9px] text-zinc-600 font-semibold mt-1">
                            {t('charLimit', { count: slide.speaker_note?.length || 0 })}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
