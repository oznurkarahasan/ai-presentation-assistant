'use client';
/* eslint-disable @next/next/no-img-element */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Grid, AlertCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import SlideList, { PresentationSlide } from './SlideList';
import SlideCanvas from './SlideCanvas';
import RightStylePanel, { PresentationMetadata } from './RightStylePanel';
import EditorToolbar from './EditorToolbar';
import EditorStatusBar from './EditorStatusBar';
import { useRouter } from 'next/navigation';
import client from '../api/client';

// Mass database of curated high-quality Unsplash image assets
interface UnsplashImage {
    url: string;
    alt: string;
    categories: string[];
    author: string;
}

const IMAGE_DATABASE: UnsplashImage[] = [
    // Technology
    {
        url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&auto=format&fit=crop&q=80',
        alt: 'Silicon microchip with glowing gold elements',
        categories: ['technology', 'teknoloji', 'ai', 'cyber', 'yapay zeka'],
        author: 'Nicolas Thomas'
    },
    {
        url: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800&auto=format&fit=crop&q=80',
        alt: 'Digital binary matrix computer code on screen',
        categories: ['technology', 'teknoloji', 'data', 'veri', 'cyber'],
        author: 'Markus Spiske'
    },
    {
        url: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=800&auto=format&fit=crop&q=80',
        alt: 'Robotic hand gesturing in front of holographic UI',
        categories: ['technology', 'teknoloji', 'ai', 'yapay zeka', 'robotics'],
        author: 'Alex Knight'
    },
    // Business
    {
        url: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800&auto=format&fit=crop&q=80',
        alt: 'Modern workspace setup with laptop and graphs',
        categories: ['business', 'iş', 'office', 'ofis', 'success', 'başarı'],
        author: 'Campaign Creators'
    },
    {
        url: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&auto=format&fit=crop&q=80',
        alt: 'Financial analytics on laptop screen with warm lighting',
        categories: ['business', 'iş', 'data', 'veri', 'analytics', 'analiz'],
        author: 'Carlos Muza'
    },
    {
        url: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=800&auto=format&fit=crop&q=80',
        alt: 'Team members collaborating in a high-contrast creative office',
        categories: ['business', 'iş', 'team', 'ekip', 'office', 'ofis'],
        author: 'Austin Distel'
    },
    // Design
    {
        url: 'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=800&auto=format&fit=crop&q=80',
        alt: 'Minimalist designer workstation with UI design wireframes',
        categories: ['design', 'tasarım', 'ui', 'ux', 'art', 'sanat'],
        author: 'Daniel Korpai'
    },
    {
        url: 'https://images.unsplash.com/photo-1558655146-d09347e92766?w=800&auto=format&fit=crop&q=80',
        alt: 'Design wireframes layout sketched on paper',
        categories: ['design', 'tasarım', 'creative', 'yaratıcı', 'art'],
        author: 'Halagate'
    },
    // AI & Abstract
    {
        url: 'https://images.unsplash.com/photo-1677442136019-21780efad99a?w=800&auto=format&fit=crop&q=80',
        alt: 'Abstract glowing node mesh network representing artificial intelligence',
        categories: ['ai', 'yapay zeka', 'cyber', 'technology', 'network'],
        author: 'Steve Johnson'
    },
    {
        url: 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=800&auto=format&fit=crop&q=80',
        alt: 'Futuristic abstract digital model of human neural connection',
        categories: ['ai', 'yapay zeka', 'brain', 'beyin', 'future', 'gelecek'],
        author: 'Google DeepMind'
    },
    {
        url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80',
        alt: 'Fluid gradient 3D rendering with neon orange and cyan hues',
        categories: ['abstract', 'soyut', 'art', 'sanat', 'gradient'],
        author: 'Fakurian Design'
    },
    // Presentation / Stage
    {
        url: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800&auto=format&fit=crop&q=80',
        alt: 'Presenter gesturing in front of screen in workshop session',
        categories: ['presentation', 'sunum', 'stage', 'sahne', 'education'],
        author: 'Headway'
    },
    {
        url: 'https://images.unsplash.com/photo-1475721027785-f74eccf877e2?w=800&auto=format&fit=crop&q=80',
        alt: 'Stage microphone ready for public speaking event',
        categories: ['presentation', 'sunum', 'stage', 'sahne', 'voice', 'ses'],
        author: 'Robinson Recalde'
    },
    {
        url: 'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?w=800&auto=format&fit=crop&q=80',
        alt: 'Bright digital display screen on stage in front of audience seats',
        categories: ['presentation', 'sunum', 'stage', 'sahne', 'conference'],
        author: 'Alexandre Pellaes'
    }
];

const DEFAULT_SLIDES: PresentationSlide[] = [
    {
        id: 'slide-1',
        title: 'PreCue.ai — Sunum Asistanı',
        content_type: 'left',
        items: [
            'Kumandayı geride bırakın: Doğal ses kontrolü ile slaytları yönetin.',
            'Yapay zeka ses motoru ile niyetinize göre sayfa geçişleri sağlayın.',
            'Analiz paneli sayesinde konuşma hızı ve duraklama analizleri alın.'
        ],
        image: {
            prompt: 'Conference stage with bright presentation screen',
            url: 'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?w=800&auto=format&fit=crop&q=80',
            alt: 'Conference stage'
        },
        speaker_note: 'Sunuma güçlü ve kendinden emin başlayın. PreCue.ai vizyonunu anlatırken ses tonunuzu yüksek tutun.'
    },
    {
        id: 'slide-2',
        title: 'AI Ses Kontrolü',
        content_type: 'right',
        items: [
            'Chrome ses tanıma motoruyla %98 doğrulukta sesli yönetim.',
            'Sunum akışını bozmayan "Sonraki slayt" gibi akıllı ses tetikleyicileri.',
            'Arka plan gürültüsünü filtreleyen akıllı konuşma tespiti.'
        ],
        image: {
            prompt: 'Microphone on a dark conference stage',
            url: 'https://images.unsplash.com/photo-1475721027785-f74eccf877e2?w=800&auto=format&fit=crop&q=80',
            alt: 'Stage microphone'
        },
        speaker_note: 'Ses komutlarının nasıl çalıştığını gösteren küçük bir demo yapın. "Sonraki slayt" diyerek pratikliği gösterin.'
    },
    {
        id: 'slide-3',
        title: 'Prova Analitiği',
        content_type: 'left',
        items: [
            'Konuşma hızı (kelime/dakika) takibiyle ideal tempoda kalın.',
            'Sıklıkla tekrarlanan doldurucu kelimelerin otomatik tespiti.',
            'Her slayta harcanan sürenin ayrıntılı dağılım grafikleri.'
        ],
        image: {
            prompt: 'Financial analytics and charts on a screen',
            url: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&auto=format&fit=crop&q=80',
            alt: 'Analytics metrics dashboard'
        },
        speaker_note: 'Konuşma hızının öneminden bahsedin. Aşırı hızlı konuşmanın izleyiciyi yoracağını hatırlatın.'
    },
    {
        id: 'slide-4',
        title: 'Akıllı Öngörüler & Soru-Cevap',
        content_type: 'standard',
        items: [
            'RAG altyapısı ile sunum içeriğinden otomatik soru-cevap setleri.',
            'Slayt içeriğini analiz ederek önerilen konuşmacı kartları üretimi.',
            'Hedef kitleye göre sunum tonu ayarlama önerileri.'
        ],
        speaker_note: 'Soru-cevap hazırlığının konuşmacı kaygısını %50 oranında düşürdüğünü vurgulayın.'
    },
    {
        id: 'slide-5',
        title: 'Sahne Sırası Sizde',
        content_type: 'background',
        items: [
            'PreCue.ai ile teknik aksaklıkları unutun, sahneye odaklanın.',
            'Daha özgüvenli, daha akıcı ve daha profesyonel sunumlar.',
            'Hemen kaydolun ve sunumlarınızı bir üst seviyeye taşıyın.'
        ],
        image: {
            prompt: 'Silicon microchip with glowing gold elements',
            url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&auto=format&fit=crop&q=80',
            alt: 'Silicon microchip'
        },
        speaker_note: 'Kapanışta izleyicilere teşekkür edin ve sorularını almak için sahneyi açın.'
    }
];

const VALID_LAYOUTS = ['standard', 'left', 'right', 'background'];

const normalizeSlides = (slidesList: PresentationSlide[]): PresentationSlide[] => {
    if (!slidesList) return [];
    return slidesList.map(slide => ({
        ...slide,
        content_type: VALID_LAYOUTS.includes(slide.content_type) ? slide.content_type : 'standard'
    }));
};

export default function PresentationEditor() {
    const router = useRouter();
    const t = useTranslations('editor');

    // Presentation Editor Master States
    const [slides, setSlides] = useState<PresentationSlide[]>(() => {
        if (typeof window !== 'undefined') {
            const stored = sessionStorage.getItem('precue_generated_presentation');
            if (stored) {
                try {
                    const parsed = JSON.parse(stored);
                    if (parsed.slides && parsed.slides.length > 0) {
                        return normalizeSlides(parsed.slides);
                    }
                } catch (e) {
                    console.error('Failed to parse slides from session:', e);
                }
            }
        }
        return DEFAULT_SLIDES;
    });

    const [selectedSlideId, setSelectedSlideId] = useState<string>(() => {
        if (typeof window !== 'undefined') {
            const stored = sessionStorage.getItem('precue_generated_presentation');
            if (stored) {
                try {
                    const parsed = JSON.parse(stored);
                    if (parsed.slides && parsed.slides.length > 0) {
                        return parsed.slides[0].id;
                    }
                } catch (e) {
                    console.error('Failed to parse slide ID from session:', e);
                }
            }
        }
        return 'slide-1';
    });

    const [metadata, setMetadata] = useState<PresentationMetadata>(() => {
        const defaultMetadata = {
            title: 'PreCue.ai Presentation',
            theme: 'sunset',
            primary_color: '#f97316',
            accent_color: '#06b6d4',
            font_family: 'Inter, sans-serif'
        };
        if (typeof window !== 'undefined') {
            const stored = sessionStorage.getItem('precue_generated_presentation');
            if (stored) {
                try {
                    const parsed = JSON.parse(stored);
                    if (parsed.metadata) {
                        return parsed.metadata;
                    }
                } catch (e) {
                    console.error('Failed to parse metadata from session:', e);
                }
            }
        }
        return defaultMetadata;
    });

    // Set localized default slides or load from session storage on mount
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const stored = sessionStorage.getItem('precue_generated_presentation');
            if (stored) {
                try {
                    const parsed = JSON.parse(stored);
                    if (parsed.slides && parsed.slides.length > 0) {
                        setTimeout(() => {
                            setSlides(normalizeSlides(parsed.slides));
                            if (parsed.metadata) {
                                setMetadata(parsed.metadata);
                            }
                        }, 0);
                        return;
                    }
                } catch (e) {
                    console.error('Failed to parse slides from session:', e);
                }
            }

            // Fallback: Localized default slides
            const localizedDefaultSlides: PresentationSlide[] = [
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

            setTimeout(() => {
                setSlides(localizedDefaultSlides);
                setMetadata(prev => ({
                    ...prev,
                    title: t('misc.defaultTitle')
                }));
            }, 0);
        }
    }, [t]);

    // Auto-save: debounced persistence to DB
    const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

    const persistToServer = useCallback(async (currentSlides: PresentationSlide[], currentMetadata: PresentationMetadata) => {
        const presentationId = typeof window !== 'undefined'
            ? sessionStorage.getItem('precue_active_presentation_id')
            : null;
        if (!presentationId) return;

        setAutoSaveStatus('saving');
        try {
            const state = { metadata: currentMetadata, slides: currentSlides };
            await client.put(`/api/v1/presentations/${presentationId}/ai-state`, state);
            sessionStorage.setItem('precue_generated_presentation', JSON.stringify(state));
            setAutoSaveStatus('saved');
            setTimeout(() => setAutoSaveStatus('idle'), 2500);
        } catch {
            setAutoSaveStatus('error');
            setTimeout(() => setAutoSaveStatus('idle'), 3000);
        }
    }, []);

    const scheduleAutoSave = useCallback((currentSlides: PresentationSlide[], currentMetadata: PresentationMetadata) => {
        if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
        autoSaveTimerRef.current = setTimeout(() => {
            persistToServer(currentSlides, currentMetadata);
        }, 1500);
    }, [persistToServer]);

    // Interaction & Action States
    const [isSaving, setIsSaving] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [saveProgress, setSaveProgress] = useState<string>('');
    const [showSaveOverlay, setShowSaveOverlay] = useState(false);
    const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

    // Panel & Zoom States
    const [isLeftPanelOpen, setIsLeftPanelOpen] = useState(true);
    const [isRightPanelOpen, setIsRightPanelOpen] = useState(true);
    const [zoom, setZoom] = useState(150); // 0 = fit
    const [isNotesOpen, setIsNotesOpen] = useState(true);
    const [isFullscreen, setIsFullscreen] = useState(false);

    const handleZoomIn = useCallback(() => setZoom(prev => prev === 0 ? 125 : Math.min(prev + 25, 200)), []);
    const handleZoomOut = useCallback(() => setZoom(prev => prev === 0 ? 75 : Math.max(prev - 25, 50)), []);
    const handleZoomFit = useCallback(() => setZoom(0), []);

    const handleToggleFullscreen = useCallback(() => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen?.().catch(() => {});
            setIsFullscreen(true);
        } else {
            document.exitFullscreen?.().catch(() => {});
            setIsFullscreen(false);
        }
    }, []);

    useEffect(() => {
        const handler = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', handler);
        return () => document.removeEventListener('fullscreenchange', handler);
    }, []);

    // Image Unsplash Search Modal States
    const [imageModalOpen, setImageModalOpen] = useState(false);
    const [activeImageSearchSlideId, setActiveImageSearchSlideId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    // Filter images when search query changes
    const filteredImages = React.useMemo(() => {
        if (!searchQuery.trim()) {
            return IMAGE_DATABASE;
        }

        const query = searchQuery.toLowerCase().trim();
        return IMAGE_DATABASE.filter((img) =>
            img.alt.toLowerCase().includes(query) ||
            img.categories.some((cat) => cat.includes(query)) ||
            img.author.toLowerCase().includes(query)
        );
    }, [searchQuery]);

    // Toast Timer auto-dismiss
    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => {
                setToast(null);
            }, 4000);
            return () => clearTimeout(timer);
        }
    }, [toast]);

    const activeSlide = slides.find((s) => s.id === selectedSlideId) || slides[0];

    // Local Mutation Handlers
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

    const handleUpdateLayoutType = (id: string, type: string) => {
        setSlides((prev) => {
            const next = prev.map((s) => (s.id === id ? { ...s, content_type: type } : s));
            scheduleAutoSave(next, metadata);
            return next;
        });
    };

    const handleTriggerImageSearch = (id: string) => {
        setActiveImageSearchSlideId(id);
        setSearchQuery('');
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
            setToast({ type: 'error', message: t('notifications.cannotDeleteLastSlide') });
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

    // When metadata changes, schedule auto-save too
    const handleUpdateMetadataWithSave = (newMeta: PresentationMetadata) => {
        setMetadata(newMeta);
        scheduleAutoSave(slides, newMeta);
    };

    // Actions implementation
    const handleDownloadPPTX = async () => {
        const presentationId = typeof window !== 'undefined'
            ? sessionStorage.getItem('precue_active_presentation_id')
            : null;

        if (!presentationId) {
            setToast({ type: 'error', message: t('notifications.saveRequiredError') });
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
            setToast({ type: 'success', message: t('notifications.downloadSuccess') });
        } catch {
            setToast({ type: 'error', message: t('notifications.downloadError') || 'PPTX export failed.' });
        } finally {
            setIsDownloading(false);
        }
    };

    const handleSendToAnalysis = () => {
        const activePresentationId = typeof window !== 'undefined'
            ? sessionStorage.getItem('precue_active_presentation_id')
            : null;

        if (!activePresentationId) {
            setToast({
                type: 'error',
                message: t('notifications.saveRequiredError')
            });
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

            {/* Unsplash Image Search Modal */}
            <AnimatePresence>
                {imageModalOpen && (
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
                                    <Grid size={15} className="text-primary" style={{ color: metadata.primary_color }} />
                                    <div>
                                        <h3 className="text-xs font-black uppercase tracking-widest text-white">{t('notifications.unsplashHeader')}</h3>
                                        <p className="text-[10px] text-zinc-500 font-medium mt-0.5">{t('notifications.unsplashSubtitle')}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setImageModalOpen(false)}
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
                                    {['technology', 'ai', 'business', 'design', 'stage', 'abstract'].map((term) => {
                                        const localizedTerm = t(`categories.${term}`);
                                        return (
                                            <button
                                                key={term}
                                                onClick={() => setSearchQuery(localizedTerm)}
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
                                {filteredImages.length > 0 ? (
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                        {filteredImages.map((img) => (
                                            <div
                                                key={img.url}
                                                onClick={() => handleSelectImage(img)}
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
                                                    <p className="text-[8px] text-zinc-400 mt-0.5">{t('notifications.photoAuthor', { author: img.author })}</p>
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

            {/* Notification Toast */}
            <AnimatePresence>
                {toast && (
                    <motion.div
                        initial={{ opacity: 0, y: 50 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 50 }}
                        className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-zinc-900 border border-white/10 px-4.5 py-3 rounded-xl shadow-2xl max-w-sm"
                    >
                        <div className={`w-2 h-2 rounded-full shrink-0 ${toast.type === 'success' ? 'bg-green-500 shadow-[0_0_8px_#22c55e]' : 'bg-red-500 shadow-[0_0_8px_#ef4444]'}`} />
                        <span className="text-xs font-bold text-zinc-200">{toast.message}</span>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
