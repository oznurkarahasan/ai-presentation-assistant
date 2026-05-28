'use client';

import React, { useState } from 'react';
import { Trash2, Plus, Move } from 'lucide-react';

export interface SlideImage {
    prompt: string;
    style?: string;
    alt?: string;
    url?: string;
}

export interface PresentationSlide {
    id: string;
    title: string;
    content_type: string; // 'left' | 'right' | 'top' | 'bottom' | 'background' | 'standard'
    items: string[];
    image?: SlideImage;
    speaker_note?: string;
}

interface SlideListProps {
    slides: PresentationSlide[];
    selectedSlideId: string;
    onSelectSlide: (id: string) => void;
    onDeleteSlide: (id: string) => void;
    onAddSlide: () => void;
    onReorderSlides: (dragIndex: number, hoverIndex: number) => void;
    primaryColor: string;
    accentColor: string;
}

export default function SlideList({
    slides,
    selectedSlideId,
    onSelectSlide,
    onDeleteSlide,
    onAddSlide,
    onReorderSlides,
    primaryColor,
    accentColor
}: SlideListProps) {
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

    const handleDragStart = (index: number) => {
        setDraggedIndex(index);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };

    const handleDrop = (e: React.DragEvent, dropIndex: number) => {
        e.preventDefault();
        if (draggedIndex !== null && draggedIndex !== dropIndex) {
            onReorderSlides(draggedIndex, dropIndex);
        }
        setDraggedIndex(null);
    };

    return (
        <div className="w-full flex flex-col h-full bg-zinc-950/65 border border-white/5 rounded-2xl p-4 backdrop-blur-xl relative overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/5">
                <div>
                    <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400">Slaytlar</h3>
                    <p className="text-[10px] text-zinc-500 font-medium mt-0.5">{slides.length} Slayt</p>
                </div>
            </div>

            {/* List Container */}
            <div className="flex-1 overflow-y-auto pr-1 space-y-3 custom-scrollbar invisible-scrollbar">
                {slides.map((slide, index) => {
                    const isSelected = slide.id === selectedSlideId;
                    const isDragging = draggedIndex === index;

                    return (
                        <div
                            key={slide.id}
                            draggable
                            onDragStart={() => handleDragStart(index)}
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(e, index)}
                            onDragEnd={() => setDraggedIndex(null)}
                            onClick={() => onSelectSlide(slide.id)}
                            className={`group relative rounded-xl p-3 border transition-all duration-300 cursor-pointer overflow-hidden ${
                                isSelected
                                    ? 'bg-zinc-900 border-primary shadow-[0_0_15px_rgba(249,115,22,0.15)]'
                                    : 'bg-zinc-900/40 border-white/5 hover:border-white/10 hover:bg-zinc-900/60'
                            } ${isDragging ? 'opacity-40 scale-95 border-dashed' : ''}`}
                            style={{
                                borderColor: isSelected ? primaryColor : undefined,
                                boxShadow: isSelected ? `0 0 15px ${primaryColor}25` : undefined
                            }}
                        >
                            {/* Drag handle */}
                            <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-60 transition-opacity cursor-grab">
                                <Move size={12} className="text-zinc-500" />
                            </div>

                            {/* Delete Button */}
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onDeleteSlide(slide.id);
                                }}
                                className="absolute top-2 right-2 p-1.5 rounded-lg bg-zinc-950/80 border border-white/5 text-zinc-400 hover:text-red-400 hover:border-red-500/20 opacity-0 group-hover:opacity-100 transition-all duration-200 z-10"
                                title="Slaytı Sil"
                            >
                                <Trash2 size={11} />
                            </button>

                            {/* Thumbnail representation */}
                            <div className="aspect-[16/9] w-full rounded-lg bg-zinc-950 border border-white/5 flex items-center justify-center mb-2.5 overflow-hidden relative">
                                {/* Miniature slide preview */}
                                <div 
                                    className="absolute inset-0 scale-[0.35] origin-center flex flex-col justify-between p-4"
                                    style={{
                                        width: '285.7%',
                                        height: '285.7%',
                                        transform: 'scale(0.35)',
                                        transformOrigin: '0 0',
                                        fontFamily: 'Inter, sans-serif'
                                    }}
                                >
                                    <h4 className="text-[20px] font-black text-white leading-tight uppercase tracking-tighter truncate">
                                        {slide.title || 'Başlıksız Slayt'}
                                    </h4>
                                    <div className="space-y-1.5 my-2 flex-1">
                                        {slide.items.slice(0, 3).map((item, idx) => (
                                            <div key={idx} className="flex items-center gap-1.5 text-[12px] text-zinc-400 truncate font-semibold">
                                                <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: accentColor || '#06b6d4' }} />
                                                <span>{item}</span>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="flex justify-between items-center text-[10px] text-zinc-600 font-bold">
                                        <span>PRECUE.AI</span>
                                        <span>{index + 1}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Slide Title and Info */}
                            <div className="flex items-center justify-between mt-1 px-0.5">
                                <div className="truncate pr-4">
                                    <p className="text-xs font-bold text-zinc-200 truncate group-hover:text-white transition-colors">
                                        {slide.title || 'Başlıksız Slayt'}
                                    </p>
                                    <p className="text-[9px] text-zinc-500 font-black uppercase tracking-wider mt-0.5">
                                        {slide.content_type === 'standard' ? 'STANDART' : 
                                         slide.content_type === 'left' ? 'SOL GÖRSEL' :
                                         slide.content_type === 'right' ? 'SAĞ GÖRSEL' :
                                         slide.content_type === 'top' ? 'ÜST GÖRSEL' :
                                         slide.content_type === 'bottom' ? 'ALT GÖRSEL' : 'ARKA PLAN'}
                                    </p>
                                </div>
                                <span 
                                    className="text-[10px] font-black tracking-tight shrink-0 px-2 py-0.5 rounded-md bg-zinc-950 border border-white/5 text-zinc-400"
                                >
                                    {index + 1}
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Add Slide Button */}
            <button
                onClick={onAddSlide}
                className="mt-4 w-full py-3 bg-zinc-900 hover:bg-zinc-800 border border-white/5 hover:border-primary/20 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all active:scale-[0.98] text-zinc-300 hover:text-white"
                style={{
                    borderColor: 'rgba(255,255,255,0.05)'
                }}
            >
                <Plus size={14} className="text-primary" style={{ color: primaryColor }} />
                <span>Yeni Slayt</span>
            </button>
        </div>
    );
}
