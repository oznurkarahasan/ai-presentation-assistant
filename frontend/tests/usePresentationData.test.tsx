import { act, renderHook } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { usePresentationData } from '../app/hooks/usePresentationData'

const mockGet = vi.fn()
vi.mock('../app/api/client', () => ({
    default: { get: (...args: unknown[]) => mockGet(...args) },
}))

function deferred<T>() {
    let resolve!: (value: T) => void
    let reject!: (reason?: unknown) => void
    const promise = new Promise<T>((res, rej) => {
        resolve = res
        reject = rej
    })
    return { promise, resolve, reject }
}

describe('usePresentationData', () => {
    beforeEach(() => {
        mockGet.mockReset()
        vi.spyOn(console, 'error').mockImplementation(() => {})
    })

    afterEach(() => {
        vi.restoreAllMocks()
    })

    it('does not fetch and returns the initial data when presentationId is falsy', () => {
        const { result } = renderHook(() => usePresentationData(null))
        expect(mockGet).not.toHaveBeenCalled()
        expect(result.current.data.title).toBeNull()
        expect(result.current.data.totalPages).toBe(1)
    })

    it('loads a regular (non-AI) presentation, preferring the PDF preview path over the raw file path', async () => {
        mockGet.mockResolvedValue({
            data: {
                title: 'Quarterly Review',
                file_type: 'pptx',
                file_path: 'uploaded_files/deck.pptx',
                pdf_preview_path: 'uploaded_files/deck.pptx.preview.pdf',
                slide_count: 8,
                orientation: 'landscape',
                aspect_ratio: 1.6,
            },
        })

        const { result } = renderHook(() => usePresentationData('1'))
        await act(async () => {})

        expect(mockGet).toHaveBeenCalledWith('/api/v1/presentations/1')
        expect(result.current.data.title).toBe('Quarterly Review')
        expect(result.current.data.file).toBe('uploaded_files/deck.pptx.preview.pdf')
        expect(result.current.data.fileType).toBe('pdf')
        expect(result.current.data.totalPages).toBe(8)
        expect(result.current.data.orientation).toBe('landscape')
        expect(result.current.data.aspectRatio).toBe(1.6)
        expect(result.current.error).toBeNull()
    })

    it('falls back to the raw file path when there is no PDF preview', async () => {
        mockGet.mockResolvedValue({
            data: { title: 'Notes', file_type: 'pdf', file_path: 'uploaded_files/notes.pdf', slide_count: 3 },
        })

        const { result } = renderHook(() => usePresentationData('1'))
        await act(async () => {})

        expect(result.current.data.file).toBe('uploaded_files/notes.pdf')
        expect(result.current.data.fileType).toBe('pdf')
    })

    it('loads an AI-generated presentation, fetching ai-state for slides and colors', async () => {
        mockGet.mockImplementation((url: string) => {
            if (url === '/api/v1/presentations/1') {
                return Promise.resolve({ data: { title: 'AI Deck', file_type: 'ai' } })
            }
            if (url === '/api/v1/presentations/1/ai-state') {
                return Promise.resolve({
                    data: {
                        metadata: { primary_color: '#111111', accent_color: '#222222' },
                        slides: [{ id: '1', title: 'A' }, { id: '2', title: 'B' }],
                    },
                })
            }
            return Promise.reject(new Error(`unexpected url: ${url}`))
        })

        const { result } = renderHook(() => usePresentationData('1'))
        await act(async () => {})

        expect(result.current.data.fileType).toBe('ai')
        expect(result.current.data.file).toBeNull()
        expect(result.current.data.aiSlides).toHaveLength(2)
        expect(result.current.data.totalPages).toBe(2)
        expect(result.current.data.aiColors).toEqual({ primary: '#111111', accent: '#222222' })
    })

    it('falls back to default AI colors when ai-state has no metadata colors', async () => {
        mockGet.mockImplementation((url: string) => {
            if (url === '/api/v1/presentations/1') {
                return Promise.resolve({ data: { title: 'AI Deck', file_type: 'ai' } })
            }
            return Promise.resolve({ data: { slides: [{ id: '1', title: 'A' }] } })
        })

        const { result } = renderHook(() => usePresentationData('1'))
        await act(async () => {})

        expect(result.current.data.aiColors).toEqual({ primary: '#f97316', accent: '#06b6d4' })
    })

    it('still resolves the base presentation when the ai-state fetch fails, without surfacing a hook-level error', async () => {
        mockGet.mockImplementation((url: string) => {
            if (url === '/api/v1/presentations/1') {
                return Promise.resolve({ data: { title: 'AI Deck', file_type: 'ai' } })
            }
            return Promise.reject(new Error('ai-state unavailable'))
        })

        const { result } = renderHook(() => usePresentationData('1'))
        await act(async () => {})

        expect(result.current.data.title).toBe('AI Deck')
        expect(result.current.data.aiSlides).toEqual([])
        expect(result.current.error).toBeNull()
    })

    it('exposes an error when the base presentation fetch fails', async () => {
        mockGet.mockRejectedValue(new Error('network down'))

        const { result } = renderHook(() => usePresentationData('1'))
        await act(async () => {})

        expect(result.current.error).not.toBeNull()
        expect(result.current.data.title).toBeNull()
    })

    it('race guard: a late-resolving response for a stale presentationId does not clobber the current data', async () => {
        const first = deferred<{ data: { title: string; file_type: string; file_path: string } }>()
        const second = deferred<{ data: { title: string; file_type: string; file_path: string } }>()

        mockGet.mockImplementation((url: string) => {
            if (url === '/api/v1/presentations/1') return first.promise
            if (url === '/api/v1/presentations/2') return second.promise
            return Promise.reject(new Error(`unexpected url: ${url}`))
        })

        const { result, rerender } = renderHook(({ id }) => usePresentationData(id), {
            initialProps: { id: '1' },
        })

        rerender({ id: '2' })

        // The fast id=2 request resolves first...
        await act(async () => {
            second.resolve({ data: { title: 'Second', file_type: 'pdf', file_path: 'f2.pdf' } })
        })
        // ...then the slow, now-stale id=1 request resolves late.
        await act(async () => {
            first.resolve({ data: { title: 'First', file_type: 'pdf', file_path: 'f1.pdf' } })
        })

        expect(result.current.data.title).toBe('Second')
    })
})
