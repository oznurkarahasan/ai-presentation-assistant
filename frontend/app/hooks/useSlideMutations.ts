import { Dispatch, SetStateAction, useState } from 'react';
import type { PresentationSlide } from '../components/SlideList';
import type { PresentationMetadata } from '../components/RightStylePanel';
import type { SlideLayoutId } from '../lib/slideLayouts';
import type { UnsplashImage } from '../components/ImagePickerModal';
import type { ToastState } from './useToast';

/** Every handler that mutates the slide list, wired to auto-save on each change.
 * Centralized here since PresentationEditor previously defined all of these inline. */
export function useSlideMutations(
    slides: PresentationSlide[],
    setSlides: Dispatch<SetStateAction<PresentationSlide[]>>,
    metadata: PresentationMetadata,
    scheduleAutoSave: (slides: PresentationSlide[], metadata: PresentationMetadata) => void,
    selectedSlideId: string,
    setSelectedSlideId: Dispatch<SetStateAction<string>>,
    showToast: (type: ToastState['type'], message: string) => void,
    t: (key: string) => string,
) {
    const [imageModalOpen, setImageModalOpen] = useState(false);
    const [activeImageSearchSlideId, setActiveImageSearchSlideId] = useState<string | null>(null);

    const handleUpdateSlideTitle = (id: string, newTitle: string) => {
        setSlides((prev) => {
            const next = prev.map((s) => (s.id === id ? { ...s, title: newTitle } : s));
            scheduleAutoSave(next, metadata);
            return next;
        });
    };

    const handleUpdateSlideItem = (id: string, index: number, value: string) => {
        setSlides((prev) => {
            const next = prev.map((s) => {
                if (s.id !== id) return s;
                const nextItems = [...s.items];
                nextItems[index] = value;
                return { ...s, items: nextItems };
            });
            scheduleAutoSave(next, metadata);
            return next;
        });
    };

    const handleDeleteSlideItem = (id: string, index: number) => {
        setSlides((prev) => {
            const next = prev.map((s) => {
                if (s.id !== id) return s;
                return { ...s, items: s.items.filter((_, idx) => idx !== index) };
            });
            scheduleAutoSave(next, metadata);
            return next;
        });
    };

    const handleAddSlideItem = (id: string) => {
        setSlides((prev) => {
            const next = prev.map((s) => {
                if (s.id !== id) return s;
                return { ...s, items: [...s.items, t('misc.newBulletPoint')] };
            });
            scheduleAutoSave(next, metadata);
            return next;
        });
    };

    const handleUpdateSpeakerNote = (id: string, note: string) => {
        setSlides((prev) => {
            const next = prev.map((s) => (s.id === id ? { ...s, speaker_note: note } : s));
            scheduleAutoSave(next, metadata);
            return next;
        });
    };

    const handleUpdateLayoutType = (id: string, type: SlideLayoutId) => {
        setSlides((prev) => {
            const next = prev.map((s) => (s.id === id ? { ...s, content_type: type } : s));
            scheduleAutoSave(next, metadata);
            return next;
        });
    };

    const handleTriggerImageSearch = (id: string) => {
        setActiveImageSearchSlideId(id);
        setImageModalOpen(true);
    };

    const handleRemoveImage = (id: string) => {
        setSlides((prev) => {
            const next = prev.map((s) => (s.id === id ? { ...s, image: undefined } : s));
            scheduleAutoSave(next, metadata);
            return next;
        });
    };

    const handleSelectImage = (img: UnsplashImage) => {
        if (!activeImageSearchSlideId) return;

        setSlides((prev) => {
            const next = prev.map((s) => {
                if (s.id !== activeImageSearchSlideId) return s;
                return {
                    ...s,
                    image: { prompt: img.alt, url: img.url, alt: img.alt, style: 'modern' }
                };
            });
            scheduleAutoSave(next, metadata);
            return next;
        });

        setImageModalOpen(false);
        setActiveImageSearchSlideId(null);
    };

    const handleAddSlide = () => {
        const newId = `slide-${Date.now()}`;
        const newSlide: PresentationSlide = {
            id: newId,
            title: t('misc.newSlideTitle'),
            content_type: 'standard',
            items: [t('misc.newSlideDescription')],
            speaker_note: ''
        };

        setSlides((prev) => {
            const next = [...prev, newSlide];
            scheduleAutoSave(next, metadata);
            return next;
        });
        setSelectedSlideId(newId);
    };

    const handleDeleteSlide = (id: string) => {
        if (slides.length <= 1) {
            showToast('error', t('notifications.cannotDeleteLastSlide'));
            return;
        }

        const nextSlides = slides.filter((s) => s.id !== id);
        setSlides(nextSlides);
        scheduleAutoSave(nextSlides, metadata);

        if (selectedSlideId === id) {
            setSelectedSlideId(nextSlides[0].id);
        }
    };

    const handleReorderSlides = (dragIndex: number, dropIndex: number) => {
        const nextSlides = [...slides];
        const [draggedItem] = nextSlides.splice(dragIndex, 1);
        nextSlides.splice(dropIndex, 0, draggedItem);
        setSlides(nextSlides);
        scheduleAutoSave(nextSlides, metadata);
    };

    return {
        imageModalOpen,
        closeImageModal: () => setImageModalOpen(false),
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
    };
}
