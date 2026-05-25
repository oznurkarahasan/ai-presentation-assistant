'use client';

import { useRef, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search } from "lucide-react";
import { SavedTopicIdea } from "../DashboardContext";

export default function IdeasDropdownSearch({
    ideas,
    onSelect,
    searchPlaceholder,
    noIdeasText,
    noResultsText,
}: {
    ideas: SavedTopicIdea[];
    onSelect: (idea: SavedTopicIdea) => void;
    searchPlaceholder: string;
    noIdeasText: string;
    noResultsText: string;
}) {
    const [query, setQuery] = useState('');
    const [open, setOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    const filtered = query.trim()
        ? ideas.filter(i => i.title.toLowerCase().includes(query.toLowerCase()))
        : ideas;

    useEffect(() => {
        const handle = (e: MouseEvent) => {
            if (!wrapperRef.current?.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', handle);
        return () => document.removeEventListener('mousedown', handle);
    }, []);

    return (
        <div ref={wrapperRef} className="relative w-full sm:w-72">
            <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" size={16} />
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onFocus={() => setOpen(true)}
                    placeholder={searchPlaceholder}
                    className="w-full rounded-full border border-white/5 bg-[#101010] py-2.5 pl-11 pr-6 text-sm focus:border-primary/50 focus:outline-none placeholder:text-zinc-600 text-white"
                />
            </div>

            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 top-full mt-2 z-50 w-80 rounded-2xl border border-white/10 bg-[#111] shadow-2xl overflow-hidden"
                    >
                        {filtered.length > 0 ? (
                            <div className="max-h-72 overflow-y-auto invisible-scrollbar divide-y divide-white/5">
                                {filtered.map((idea, i) => (
                                    <button
                                        key={i}
                                        type="button"
                                        onClick={() => {
                                            onSelect(idea);
                                            setOpen(false);
                                            setQuery('');
                                        }}
                                        className="w-full text-left px-4 py-3 hover:bg-white/[0.04] transition-colors"
                                    >
                                        <p className="text-sm font-semibold text-white truncate">{idea.title}</p>
                                        <p className="text-xs text-zinc-500 mt-0.5 truncate">{idea.angle}</p>
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <div className="px-4 py-8 text-center text-sm text-zinc-600">
                                {ideas.length === 0 ? noIdeasText : noResultsText}
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
