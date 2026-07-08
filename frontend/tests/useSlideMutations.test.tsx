import { useState } from 'react'
import { act, renderHook } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useSlideMutations } from '../app/hooks/useSlideMutations'
import type { PresentationMetadata, PresentationSlide } from '../app/types/presentation'
import type { UnsplashImage } from '../app/components/ImagePickerModal'

/** useSlideMutations manages `imageModalOpen` internally but expects slide/selection
 * state to live in the caller (PresentationEditor in production). This harness
 * reproduces that: real useState for slides/selection, so mutations round-trip
 * through an actual re-render exactly like they do in the app. */
function useHarness(initialSlides: PresentationSlide[], initialSelectedId: string) {
    const [slides, setSlides] = useState(initialSlides)
    const [selectedSlideId, setSelectedSlideId] = useState(initialSelectedId)
    const mutations = useSlideMutations(
        slides,
        setSlides,
        metadata,
        scheduleAutoSave,
        selectedSlideId,
        setSelectedSlideId,
        showToast,
        t,
    )
    return { slides, selectedSlideId, ...mutations }
}

const metadata: PresentationMetadata = {
    title: 'Deck',
    theme: 'sunset',
    primary_color: '#f97316',
    accent_color: '#06b6d4',
    font_family: 'Inter',
}

const scheduleAutoSave = vi.fn()
const showToast = vi.fn()
const t = (key: string) => `t:${key}`

function makeSlide(overrides: Partial<PresentationSlide> = {}): PresentationSlide {
    return {
        id: overrides.id ?? 'slide-1',
        title: 'Title',
        content_type: 'standard',
        items: ['a', 'b'],
        speaker_note: 'note',
        ...overrides,
    }
}

function threeSlides(): PresentationSlide[] {
    return [makeSlide({ id: 's1', title: 'One' }), makeSlide({ id: 's2', title: 'Two' }), makeSlide({ id: 's3', title: 'Three' })]
}

beforeEach(() => {
    scheduleAutoSave.mockClear()
    showToast.mockClear()
})

describe('handleUpdateSlideTitle', () => {
    it('updates only the targeted slide title and schedules an autosave', () => {
        const { result } = renderHook(() => useHarness(threeSlides(), 's1'))

        act(() => result.current.handleUpdateSlideTitle('s2', 'Renamed'))

        expect(result.current.slides.find((s) => s.id === 's2')!.title).toBe('Renamed')
        expect(result.current.slides.find((s) => s.id === 's1')!.title).toBe('One')
        expect(scheduleAutoSave).toHaveBeenCalledWith(result.current.slides, metadata)
    })
})

describe('handleUpdateSlideItem / handleDeleteSlideItem / handleAddSlideItem', () => {
    it('updates a single item by index without touching the others', () => {
        const { result } = renderHook(() => useHarness([makeSlide({ items: ['a', 'b', 'c'] })], 'slide-1'))

        act(() => result.current.handleUpdateSlideItem('slide-1', 1, 'B-updated'))

        expect(result.current.slides[0].items).toEqual(['a', 'B-updated', 'c'])
    })

    it('deletes an item at the given index and shifts the rest down', () => {
        const { result } = renderHook(() => useHarness([makeSlide({ items: ['a', 'b', 'c'] })], 'slide-1'))

        act(() => result.current.handleDeleteSlideItem('slide-1', 0))

        expect(result.current.slides[0].items).toEqual(['b', 'c'])
    })

    it('appends a new bullet point using the translation function', () => {
        const { result } = renderHook(() => useHarness([makeSlide({ items: ['a'] })], 'slide-1'))

        act(() => result.current.handleAddSlideItem('slide-1'))

        expect(result.current.slides[0].items).toEqual(['a', 't:misc.newBulletPoint'])
    })
})

describe('handleUpdateSpeakerNote / handleUpdateLayoutType', () => {
    it('updates the speaker note for the targeted slide', () => {
        const { result } = renderHook(() => useHarness([makeSlide({ speaker_note: 'old' })], 'slide-1'))
        act(() => result.current.handleUpdateSpeakerNote('slide-1', 'new note'))
        expect(result.current.slides[0].speaker_note).toBe('new note')
    })

    it('updates the layout type for the targeted slide', () => {
        const { result } = renderHook(() => useHarness([makeSlide({ content_type: 'standard' })], 'slide-1'))
        act(() => result.current.handleUpdateLayoutType('slide-1', 'background'))
        expect(result.current.slides[0].content_type).toBe('background')
    })
})

describe('image handling', () => {
    const image: UnsplashImage = { url: 'https://images.unsplash.com/photo-1', alt: 'A photo', keywords: ['a'] }

    it('opens the image modal and tracks which slide triggered it', () => {
        const { result } = renderHook(() => useHarness([makeSlide()], 'slide-1'))
        expect(result.current.imageModalOpen).toBe(false)

        act(() => result.current.handleTriggerImageSearch('slide-1'))

        expect(result.current.imageModalOpen).toBe(true)
    })

    it('assigns the selected image to the slide that triggered the search, then closes the modal', () => {
        const { result } = renderHook(() => useHarness(threeSlides(), 's1'))

        act(() => result.current.handleTriggerImageSearch('s2'))
        act(() => result.current.handleSelectImage(image))

        expect(result.current.slides.find((s) => s.id === 's2')!.image).toEqual({
            prompt: image.alt,
            url: image.url,
            alt: image.alt,
            style: 'modern',
        })
        expect(result.current.slides.find((s) => s.id === 's1')!.image).toBeUndefined()
        expect(result.current.imageModalOpen).toBe(false)
    })

    it('is a no-op when no slide has an active image search', () => {
        const { result } = renderHook(() => useHarness([makeSlide()], 'slide-1'))

        act(() => result.current.handleSelectImage(image))

        expect(result.current.slides[0].image).toBeUndefined()
        expect(scheduleAutoSave).not.toHaveBeenCalled()
    })

    it('removes an image from a slide', () => {
        const { result } = renderHook(() =>
            useHarness([makeSlide({ image: { prompt: 'x', url: 'https://x', alt: 'x' } })], 'slide-1'),
        )

        act(() => result.current.handleRemoveImage('slide-1'))

        expect(result.current.slides[0].image).toBeUndefined()
    })

    it('closeImageModal closes the modal', () => {
        const { result } = renderHook(() => useHarness([makeSlide()], 'slide-1'))
        act(() => result.current.handleTriggerImageSearch('slide-1'))
        act(() => result.current.closeImageModal())
        expect(result.current.imageModalOpen).toBe(false)
    })
})

describe('handleAddSlide', () => {
    it('appends a new slide with translated defaults and selects it', () => {
        const { result } = renderHook(() => useHarness([makeSlide({ id: 's1' })], 's1'))

        act(() => result.current.handleAddSlide())

        expect(result.current.slides).toHaveLength(2)
        const added = result.current.slides[1]
        expect(added.title).toBe('t:misc.newSlideTitle')
        expect(added.items).toEqual(['t:misc.newSlideDescription'])
        expect(added.content_type).toBe('standard')
        expect(result.current.selectedSlideId).toBe(added.id)
    })
})

describe('handleDeleteSlide', () => {
    it('deletes a non-selected slide without changing the current selection', () => {
        const { result } = renderHook(() => useHarness(threeSlides(), 's1'))

        act(() => result.current.handleDeleteSlide('s3'))

        expect(result.current.slides.map((s) => s.id)).toEqual(['s1', 's2'])
        expect(result.current.selectedSlideId).toBe('s1')
    })

    it('falls back to the first remaining slide when the selected slide is deleted', () => {
        const { result } = renderHook(() => useHarness(threeSlides(), 's2'))

        act(() => result.current.handleDeleteSlide('s2'))

        expect(result.current.slides.map((s) => s.id)).toEqual(['s1', 's3'])
        expect(result.current.selectedSlideId).toBe('s1')
    })

    it('refuses to delete the last remaining slide and shows an error toast instead', () => {
        const { result } = renderHook(() => useHarness([makeSlide({ id: 'only' })], 'only'))

        act(() => result.current.handleDeleteSlide('only'))

        expect(result.current.slides).toHaveLength(1)
        expect(showToast).toHaveBeenCalledWith('error', 't:notifications.cannotDeleteLastSlide')
        expect(scheduleAutoSave).not.toHaveBeenCalled()
    })
})

describe('handleReorderSlides', () => {
    it('moves a slide from dragIndex to dropIndex, shifting the others', () => {
        const { result } = renderHook(() => useHarness(threeSlides(), 's1'))

        act(() => result.current.handleReorderSlides(0, 2))

        expect(result.current.slides.map((s) => s.id)).toEqual(['s2', 's3', 's1'])
    })

    it('moving an item to an earlier index shifts the intermediate items forward', () => {
        const { result } = renderHook(() => useHarness(threeSlides(), 's1'))

        act(() => result.current.handleReorderSlides(2, 0))

        expect(result.current.slides.map((s) => s.id)).toEqual(['s3', 's1', 's2'])
    })

    it('is a no-op when dragIndex equals dropIndex', () => {
        const { result } = renderHook(() => useHarness(threeSlides(), 's1'))

        act(() => result.current.handleReorderSlides(1, 1))

        expect(result.current.slides.map((s) => s.id)).toEqual(['s1', 's2', 's3'])
    })
})

describe('stale-closure regression: back-to-back mutations in the same tick', () => {
    /** handleDeleteSlide and handleReorderSlides read `slides` from the hook's
     * render-time closure instead of using the setSlides(prev => ...) updater
     * form that every other handler in this file uses. If two such calls fire
     * within the same synchronous batch (no re-render in between — plausible
     * for a fast drag-reorder sequence, or a delete immediately followed by a
     * reorder from a queued UI event), the second call recomputes its result
     * from the same stale `slides` snapshot and silently overwrites the first
     * mutation when both call setSlides. This test documents the current
     * (buggy) behavior rather than asserting the ideally-correct one. */
    it('a reorder issued in the same batch as a delete silently drops the delete', () => {
        const { result } = renderHook(() => useHarness(threeSlides(), 's1'))

        act(() => {
            result.current.handleDeleteSlide('s2')
            result.current.handleReorderSlides(0, 2)
        })

        // Expected if both mutations had applied: ['s1', 's3'] reordered -> ['s3', 's1'] (2 slides).
        // Actual: the reorder recomputed from the pre-delete 3-slide snapshot wins.
        expect(result.current.slides.map((s) => s.id)).toEqual(['s2', 's3', 's1'])
        expect(result.current.slides).toHaveLength(3)
    })
})
