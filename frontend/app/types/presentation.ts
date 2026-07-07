import type { SlideLayoutId } from '../lib/slideLayouts';

/** Shared presentation domain types, used by the editor, the AI viewer, and
 * the data-fetching hook that bridges them. Previously `PresentationSlide`
 * (SlideList.tsx) and `AiSlide` (AiSlidePreview.tsx) were two near-identical
 * copies of the same shape that had drifted slightly (`content_type: string`
 * vs the stricter `SlideLayoutId`, a narrower inline `image` type) — this is
 * the single definition both now use. */
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

export interface PresentationMetadata {
    title: string;
    theme: string;
    primary_color: string;
    accent_color: string;
    font_family: string;
}
