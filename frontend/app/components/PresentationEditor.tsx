'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import SlideList, { PresentationSlide } from './SlideList';
import SlideCanvas from './SlideCanvas';
import RightStylePanel, { PresentationMetadata } from './RightStylePanel';
import EditorToolbar from './EditorToolbar';
import EditorStatusBar from './EditorStatusBar';
import EditorToast from './EditorToast';
import ImagePickerModal from './ImagePickerModal';
import client from '../api/client';
import {
    DEFAULT_METADATA,
    DEFAULT_SLIDES,
    buildLocalizedDefaultSlides,
    normalizeSlides,
    readStoredPresentation,
} from '../lib/editorDefaults';
import { useAutoSave } from '../hooks/useAutoSave';
import { useToast } from '../hooks/useToast';
import { useZoomFullscreen } from '../hooks/useZoomFullscreen';
import { useSlideMutations } from '../hooks/useSlideMutations';

const ACTIVE_PRESENTATION_ID_KEY = 'precue_active_presentation_id';

export default function PresentationEditor() {
    const router = useRouter();
    const t = useTranslations('editor');

    // Read session storage once; the three initial states below all derive from it.
    const storedPresentation = useMemo(() => readStoredPresentation(), []);

    const [slides, setSlides] = useState<PresentationSlide[]>(() =>
        storedPresentation?.slides ? normalizeSlides(storedPresentation.slides) : DEFAULT_SLIDES
    );
    const [selectedSlideId, setSelectedSlideId] = useState<string>(() =>
        storedPresentation?.slides?.[0]?.id ?? 'slide-1'
    );
    const [metadata, setMetadata] = useState<PresentationMetadata>(() =>
        storedPresentation?.metadata ?? DEFAULT_METADATA
    );

    // Nothing was in session storage, so swap in translated default slides
    // once `t` is ready (translations aren't available during lazy init above).
    useEffect(() => {
        if (storedPresentation) return;
        setSlides(buildLocalizedDefaultSlides(t));
        setMetadata(prev => ({ ...prev, title: t('misc.defaultTitle') }));
    }, [t, storedPresentation]);

    const { autoSaveStatus, scheduleAutoSave, persistToServer } = useAutoSave();
    const { toast, showToast } = useToast();
    const {
        zoom,
        setZoom,
        isFullscreen,
        handleZoomIn,
        handleZoomOut,
        handleZoomFit,
        handleToggleFullscreen,
    } = useZoomFullscreen();

    const [isSaving, setIsSaving] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [saveProgress, setSaveProgress] = useState<string>('');
    const [showSaveOverlay, setShowSaveOverlay] = useState(false);

    const [isLeftPanelOpen, setIsLeftPanelOpen] = useState(true);
    const [isRightPanelOpen, setIsRightPanelOpen] = useState(true);
    const [isNotesOpen, setIsNotesOpen] = useState(true);

    const activeSlide = slides.find((s) => s.id === selectedSlideId) || slides[0];

    const {
        imageModalOpen,
        closeImageModal,
        handleUpdateSlideTitle,
        handleUpdateSlideItem,
        handleDeleteSlideItem,
        handleAddSlideItem,
        handleUpdateSpeakerNote,
        handleUpdateLayoutType,
        handleTriggerImageSearch,
        handleRemoveImage,
        handleSelectImage,
        handleAddSlide,
        handleDeleteSlide,
        handleReorderSlides,
    } = useSlideMutations(slides, setSlides, metadata, scheduleAutoSave, selectedSlideId, setSelectedSlideId, showToast, t);

    const handleUpdateMetadataWithSave = (newMeta: PresentationMetadata) => {
        setMetadata(newMeta);
        scheduleAutoSave(slides, newMeta);
    };

    const handleDownloadPPTX = async () => {
        const presentationId = typeof window !== 'undefined'
            ? sessionStorage.getItem(ACTIVE_PRESENTATION_ID_KEY)
            : null;

        if (!presentationId) {
            showToast('error', t('notifications.saveRequiredError'));
            return;
        }

        setIsDownloading(true);
        try {
            // First save current state, then export
            await persistToServer(slides, metadata);
            const response = await client.get(`/api/v1/presentations/${presentationId}/export-pptx`, {
                responseType: 'blob',
            });
            const url = URL.createObjectURL(response.data);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${metadata.title.replace(/[^a-zA-Z0-9\s]/g, '').trim() || 'presentation'}.pptx`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            showToast('success', t('notifications.downloadSuccess'));
        } catch {
            showToast('error', t('notifications.downloadError') || 'PPTX export failed.');
        } finally {
            setIsDownloading(false);
        }
    };

    const handleSendToAnalysis = () => {
        const activePresentationId = typeof window !== 'undefined'
            ? sessionStorage.getItem(ACTIVE_PRESENTATION_ID_KEY)
            : null;

        if (!activePresentationId) {
            showToast('error', t('notifications.saveRequiredError'));
            return;
        }

        setIsSaving(true);
        setShowSaveOverlay(true);

        const steps = [
            t('notifications.savingChanges'),
            t('notifications.updatingVectorDb'),
            t('notifications.preparingSpeakerRag'),
            t('notifications.configuringRehearsal'),
            t('notifications.redirectingToAnalysis')
        ];

        let currentStep = 0;
        setSaveProgress(steps[0]);

        const interval = setInterval(() => {
            currentStep += 1;
            if (currentStep < steps.length) {
                setSaveProgress(steps[currentStep]);
            } else {
                clearInterval(interval);
                setIsSaving(false);
                setShowSaveOverlay(false);
                router.push(`/analyze?id=${activePresentationId}`);
            }
        }, 1200);
    };

    return (
        <div className="w-full h-full flex flex-col relative select-none bg-zinc-950 overflow-hidden">
            {/* Top Toolbar */}
            <EditorToolbar
                title={metadata.title}
                onTitleChange={(title) => handleUpdateMetadataWithSave({ ...metadata, title })}
                activeLayout={activeSlide.content_type}
                onLayoutChange={(layout) => handleUpdateLayoutType(activeSlide.id, layout)}
                onDownloadPPTX={handleDownloadPPTX}
                onSendToAnalysis={handleSendToAnalysis}
                isSaving={isSaving}
                isDownloading={isDownloading}
                autoSaveStatus={autoSaveStatus}
                isLeftPanelOpen={isLeftPanelOpen}
                isRightPanelOpen={isRightPanelOpen}
                onToggleLeftPanel={() => setIsLeftPanelOpen(prev => !prev)}
                onToggleRightPanel={() => setIsRightPanelOpen(prev => !prev)}
                primaryColor={metadata.primary_color}
            />

            {/* Main Editor Area */}
            <div className="flex-1 flex overflow-hidden">
                {/* Left Panel: Slide Thumbnails */}
                {isLeftPanelOpen && (
                    <div className="w-[200px] xl:w-[220px] shrink-0 editor-panel">
                        <SlideList
                            slides={slides}
                            selectedSlideId={selectedSlideId}
                            onSelectSlide={setSelectedSlideId}
                            onDeleteSlide={handleDeleteSlide}
                            onAddSlide={handleAddSlide}
                            onReorderSlides={handleReorderSlides}
                            primaryColor={metadata.primary_color}
                            accentColor={metadata.accent_color}
                        />
                    </div>
                )}

                {/* Middle: Canvas + Status Bar */}
                <div className="flex-1 flex flex-col min-w-0">
                    <SlideCanvas
                        slide={activeSlide}
                        primaryColor={metadata.primary_color}
                        accentColor={metadata.accent_color}
                        fontFamily={metadata.font_family}
                        zoom={zoom}
                        onUpdateSlideTitle={handleUpdateSlideTitle}
                        onUpdateSlideItem={handleUpdateSlideItem}
                        onDeleteSlideItem={handleDeleteSlideItem}
                        onAddSlideItem={handleAddSlideItem}
                        onUpdateSpeakerNote={handleUpdateSpeakerNote}
                        onTriggerImageSearch={handleTriggerImageSearch}
                        onRemoveImage={handleRemoveImage}
                        isNotesOpen={isNotesOpen}
                        onToggleNotes={() => setIsNotesOpen(prev => !prev)}
                    />
                    <EditorStatusBar
                        currentSlide={slides.findIndex(s => s.id === selectedSlideId) + 1}
                        totalSlides={slides.length}
                        zoom={zoom}
                        onZoomChange={setZoom}
                        onZoomIn={handleZoomIn}
                        onZoomOut={handleZoomOut}
                        onZoomFit={handleZoomFit}
                        isNotesOpen={isNotesOpen}
                        onToggleNotes={() => setIsNotesOpen(prev => !prev)}
                        isFullscreen={isFullscreen}
                        onToggleFullscreen={handleToggleFullscreen}
                    />
                </div>

                {/* Right Panel: Properties */}
                {isRightPanelOpen && (
                    <div className="w-[260px] xl:w-[280px] shrink-0 editor-panel">
                        <RightStylePanel
                            metadata={metadata}
                            onUpdateMetadata={handleUpdateMetadataWithSave}
                            activeSlideTitle={activeSlide.title}
                            activeSlideLayout={activeSlide.content_type}
                            activeSlideNote={activeSlide.speaker_note}
                            onUpdateSlideLayout={(layout) => handleUpdateLayoutType(activeSlide.id, layout)}
                            onUpdateSlideNote={(note) => handleUpdateSpeakerNote(activeSlide.id, note)}
                        />
                    </div>
                )}
            </div>

            {/* Save Overlay / Loader */}
            <AnimatePresence>
                {showSaveOverlay && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/85 flex items-center justify-center z-50 backdrop-blur-md"
                    >
                        <div className="text-center space-y-6 max-w-sm px-6">
                            {/* Glowing Spinner */}
                            <div className="relative w-16 h-16 mx-auto">
                                <div className="absolute inset-0 rounded-full border-2 border-white/5" />
                                <motion.div
                                    animate={{ rotate: 360 }}
                                    transition={{ repeat: Infinity, duration: 1.2, ease: "linear" }}
                                    className="absolute inset-0 rounded-full border-2 border-t-primary border-r-transparent border-b-transparent border-l-transparent"
                                    style={{ borderColor: metadata.primary_color, borderTopColor: metadata.primary_color }}
                                />
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-sm font-black italic uppercase tracking-wider text-zinc-100">{t('notifications.preparingPresentation')}</h3>
                                <p className="text-xs text-zinc-400 font-medium h-4">{saveProgress}</p>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <ImagePickerModal
                open={imageModalOpen}
                onClose={closeImageModal}
                onSelectImage={handleSelectImage}
                primaryColor={metadata.primary_color}
            />

            <EditorToast toast={toast} />
        </div>
    );
}
