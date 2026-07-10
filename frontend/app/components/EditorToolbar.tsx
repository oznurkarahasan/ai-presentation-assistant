'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
    ChevronLeft,
    Download,
    Sparkles,
    ChevronRight,
    PanelLeft,
    PanelRight,
    Cloud,
    CloudOff,
    Loader2,
    Check,
    HelpCircle,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import LanguageSwitcher from './LanguageSwitcher';
import { SLIDE_LAYOUT_IDS, SLIDE_LAYOUT_ICONS, SlideLayoutId } from '../lib/slideLayouts';

interface EditorToolbarProps {
    title: string;
    onTitleChange: (title: string) => void;
    // Layout
    activeLayout: SlideLayoutId;
    onLayoutChange: (layout: SlideLayoutId) => void;
    // Actions
    onDownloadPPTX: () => void;
    onSendToAnalysis: () => void;
    isSaving: boolean;
    isDownloading: boolean;
    autoSaveStatus: 'idle' | 'saving' | 'saved' | 'error';
    // Panel toggles
    isLeftPanelOpen: boolean;
    isRightPanelOpen: boolean;
    onToggleLeftPanel: () => void;
    onToggleRightPanel: () => void;
    // Theme
    primaryColor: string;
}

export default function EditorToolbar({
    title,
    onTitleChange,
    activeLayout,
    onLayoutChange,
    onDownloadPPTX,
    onSendToAnalysis,
    isSaving,
    isDownloading,
    autoSaveStatus,
    isLeftPanelOpen,
    isRightPanelOpen,
    onToggleLeftPanel,
    onToggleRightPanel,
    primaryColor,
}: EditorToolbarProps) {
    const router = useRouter();
    const t = useTranslations('aiGeneration');
    const tCanvas = useTranslations('editor.canvas');
    const tSettings = useTranslations('editor.settings');
    const tToolbar = useTranslations('editor.toolbar');
    const tMisc = useTranslations('editor.misc');

    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [editTitle, setEditTitle] = useState(title);
    const titleInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setEditTitle(title);
    }, [title]);

    useEffect(() => {
        if (isEditingTitle && titleInputRef.current) {
            titleInputRef.current.focus();
            titleInputRef.current.select();
        }
    }, [isEditingTitle]);

    const handleTitleSubmit = () => {
        const trimmed = editTitle.trim();
        if (trimmed) {
            onTitleChange(trimmed);
        } else {
            setEditTitle(title);
        }
        setIsEditingTitle(false);
    };

    const handleTitleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleTitleSubmit();
        } else if (e.key === 'Escape') {
            setEditTitle(title);
            setIsEditingTitle(false);
        }
    };

    const layoutLabelKeys: Record<SlideLayoutId, string> = {
        standard: 'layoutText',
        left: 'layoutLeft',
        right: 'layoutRight',
        background: 'layoutBg',
    };
    const layouts = SLIDE_LAYOUT_IDS.map((id) => ({
        id,
        label: tCanvas(layoutLabelKeys[id]),
        icon: SLIDE_LAYOUT_ICONS[id],
    }));

    return (
        <header className="h-12 border-b border-white/[0.06] bg-zinc-950/90 backdrop-blur-lg flex items-center justify-between px-3 z-30 select-none shrink-0 w-full gap-2">
            {/* Left Section: Back + Brand + Title */}
            <div className="flex items-center gap-2 min-w-0 flex-shrink">
                {/* Back Button */}
                <button
                    onClick={() => router.push('/dashboard?tab=ai-presentation')}
                    className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-white/[0.06] transition-colors text-zinc-400 hover:text-white shrink-0"
                    title={t('backToLibrary')}
                >
                    <ChevronLeft size={16} />
                </button>

                {/* Brand Badge */}
                <span className="text-[9px] font-black italic tracking-wider text-primary uppercase bg-primary/10 px-1.5 py-0.5 rounded-md border border-primary/20 shrink-0 hidden sm:inline-flex">
                    PRECUE
                </span>

                {/* Divider */}
                <div className="h-4 w-px bg-white/[0.08] shrink-0 hidden sm:block" />

                {/* Editable Title */}
                <div className="min-w-0 flex-shrink">
                    {isEditingTitle ? (
                        <input
                            ref={titleInputRef}
                            type="text"
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            onBlur={handleTitleSubmit}
                            onKeyDown={handleTitleKeyDown}
                            className="bg-white/[0.06] border border-white/10 rounded-lg px-2.5 py-1 text-xs font-semibold text-white outline-none focus:border-primary/50 w-full max-w-[220px] transition-colors"
                        />
                    ) : (
                        <button
                            onClick={() => setIsEditingTitle(true)}
                            className="text-xs font-semibold text-zinc-300 hover:text-white truncate max-w-[220px] block transition-colors px-1 py-0.5 rounded hover:bg-white/[0.04]"
                            title={title}
                        >
                            {title}
                        </button>
                    )}
                </div>

                {/* Auto-save Indicator */}
                <div className="flex items-center gap-1 shrink-0 ml-1">
                    {autoSaveStatus === 'saving' && (
                        <div className="flex items-center gap-1 text-zinc-500">
                            <Loader2 size={11} className="animate-spin" />
                        </div>
                    )}
                    {autoSaveStatus === 'saved' && (
                        <div className="flex items-center gap-1 text-green-500/70">
                            <Cloud size={11} />
                            <Check size={9} />
                        </div>
                    )}
                    {autoSaveStatus === 'error' && (
                        <div className="flex items-center gap-1 text-red-400/70">
                            <CloudOff size={11} />
                        </div>
                    )}
                </div>
            </div>

            {/* Center Section: Layout Selector (always reachable — icon-only on narrow screens) */}
            <div className="flex items-center gap-0.5 bg-zinc-900/80 border border-white/[0.06] p-0.5 rounded-lg shrink-0">
                {layouts.map((layout) => (
                    <button
                        key={layout.id}
                        onClick={() => onLayoutChange(layout.id)}
                        title={layout.label}
                        className={`px-1.5 md:px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all duration-150 ${
                            activeLayout === layout.id
                                ? 'text-white shadow-sm'
                                : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.04]'
                        }`}
                        style={{
                            backgroundColor: activeLayout === layout.id ? primaryColor : undefined,
                        }}
                    >
                        <span className="md:hidden">{layout.icon}</span>
                        <span className="hidden md:inline">{layout.label}</span>
                    </button>
                ))}
            </div>

            {/* Right Section: Actions */}
            <div className="flex items-center gap-1 shrink-0">
                {/* Toggle Left Panel */}
                <button
                    onClick={onToggleLeftPanel}
                    className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                        isLeftPanelOpen
                            ? 'text-zinc-300 hover:bg-white/[0.06]'
                            : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.06]'
                    }`}
                    title={isLeftPanelOpen ? tToolbar('hideSlides') : tToolbar('showSlides')}
                >
                    <PanelLeft size={16} />
                </button>

                {/* Toggle Right Panel */}
                <button
                    onClick={onToggleRightPanel}
                    className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                        isRightPanelOpen
                            ? 'text-zinc-300 hover:bg-white/[0.06]'
                            : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.06]'
                    }`}
                    title={isRightPanelOpen ? tToolbar('hideProperties') : tToolbar('showProperties')}
                >
                    <PanelRight size={16} />
                </button>

                <div className="h-4 w-px bg-white/[0.08] mx-0.5 hidden sm:block" />

                {/* Download PPTX */}
                <button
                    onClick={onDownloadPPTX}
                    disabled={isDownloading}
                    className="h-8 px-2.5 rounded-lg flex items-center gap-1.5 text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-all text-[10px] font-bold uppercase tracking-wider disabled:opacity-40 disabled:pointer-events-none"
                >
                    {isDownloading ? (
                        <Loader2 size={13} className="animate-spin" />
                    ) : (
                        <Download size={13} />
                    )}
                    <span className="hidden lg:inline">{tSettings('downloadPptx')}</span>
                </button>

                {/* Send to Analysis */}
                <button
                    onClick={onSendToAnalysis}
                    disabled={isSaving}
                    className="h-8 px-3 rounded-lg flex items-center gap-1.5 text-white transition-all text-[10px] font-bold uppercase tracking-wider disabled:opacity-50 disabled:pointer-events-none shadow-sm"
                    style={{ backgroundColor: primaryColor }}
                >
                    {isSaving ? (
                        <Loader2 size={13} className="animate-spin" />
                    ) : (
                        <Sparkles size={13} />
                    )}
                    <span className="hidden lg:inline">{tSettings('sendToAnalysis')}</span>
                    <ChevronRight size={12} className="text-white/70 hidden lg:block" />
                </button>

                <div className="h-4 w-px bg-white/[0.08] mx-0.5 hidden sm:block" />

                {/* Language Switcher */}
                <div className="hidden sm:block">
                    <LanguageSwitcher />
                </div>

                {/* Help */}
                <button
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.06] transition-colors"
                    title={tMisc('help')}
                >
                    <HelpCircle size={15} />
                </button>
            </div>
        </header>
    );
}
