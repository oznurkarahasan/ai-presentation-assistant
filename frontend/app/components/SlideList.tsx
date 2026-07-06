'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Trash2, Plus, GripVertical } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { SlideLayoutId } from '../lib/slideLayouts';

export interface SlideImage {
    prompt: string;
    style?: string;
    alt?: string;
    url?: string;
}

export interface PresentationSlide {
    id: string;
    title: string;
    content_type: SlideLayoutId;
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
    const t = useTranslations('editor.sidebar');
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
    const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
    const selectedRef = useRef<HTMLDivElement>(null);
    const listRef = useRef<HTMLDivElement>(null);

    // Scroll active slide into view
    useEffect(() => {
        if (selectedRef.current) {
            selectedRef.current.scrollIntoView({
                behavior: 'smooth',
                block: 'nearest',
            });
        }
    }, [selectedSlideId]);

    // Keyboard navigation
    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent) => {
            const currentIndex = slides.findIndex((s) => s.id === selectedSlideId);
            if (currentIndex === -1) return;

            if (e.key === 'ArrowUp' && currentIndex > 0) {
                e.preventDefault();
                onSelectSlide(slides[currentIndex - 1].id);
            } else if (e.key === 'ArrowDown' && currentIndex < slides.length - 1) {
                e.preventDefault();
                onSelectSlide(slides[currentIndex + 1].id);
            } else if (e.key === 'Delete' || e.key === 'Backspace') {
                if (slides.length > 1) {
                    e.preventDefault();
                    onDeleteSlide(selectedSlideId);
                }
            }
        },
        [slides, selectedSlideId, onSelectSlide, onDeleteSlide]
    );

    const handleDragStart = (index: number) => {
        setDraggedIndex(index);
    };

    const handleDragOver = (e: React.DragEvent, index: number) => {
        e.preventDefault();
        setDragOverIndex(index);
    };

    const handleDrop = (e: React.DragEvent, dropIndex: number) => {
        e.preventDefault();
        if (draggedIndex !== null && draggedIndex !== dropIndex) {
            onReorderSlides(draggedIndex, dropIndex);
        }
        setDraggedIndex(null);
        setDragOverIndex(null);
    };

    const handleDragEnd = () => {
        setDraggedIndex(null);
        setDragOverIndex(null);
    };

    return (
        <div
            className="h-full flex flex-col bg-zinc-950 border-r border-white/[0.06] editor-panel-shadow select-none"
            onKeyDown={handleKeyDown}
            tabIndex={0}
            role="listbox"
            aria-label={t('header')}
        >
            {/* Slide list - scrollable */}
            <div
                ref={listRef}
                className="flex-1 overflow-y-auto py-2 px-2 space-y-1.5 invisible-scrollbar"
            >
                {slides.map((slide, index) => {
                    const isSelected = slide.id === selectedSlideId;
                    const isDragging = draggedIndex === index;
                    const isDragOver = dragOverIndex === index && draggedIndex !== index;

                    return (
                        <div
                            key={slide.id}
                            ref={isSelected ? selectedRef : undefined}
                            draggable
                            onDragStart={() => handleDragStart(index)}
                            onDragOver={(e) => handleDragOver(e, index)}
                            onDrop={(e) => handleDrop(e, index)}
                            onDragEnd={handleDragEnd}
                            onClick={() => onSelectSlide(slide.id)}
                            role="option"
                            aria-selected={isSelected}
                            className={`group relative flex items-start gap-2 rounded-lg p-1.5 transition-all duration-150 cursor-pointer ${
                                isSelected
                                    ? 'bg-white/[0.04]'
                                    : 'hover:bg-white/[0.03]'
                            } ${isDragging ? 'opacity-30 scale-95' : ''} ${
                                isDragOver ? 'ring-1 ring-primary/50 ring-offset-1 ring-offset-zinc-950' : ''
                            }`}
                        >
                            {/* Slide Number */}
                            <div className="flex flex-col items-center gap-1 pt-1 shrink-0 w-5">
                                <span className={`text-[10px] font-bold tabular-nums ${
                                    isSelected ? 'text-zinc-300' : 'text-zinc-600'
                                }`}>
                                    {index + 1}
                                </span>
                                {/* Drag handle - visible on hover */}
                                <div className="opacity-0 group-hover:opacity-50 transition-opacity cursor-grab active:cursor-grabbing">
                                    <GripVertical size={10} className="text-zinc-500" />
                                </div>
                            </div>

                            {/* Thumbnail */}
                            <div
                                className={`flex-1 rounded-[4px] overflow-hidden border-2 transition-all duration-150 ${
                                    isSelected
                                        ? 'border-primary/80 shadow-[0_0_10px_rgba(234,88,12,0.15)]'
                                        : 'border-white/[0.06] group-hover:border-white/[0.12]'
                                }`}
                                style={{
                                    borderColor: isSelected ? primaryColor : undefined,
                                    boxShadow: isSelected ? `0 0 10px ${primaryColor}20` : undefined,
                                }}
                            >
                                <div className="aspect-[16/9] w-full bg-zinc-900 relative overflow-hidden">
                                    {/* Miniature slide preview */}
                                    <div
                                        className="absolute inset-0 flex flex-col justify-between p-2"
                                        style={{
                                            fontFamily: 'Inter, sans-serif',
                                        }}
                                    >
                                        {/* Top accent bar */}
                                        <div
                                            className="absolute top-0 left-0 right-0 h-[2px]"
                                            style={{ backgroundColor: primaryColor }}
                                        />

                                        {/* Background image (if layout is background) */}
                                        {slide.content_type === 'background' && slide.image?.url && (
                                            <>
                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                <img
                                                    src={slide.image.url}
                                                    alt=""
                                                    className="absolute inset-0 w-full h-full object-cover opacity-30"
                                                />
                                                <div className="absolute inset-0 bg-zinc-900/60" />
                                            </>
                                        )}

                                        {/* Content preview */}
                                        <div className="relative z-10 flex-1 min-h-0 overflow-hidden">
                                            {/* Left/Right image indicator */}
                                            {(slide.content_type === 'left' || slide.content_type === 'right') && slide.image?.url && (
                                                <div
                                                    className={`absolute top-0 ${slide.content_type === 'left' ? 'left-0' : 'right-0'} w-[40%] h-full opacity-30 overflow-hidden`}
                                                >
                                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                                    <img src={slide.image.url} alt="" className="w-full h-full object-cover" />
                                                </div>
                                            )}

                                            <h4 className="text-[7px] font-bold text-white leading-tight truncate mt-1">
                                                {slide.title || t('untitled')}
                                            </h4>
                                            <div className="space-y-0.5 mt-1">
                                                {slide.items.slice(0, 2).map((item, idx) => (
                                                    <div key={idx} className="flex items-center gap-0.5 text-[5px] text-zinc-400 truncate">
                                                        <div
                                                            className="w-1 h-1 rounded-full shrink-0"
                                                            style={{ backgroundColor: accentColor || '#06b6d4' }}
                                                        />
                                                        <span className="truncate">{item}</span>
                                                    </div>
                                                ))}
                                                {slide.items.length > 2 && (
                                                    <span className="text-[4px] text-zinc-600 font-semibold">
                                                        +{slide.items.length - 2}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Delete Button overlay */}
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onDeleteSlide(slide.id);
                                        }}
                                        className="absolute top-1 right-1 p-1 rounded bg-zinc-950/90 border border-white/[0.08] text-zinc-500 hover:text-red-400 hover:border-red-500/30 opacity-0 group-hover:opacity-100 transition-all duration-150 z-10"
                                        title={t('deleteTooltip')}
                                    >
                                        <Trash2 size={9} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Add Slide Button */}
            <div className="p-2 border-t border-white/[0.06]">
                <button
                    onClick={onAddSlide}
                    className="w-full py-2 rounded-lg bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] hover:border-white/[0.12] font-bold text-[10px] uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] text-zinc-400 hover:text-white"
                >
                    <Plus size={12} style={{ color: primaryColor }} />
                    <span>{t('addSlide')}</span>
                </button>
            </div>
        </div>
    );
}
