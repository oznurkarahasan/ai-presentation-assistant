import { describe, it, expect, beforeEach } from 'vitest'
import {
    normalizeSlides,
    readStoredPresentation,
    writeStoredPresentation,
    buildLocalizedDefaultSlides,
    DEFAULT_METADATA,
} from '../app/lib/editorDefaults'
import type { PresentationSlide } from '../app/types/presentation'

describe('normalizeSlides', () => {
    it('returns an empty array for a falsy input', () => {
        expect(normalizeSlides(null as unknown as PresentationSlide[])).toEqual([])
        expect(normalizeSlides(undefined as unknown as PresentationSlide[])).toEqual([])
    })

    it('keeps a valid content_type unchanged', () => {
        const slides = [{ id: '1', title: 'A', content_type: 'left', items: [] }] as PresentationSlide[]
        expect(normalizeSlides(slides)[0].content_type).toBe('left')
    })

    it('coerces an invalid/unrecognized content_type to "standard"', () => {
        const slides = [
            { id: '1', title: 'A', content_type: 'carousel', items: [] },
        ] as unknown as PresentationSlide[]
        expect(normalizeSlides(slides)[0].content_type).toBe('standard')
    })

    it('does not mutate the original slide objects', () => {
        const original = { id: '1', title: 'A', content_type: 'bogus', items: [] } as unknown as PresentationSlide
        const slides = [original]
        normalizeSlides(slides)
        expect(original.content_type).toBe('bogus')
    })
})

describe('readStoredPresentation / writeStoredPresentation', () => {
    beforeEach(() => {
        sessionStorage.clear()
    })

    it('returns null when nothing is stored', () => {
        expect(readStoredPresentation()).toBeNull()
    })

    it('round-trips a written presentation', () => {
        const state = {
            metadata: DEFAULT_METADATA,
            slides: [{ id: '1', title: 'A', content_type: 'standard' as const, items: ['x'] }],
        }
        writeStoredPresentation(state)
        expect(readStoredPresentation()).toEqual(state)
    })

    it('returns null when the stored slides array is empty', () => {
        writeStoredPresentation({ metadata: DEFAULT_METADATA, slides: [] })
        expect(readStoredPresentation()).toBeNull()
    })

    it('returns null and does not throw on corrupted JSON', () => {
        sessionStorage.setItem('precue_generated_presentation', '{not valid json')
        expect(readStoredPresentation()).toBeNull()
    })
})

describe('buildLocalizedDefaultSlides', () => {
    const t = (key: string) => `translated:${key}`

    it('builds exactly 5 slides', () => {
        expect(buildLocalizedDefaultSlides(t)).toHaveLength(5)
    })

    it('uses the translation function for every title', () => {
        const slides = buildLocalizedDefaultSlides(t)
        for (const slide of slides) {
            expect(slide.title).toMatch(/^translated:/)
        }
    })

    it('produces only valid, known layout ids', () => {
        const slides = buildLocalizedDefaultSlides(t)
        const validLayouts = new Set(['standard', 'left', 'right', 'background'])
        for (const slide of slides) {
            expect(validLayouts.has(slide.content_type)).toBe(true)
        }
    })
})
