'use client';
/* eslint-disable @next/next/no-img-element */

import { ChevronLeft, ChevronRight } from 'lucide-react';
import Spinner from './Spinner';
import type { PresentationSlide } from '../types/presentation';

interface AiSlidePreviewProps {
    slide: PresentationSlide | undefined;
    primaryColor: string;
    accentColor: string;
    currentPage: number;
    totalPages: number;
    onPrev?: () => void;
    onNext?: () => void;
    isLoading?: boolean;
    showNav?: boolean;
}

function SlideContent({
    slide,
    primaryColor,
    accentColor,
    currentPage,
    totalPages,
    isLoading,
}: {
    slide: PresentationSlide;
    primaryColor: string;
    accentColor: string;
    currentPage: number;
    totalPages: number;
    isLoading: boolean;
}) {
    const hasImage = !!(slide.image?.url);
    const isLeft = slide.content_type === 'left' && hasImage;
    const isRight = slide.content_type === 'right' && hasImage;
    const isBg = slide.content_type === 'background' && hasImage;

    return (
        <div className="absolute inset-0 flex">
            {/* Top accent bar */}
            <div className="absolute top-0 left-0 right-0 z-20" style={{ height: '3px', backgroundColor: primaryColor }} />

            {/* Background image */}
            {isBg && slide.image?.url && (
                <>
                    <img src={slide.image.url} alt={slide.image.alt || ''} className="absolute inset-0 w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/65 z-10" />
                </>
            )}

            {/* Left image */}
            {isLeft && slide.image?.url && (
                <div className="w-[44%] relative overflow-hidden shrink-0">
                    <img src={slide.image.url} alt={slide.image.alt || ''} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent to-[#050507]/70" />
                </div>
            )}

            {/* Content area */}
            <div className="flex flex-col justify-center p-5 md:p-8 flex-1 relative z-10 min-w-0 overflow-hidden">
                <h2 className="text-xl md:text-2xl font-black text-white mb-2 md:mb-3 leading-tight line-clamp-2">
                    {slide.title}
                </h2>
                <div className="h-0.5 w-10 mb-3 md:mb-4 shrink-0" style={{ backgroundColor: primaryColor }} />
                <ul className="space-y-1.5 md:space-y-2.5 overflow-y-auto">
                    {slide.items.map((item, i) => (
                        <li key={i} className="flex items-start gap-2">
                            <span className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: accentColor }} />
                            <span className="text-xs md:text-sm text-zinc-300 leading-relaxed">{item}</span>
                        </li>
                    ))}
                </ul>
            </div>

            {/* Right image */}
            {isRight && slide.image?.url && (
                <div className="w-[44%] relative overflow-hidden shrink-0">
                    <img src={slide.image.url} alt={slide.image.alt || ''} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-l from-transparent to-[#050507]/70" />
                </div>
            )}

            {/* Slide number */}
            <div className="absolute bottom-2 right-3 text-[9px] font-bold text-zinc-600 z-20 tabular-nums">
                {currentPage} / {totalPages}
            </div>

            {/* Loading overlay */}
            {isLoading && (
                <div className="absolute inset-0 bg-[#050505]/70 flex items-center justify-center z-30">
                    <Spinner size={28} colorHex={primaryColor} />
                </div>
            )}
        </div>
    );
}

export default function AiSlidePreview({
    slide,
    primaryColor,
    accentColor,
    currentPage,
    totalPages,
    onPrev,
    onNext,
    isLoading = false,
    showNav = true,
}: AiSlidePreviewProps) {
    if (!slide) return null;

    if (!showNav) {
        return (
            <div className="absolute inset-0 bg-[#050507]">
                <SlideContent
                    slide={slide}
                    primaryColor={primaryColor}
                    accentColor={accentColor}
                    currentPage={currentPage}
                    totalPages={totalPages}
                    isLoading={isLoading}
                />
            </div>
        );
    }

    return (
        <div className="w-full h-full flex flex-col items-center justify-center p-3 md:p-5 gap-3">
            {/* 16:9 Slide card */}
            <div
                className="relative w-full rounded-xl overflow-hidden border border-white/5 shadow-2xl bg-[#050507]"
                style={{ aspectRatio: '16/9', maxHeight: 'calc(100% - 3rem)' }}
            >
                <SlideContent
                    slide={slide}
                    primaryColor={primaryColor}
                    accentColor={accentColor}
                    currentPage={currentPage}
                    totalPages={totalPages}
                    isLoading={isLoading}
                />
            </div>

            {/* Navigation */}
            <div className="flex items-center gap-3 shrink-0">
                <button
                    onClick={onPrev}
                    disabled={currentPage <= 1}
                    className="p-2 rounded-lg bg-zinc-900 border border-white/5 hover:bg-zinc-800 disabled:opacity-30 transition-all text-zinc-300"
                >
                    <ChevronLeft size={14} />
                </button>
                <span className="text-xs text-zinc-500 font-bold tabular-nums">{currentPage} / {totalPages}</span>
                <button
                    onClick={onNext}
                    disabled={currentPage >= totalPages}
                    className="p-2 rounded-lg bg-zinc-900 border border-white/5 hover:bg-zinc-800 disabled:opacity-30 transition-all text-zinc-300"
                >
                    <ChevronRight size={14} />
                </button>
            </div>
        </div>
    );
}
