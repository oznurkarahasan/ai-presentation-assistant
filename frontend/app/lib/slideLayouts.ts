/**
 * Single source of truth for the set of slide layout ids used across the
 * editor (SlideCanvas, AiSlidePreview, RightStylePanel, EditorToolbar,
 * PresentationEditor). Adding a layout means updating this file plus the
 * render branches in SlideCanvas/AiSlidePreview and the backend PPTX
 * exporter (backend/app/api/v1/presentations.py, _generate_pptx_from_state)
 * — the backend can't import this file directly since it's a separate
 * (Python) service, but its layout ids must match these.
 */
export const SLIDE_LAYOUT_IDS = ['standard', 'left', 'right', 'background'] as const;

export type SlideLayoutId = typeof SLIDE_LAYOUT_IDS[number];

export const SLIDE_LAYOUT_ICONS: Record<SlideLayoutId, string> = {
    standard: '▣',
    left: '◧',
    right: '◨',
    background: '▤',
};

export function isSlideLayoutId(value: string): value is SlideLayoutId {
    return (SLIDE_LAYOUT_IDS as readonly string[]).includes(value);
}
