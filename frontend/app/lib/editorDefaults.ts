import type { PresentationSlide, PresentationMetadata } from '../types/presentation';
import { isSlideLayoutId } from './slideLayouts';

const SESSION_STORAGE_KEY = 'precue_generated_presentation';

export const DEFAULT_METADATA: PresentationMetadata = {
    title: 'PreCue.ai Presentation',
    theme: 'sunset',
    primary_color: '#f97316',
    accent_color: '#06b6d4',
    font_family: 'Inter, sans-serif'
};

export function normalizeSlides(slidesList: PresentationSlide[]): PresentationSlide[] {
    if (!slidesList) return [];
    return slidesList.map(slide => ({
        ...slide,
        content_type: isSlideLayoutId(slide.content_type) ? slide.content_type : 'standard'
    }));
}

export function buildLocalizedDefaultSlides(t: (key: string) => string): PresentationSlide[] {
    return [
        {
            id: 'slide-1',
            title: t('defaultSlides.slide1.title'),
            content_type: 'left',
            items: [
                t('defaultSlides.slide1.item1'),
                t('defaultSlides.slide1.item2'),
                t('defaultSlides.slide1.item3')
            ],
            image: {
                prompt: 'Conference stage with bright presentation screen',
                url: 'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?w=800&auto=format&fit=crop&q=80',
                alt: 'Conference stage'
            },
            speaker_note: t('defaultSlides.slide1.speakerNote')
        },
        {
            id: 'slide-2',
            title: t('defaultSlides.slide2.title'),
            content_type: 'right',
            items: [
                t('defaultSlides.slide2.item1'),
                t('defaultSlides.slide2.item2'),
                t('defaultSlides.slide2.item3')
            ],
            image: {
                prompt: 'Microphone on a dark conference stage',
                url: 'https://images.unsplash.com/photo-1475721027785-f74eccf877e2?w=800&auto=format&fit=crop&q=80',
                alt: 'Stage microphone'
            },
            speaker_note: t('defaultSlides.slide2.speakerNote')
        },
        {
            id: 'slide-3',
            title: t('defaultSlides.slide3.title'),
            content_type: 'left',
            items: [
                t('defaultSlides.slide3.item1'),
                t('defaultSlides.slide3.item2'),
                t('defaultSlides.slide3.item3')
            ],
            image: {
                prompt: 'Financial analytics and charts on a screen',
                url: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&auto=format&fit=crop&q=80',
                alt: 'Analytics metrics dashboard'
            },
            speaker_note: t('defaultSlides.slide3.speakerNote')
        },
        {
            id: 'slide-4',
            title: t('defaultSlides.slide4.title'),
            content_type: 'standard',
            items: [
                t('defaultSlides.slide4.item1'),
                t('defaultSlides.slide4.item2'),
                t('defaultSlides.slide4.item3')
            ],
            speaker_note: t('defaultSlides.slide4.speakerNote')
        },
        {
            id: 'slide-5',
            title: t('defaultSlides.slide5.title'),
            content_type: 'background',
            items: [
                t('defaultSlides.slide5.item1'),
                t('defaultSlides.slide5.item2'),
                t('defaultSlides.slide5.item3')
            ],
            image: {
                prompt: 'Silicon microchip with glowing gold elements',
                url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&auto=format&fit=crop&q=80',
                alt: 'Silicon microchip'
            },
            speaker_note: t('defaultSlides.slide5.speakerNote')
        }
    ];
}

interface StoredPresentation {
    slides?: PresentationSlide[];
    metadata?: PresentationMetadata;
}

/** Reads and parses the session-stored presentation once; previously each of
 * three initial-state hooks re-read and re-parsed the same key independently. */
export function readStoredPresentation(): StoredPresentation | null {
    if (typeof window === 'undefined') return null;
    const stored = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!stored) return null;
    try {
        const parsed = JSON.parse(stored);
        return parsed && parsed.slides && parsed.slides.length > 0 ? parsed : null;
    } catch (e) {
        console.error('Failed to parse stored presentation:', e);
        return null;
    }
}

export function writeStoredPresentation(state: StoredPresentation): void {
    sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(state));
}
