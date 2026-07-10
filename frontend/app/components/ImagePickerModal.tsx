'use client';
/* eslint-disable @next/next/no-img-element */

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Grid, AlertCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import client from '../api/client';
import Spinner from './Spinner';

// Curated image catalog is served by the backend (single source of truth
// shared with generation_service.UNSPLASH_IMAGE_DATABASE) via /image-library.
export interface UnsplashImage {
    url: string;
    alt: string;
    keywords: string[];
    author?: string | null;
}

const POPULAR_CATEGORIES = ['technology', 'ai', 'business', 'design', 'stage', 'abstract'];

interface ImagePickerModalProps {
    open: boolean;
    onClose: () => void;
    onSelectImage: (image: UnsplashImage) => void;
    primaryColor: string;
}

export default function ImagePickerModal({ open, onClose, onSelectImage, primaryColor }: ImagePickerModalProps) {
    const t = useTranslations('editor');
    const [searchQuery, setSearchQuery] = useState('');
    const [imageLibrary, setImageLibrary] = useState<UnsplashImage[]>([]);
    const [isImageLibraryLoading, setIsImageLibraryLoading] = useState(true);

    // Reset the search box each time the picker is opened (e.g. for a new slide).
    // Adjusted during render rather than in an effect, per React's guidance on
    // resetting state in response to a prop change.
    const [prevOpen, setPrevOpen] = useState(open);
    if (open !== prevOpen) {
        setPrevOpen(open);
        if (open) setSearchQuery('');
    }

    // Fetch the curated image catalog once, the first time the picker is opened
    useEffect(() => {
        if (!open || imageLibrary.length > 0) return;
        client
            .get('/api/v1/presentations/image-library')
            .then((res) => setImageLibrary(res.data))
            .catch((e) => console.error('Failed to load image library:', e))
            .finally(() => setIsImageLibraryLoading(false));
    }, [open, imageLibrary.length]);

    const filteredImages = React.useMemo(() => {
        if (!searchQuery.trim()) {
            return imageLibrary;
        }

        const query = searchQuery.toLowerCase().trim();
        return imageLibrary.filter((img) =>
            img.alt.toLowerCase().includes(query) ||
            img.keywords.some((kw) => kw.toLowerCase().includes(query)) ||
            (img.author || '').toLowerCase().includes(query)
        );
    }, [imageLibrary, searchQuery]);

    return (
        <AnimatePresence>
            {open && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-md p-4"
                >
                    <motion.div
                        initial={{ scale: 0.95, y: 15 }}
                        animate={{ scale: 1, y: 0 }}
                        exit={{ scale: 0.95, y: 15 }}
                        className="bg-zinc-950 border border-white/10 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden shadow-2xl"
                    >
                        {/* Modal Header */}
                        <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Grid size={15} className="text-primary" style={{ color: primaryColor }} />
                                <div>
                                    <h3 className="text-xs font-black uppercase tracking-widest text-white">{t('notifications.unsplashHeader')}</h3>
                                    <p className="text-[10px] text-zinc-500 font-medium mt-0.5">{t('notifications.unsplashSubtitle')}</p>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-1.5 rounded-lg hover:bg-white/5 text-zinc-400 hover:text-white transition-colors"
                            >
                                <X size={15} />
                            </button>
                        </div>

                        {/* Search bar */}
                        <div className="p-4 border-b border-white/5 bg-zinc-900/20">
                            <div className="relative">
                                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" size={15} />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder={t('notifications.searchImagesPlaceholder')}
                                    className="w-full bg-zinc-900 border border-white/5 hover:border-white/10 focus:border-primary/50 focus:outline-none py-3.5 pl-10 pr-4 rounded-xl text-xs font-medium text-white placeholder-zinc-600 transition-all"
                                />
                                {searchQuery && (
                                    <button
                                        onClick={() => setSearchQuery('')}
                                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors"
                                    >
                                        <X size={12} />
                                    </button>
                                )}
                            </div>

                            {/* Curated suggestion chips */}
                            <div className="flex flex-wrap items-center gap-1.5 mt-3">
                                <span className="text-[9px] font-black uppercase tracking-wider text-zinc-500 mr-1.5">{t('notifications.popular')}</span>
                                {POPULAR_CATEGORIES.map((term) => {
                                    const localizedTerm = t(`categories.${term}`);
                                    return (
                                        <button
                                            key={term}
                                            onClick={() => setSearchQuery(term)}
                                            className="px-2.5 py-1 rounded-md bg-zinc-900 border border-white/5 hover:border-white/10 text-[9px] font-bold text-zinc-400 hover:text-white transition-all"
                                        >
                                            {localizedTerm}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Search Results Grid */}
                        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                            {isImageLibraryLoading ? (
                                <div className="flex flex-col items-center justify-center py-16 text-center">
                                    <Spinner size={24} borderColorClassName="border-zinc-500" className="mb-3" />
                                    <p className="text-xs font-bold text-zinc-400">{t('notifications.loadingImages')}</p>
                                </div>
                            ) : filteredImages.length > 0 ? (
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                    {filteredImages.map((img) => (
                                        <div
                                            key={img.url}
                                            onClick={() => onSelectImage(img)}
                                            className="group relative aspect-[16/10] rounded-xl overflow-hidden cursor-pointer border border-white/5 hover:border-primary/40 transition-all duration-300 shadow-md"
                                        >
                                            <img
                                                src={img.url}
                                                alt={img.alt}
                                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                                loading="lazy"
                                            />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 p-3 flex flex-col justify-end">
                                                <p className="text-[10px] font-bold text-white line-clamp-1">{img.alt}</p>
                                                <p className="text-[8px] text-zinc-400 mt-0.5">{t('notifications.photoAuthor', { author: img.author || 'Unsplash' })}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-16 text-center">
                                    <AlertCircle size={24} className="text-zinc-600 mb-3" />
                                    <p className="text-xs font-bold text-zinc-400">{t('notifications.imagesNotFound')}</p>
                                    <p className="text-[10px] text-zinc-500 mt-1">{t('notifications.tryDifferentKeywords')}</p>
                                </div>
                            )}
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
