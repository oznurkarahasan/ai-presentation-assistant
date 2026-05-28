'use client';
/* eslint-disable @next/next/no-img-element */

import React, { useState, useEffect } from 'react';
import { Image as ImageIcon, Plus, Trash2, ChevronDown, ChevronUp, Sparkles, Eye } from 'lucide-react';
import { PresentationSlide } from './SlideList';

interface SlideCanvasProps {
    slide: PresentationSlide;
    primaryColor: string;
    accentColor: string;
    fontFamily: string;
    onUpdateSlideTitle: (id: string, title: string) => void;
    onUpdateSlideItem: (id: string, index: number, value: string) => void;
    onDeleteSlideItem: (id: string, index: number) => void;
    onAddSlideItem: (id: string) => void;
    onUpdateSpeakerNote: (id: string, note: string) => void;
    onUpdateLayoutType: (id: string, type: string) => void;
    onTriggerImageSearch: (id: string) => void;
    onRemoveImage: (id: string) => void;
}

export default function SlideCanvas({
    slide,
    primaryColor,
    accentColor,
    fontFamily,
    onUpdateSlideTitle,
    onUpdateSlideItem,
    onDeleteSlideItem,
    onAddSlideItem,
    onUpdateSpeakerNote,
    onUpdateLayoutType,
    onTriggerImageSearch,
    onRemoveImage
}: SlideCanvasProps) {
    const [notesExpanded, setNotesExpanded] = useState(true);

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

    // Slide Layout Renderers
    const renderContent = (textColorClass = 'text-zinc-200', alignmentClass = 'text-left') => {
        return (
            <div className={`flex flex-col justify-center h-full p-8 relative z-10 w-full`}>
                {/* Title */}
                <input
                    type="text"
                    value={slide.title}
                    onChange={(e) => onUpdateSlideTitle(slide.id, e.target.value)}
                    placeholder="Slayt Başlığı Girin..."
                    className={`w-full bg-transparent border-b border-transparent hover:border-white/10 focus:border-primary focus:outline-none text-3xl font-black tracking-tight mb-6 pb-2 transition-all duration-300 ${alignmentClass}`}
                    style={{
                        fontFamily: resolvedFontFamily,
                        color: '#ffffff',
                    }}
                />

                {/* Items */}
                <div className="space-y-3 flex-1 overflow-y-auto invisible-scrollbar">
                    {slide.items.map((item, idx) => (
                        <div key={idx} className="flex items-center gap-3 group/item">
                            <span 
                                className="w-2.5 h-2.5 rounded-full shrink-0 flex items-center justify-center shadow-lg"
                                style={{ backgroundColor: accentColor }}
                            />
                            <input
                                type="text"
                                value={item}
                                onChange={(e) => onUpdateSlideItem(slide.id, idx, e.target.value)}
                                placeholder="Açıklama maddesi girin..."
                                className={`flex-1 bg-transparent border-b border-transparent hover:border-white/5 focus:border-white/20 focus:outline-none text-sm font-medium py-1 transition-all ${textColorClass}`}
                                style={{ fontFamily: resolvedFontFamily }}
                            />
                            <button
                                onClick={() => onDeleteSlideItem(slide.id, idx)}
                                className="opacity-0 group-hover/item:opacity-100 p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-white/5 transition-all duration-200"
                                title="Maddeyi Sil"
                            >
                                <Trash2 size={13} />
                            </button>
                        </div>
                    ))}

                    {/* Add Item Button */}
                    <button
                        onClick={() => onAddSlideItem(slide.id)}
                        className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-zinc-500 hover:text-white transition-colors pt-2 group"
                    >
                        <Plus size={14} className="text-zinc-600 group-hover:text-primary" style={{ transition: 'color 0.2s' }} />
                        <span>Yeni Madde Ekle</span>
                    </button>
                </div>
            </div>
        );
    };

    const renderImagePlaceholder = () => {
        if (slide.image && slide.image.url) {
            return (
                <div className="relative w-full h-full group overflow-hidden border border-white/5 rounded-xl">
                    <img
                        src={slide.image.url}
                        alt={slide.image.alt || slide.title}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-2">
                        <button
                            onClick={() => onTriggerImageSearch(slide.id)}
                            className="px-3.5 py-2 rounded-xl bg-zinc-900 border border-white/10 hover:border-white/20 text-white font-bold text-xs uppercase tracking-wider transition-all"
                        >
                            Görseli Değiştir
                        </button>
                        <button
                            onClick={() => onRemoveImage(slide.id)}
                            className="p-2 rounded-xl bg-red-950/80 border border-red-500/20 hover:border-red-500/40 text-red-400 transition-all"
                            title="Görseli Kaldır"
                        >
                            <Trash2 size={14} />
                        </button>
                    </div>
                </div>
            );
        }

        return (
            <div 
                onClick={() => onTriggerImageSearch(slide.id)}
                className="w-full h-full border border-dashed border-white/10 hover:border-primary/40 bg-zinc-950/40 hover:bg-zinc-950/80 rounded-xl flex flex-col items-center justify-center gap-3 cursor-pointer group transition-all duration-300 shadow-inner"
            >
                <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-white/5 flex items-center justify-center text-zinc-400 group-hover:text-primary transition-colors duration-300">
                    <ImageIcon size={20} />
                </div>
                <div className="text-center">
                    <p className="text-xs font-bold text-zinc-300 group-hover:text-white transition-colors">Görsel Bul (Unsplash)</p>
                    <p className="text-[9px] text-zinc-500 uppercase tracking-widest mt-1">Slaytı görselleştirin</p>
                </div>
            </div>
        );
    };

    // Canvas rendering style
    const canvasStyle: React.CSSProperties = {
        fontFamily: resolvedFontFamily,
        backgroundColor: '#050507',
        backgroundImage: `radial-gradient(circle at 10% 20%, ${primaryColor}14 0%, transparent 45%), radial-gradient(circle at 90% 80%, ${accentColor}14 0%, transparent 45%)`,
    };

    return (
        <div className="flex-1 flex flex-col h-full bg-zinc-950/40 border border-white/5 rounded-2xl p-6 backdrop-blur-xl relative overflow-hidden">
            {/* Top Toolbar */}
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-white/5">
                <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                        <Eye size={14} style={{ color: primaryColor }} />
                    </div>
                    <div>
                        <h3 className="text-xs font-black uppercase tracking-widest text-zinc-300">Kanvas</h3>
                        <p className="text-[10px] text-zinc-500 font-medium leading-none mt-0.5">Gerçek Zamanlı HTML/CSS Önizleme</p>
                    </div>
                </div>

                {/* Layout Selector */}
                <div className="flex items-center gap-1.5 bg-zinc-900 border border-white/5 p-1 rounded-xl shadow-inner">
                    <button
                        onClick={() => onUpdateLayoutType(slide.id, 'standard')}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                            slide.content_type === 'standard'
                                ? 'bg-primary text-white shadow-lg'
                                : 'text-zinc-400 hover:text-white hover:bg-white/[0.03]'
                        }`}
                        style={{
                            backgroundColor: slide.content_type === 'standard' ? primaryColor : undefined
                        }}
                    >
                        Metin
                    </button>
                    <button
                        onClick={() => onUpdateLayoutType(slide.id, 'left')}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                            slide.content_type === 'left'
                                ? 'bg-primary text-white shadow-lg'
                                : 'text-zinc-400 hover:text-white hover:bg-white/[0.03]'
                        }`}
                        style={{
                            backgroundColor: slide.content_type === 'left' ? primaryColor : undefined
                        }}
                    >
                        Sol Görsel
                    </button>
                    <button
                        onClick={() => onUpdateLayoutType(slide.id, 'right')}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                            slide.content_type === 'right'
                                ? 'bg-primary text-white shadow-lg'
                                : 'text-zinc-400 hover:text-white hover:bg-white/[0.03]'
                        }`}
                        style={{
                            backgroundColor: slide.content_type === 'right' ? primaryColor : undefined
                        }}
                    >
                        Sağ Görsel
                    </button>
                    <button
                        onClick={() => onUpdateLayoutType(slide.id, 'background')}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                            slide.content_type === 'background'
                                ? 'bg-primary text-white shadow-lg'
                                : 'text-zinc-400 hover:text-white hover:bg-white/[0.03]'
                        }`}
                        style={{
                            backgroundColor: slide.content_type === 'background' ? primaryColor : undefined
                        }}
                    >
                        Arka Plan
                    </button>
                </div>
            </div>

            {/* Slide 16:9 Canvas Frame */}
            <div className="flex-1 flex items-center justify-center p-4 relative bg-black/40 border border-white/5 rounded-2xl shadow-inner">
                <div 
                    style={canvasStyle}
                    className="aspect-video w-full max-w-[850px] rounded-xl border border-white/10 shadow-2xl relative overflow-hidden transition-all duration-500"
                >
                    {/* Render different layout types */}
                    {slide.content_type === 'standard' && (
                        <div className="grid grid-cols-1 h-full w-full">
                            {renderContent('text-zinc-300', 'text-left')}
                        </div>
                    )}

                    {slide.content_type === 'left' && (
                        <div className="grid grid-cols-2 h-full w-full p-6 gap-6">
                            <div className="h-full flex items-center justify-center">
                                {renderImagePlaceholder()}
                            </div>
                            <div className="h-full">
                                {renderContent('text-zinc-300', 'text-left')}
                            </div>
                        </div>
                    )}

                    {slide.content_type === 'right' && (
                        <div className="grid grid-cols-2 h-full w-full p-6 gap-6">
                            <div className="h-full">
                                {renderContent('text-zinc-300', 'text-left')}
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
                                <div className="ml-8 mr-12 p-6 rounded-2xl bg-zinc-950/70 border border-white/10 backdrop-blur-md shadow-2xl max-w-lg">
                                    {renderContent('text-zinc-200', 'text-left')}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Collapsible Speaker Notes */}
            <div className="mt-4 border border-white/5 rounded-2xl bg-zinc-950/60 overflow-hidden shadow-sm transition-all duration-300">
                <button
                    onClick={() => setNotesExpanded(!notesExpanded)}
                    className="w-full px-5 py-3.5 flex items-center justify-between text-zinc-400 hover:text-white hover:bg-white/[0.02] transition-colors"
                >
                    <div className="flex items-center gap-2.5">
                        <Sparkles size={14} className="text-primary" style={{ color: primaryColor }} />
                        <span className="text-xs font-black uppercase tracking-widest">Konuşmacı Notları (Speaker Notes)</span>
                    </div>
                    {notesExpanded ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                </button>

                {notesExpanded && (
                    <div className="p-4 pt-0 border-t border-white/5">
                        <textarea
                            value={slide.speaker_note || ''}
                            onChange={(e) => onUpdateSpeakerNote(slide.id, e.target.value)}
                            placeholder="Sahnede konuşurken size yol gösterecek notları buraya ekleyin..."
                            className="w-full h-24 bg-zinc-900/40 border border-white/5 hover:border-white/10 focus:border-primary/40 focus:outline-none p-3.5 rounded-xl text-xs font-medium leading-relaxed text-zinc-300 placeholder:text-zinc-600 resize-none transition-all custom-scrollbar"
                            maxLength={800}
                        />
                        <div className="flex justify-end text-[9px] text-zinc-600 font-bold uppercase tracking-wider mt-1 px-1">
                            {slide.speaker_note?.length || 0} / 800 Karakter
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
