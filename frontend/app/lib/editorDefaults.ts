import type { PresentationSlide } from '../components/SlideList';
import type { PresentationMetadata } from '../components/RightStylePanel';
import { isSlideLayoutId } from './slideLayouts';

const SESSION_STORAGE_KEY = 'precue_generated_presentation';

export const DEFAULT_METADATA: PresentationMetadata = {
    title: 'PreCue.ai Presentation',
    theme: 'sunset',
    primary_color: '#f97316',
    accent_color: '#06b6d4',
    font_family: 'Inter, sans-serif'
};

export const DEFAULT_SLIDES: PresentationSlide[] = [
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
