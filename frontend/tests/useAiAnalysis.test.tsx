import { act, renderHook } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useAiAnalysis, getCachedAnalysis } from '../app/hooks/useAiAnalysis'
import type { PresentationAnalysis } from '../app/types/analysis'

const mockPost = vi.fn()
vi.mock('../app/api/client', () => ({
    default: { post: (...args: unknown[]) => mockPost(...args) },
}))

const CACHE_KEY = 'precue_analysis_cache'

function makeAnalysis(overrides: Partial<PresentationAnalysis> = {}): PresentationAnalysis {
    return {
        overall_score: 80,
        readability_score: 75,
        structure_score: 85,
        visual_balance_score: 90,
        summary: 'Solid deck overall.',
        slide_feedback: [],
        ...overrides,
    }
}

describe('getCachedAnalysis', () => {
    beforeEach(() => {
        sessionStorage.clear()
    })

    it('returns null when nothing is cached', () => {
        expect(getCachedAnalysis('42')).toBeNull()
    })

    it('returns the cached entry for the given presentation id', () => {
        const analysis = makeAnalysis()
        sessionStorage.setItem(CACHE_KEY, JSON.stringify({ '42': analysis }))
        expect(getCachedAnalysis('42')).toEqual(analysis)
    })

    it('returns null for an id not present in the cache', () => {
        sessionStorage.setItem(CACHE_KEY, JSON.stringify({ '42': makeAnalysis() }))
        expect(getCachedAnalysis('99')).toBeNull()
    })

    it('returns null and does not throw on corrupted cache JSON', () => {
        sessionStorage.setItem(CACHE_KEY, '{not valid json')
        expect(getCachedAnalysis('42')).toBeNull()
    })
})

describe('useAiAnalysis', () => {
    beforeEach(() => {
        sessionStorage.clear()
        mockPost.mockReset()
    })

    it('starts with no result, not analyzing, and no error', () => {
        const { result } = renderHook(() => useAiAnalysis())
        expect(result.current.result).toBeNull()
        expect(result.current.isAnalyzing).toBe(false)
        expect(result.current.error).toBeNull()
    })

    it('sets isAnalyzing while the request is in flight, then resolves with the result', async () => {
        let resolveRequest!: (value: { data: PresentationAnalysis }) => void
        mockPost.mockReturnValue(new Promise((res) => { resolveRequest = res }))

        const { result } = renderHook(() => useAiAnalysis())

        act(() => {
            result.current.analyze('42', 'en', 'Analysis failed')
        })
        expect(result.current.isAnalyzing).toBe(true)

        const analysis = makeAnalysis()
        await act(async () => {
            resolveRequest({ data: analysis })
        })

        expect(result.current.isAnalyzing).toBe(false)
        expect(result.current.result).toEqual(analysis)
        expect(mockPost).toHaveBeenCalledWith('/api/v1/presentations/42/analyze', { language: 'en' })
    })

    it('caches a successful result to sessionStorage, keyed by presentation id', async () => {
        const analysis = makeAnalysis({ overall_score: 92 })
        mockPost.mockResolvedValue({ data: analysis })
        const { result } = renderHook(() => useAiAnalysis())

        await act(async () => {
            await result.current.analyze('42', 'en', 'Analysis failed')
        })

        expect(getCachedAnalysis('42')).toEqual(analysis)
    })

    it('preserves other cached entries when caching a new analysis', async () => {
        sessionStorage.setItem(CACHE_KEY, JSON.stringify({ '1': makeAnalysis({ overall_score: 10 }) }))
        mockPost.mockResolvedValue({ data: makeAnalysis({ overall_score: 20 }) })
        const { result } = renderHook(() => useAiAnalysis())

        await act(async () => {
            await result.current.analyze('2', 'en', 'Analysis failed')
        })

        expect(getCachedAnalysis('1')?.overall_score).toBe(10)
        expect(getCachedAnalysis('2')?.overall_score).toBe(20)
    })

    it('sets a user-facing error message and clears isAnalyzing on failure', async () => {
        mockPost.mockRejectedValue(new Error('boom'))
        const { result } = renderHook(() => useAiAnalysis())

        await act(async () => {
            await result.current.analyze('42', 'en', 'Analysis failed, please retry')
        })

        expect(result.current.isAnalyzing).toBe(false)
        expect(result.current.error).toBe('Analysis failed, please retry')
        expect(result.current.result).toBeNull()
    })

    it('clears a previous error when a new analyze() call starts', async () => {
        mockPost.mockRejectedValueOnce(new Error('boom'))
        const { result } = renderHook(() => useAiAnalysis())
        await act(async () => {
            await result.current.analyze('42', 'en', 'Failed')
        })
        expect(result.current.error).toBe('Failed')

        let resolveRequest!: (value: { data: PresentationAnalysis }) => void
        mockPost.mockReturnValueOnce(new Promise((res) => { resolveRequest = res }))
        act(() => {
            result.current.analyze('42', 'en', 'Failed')
        })
        expect(result.current.error).toBeNull()

        await act(async () => {
            resolveRequest({ data: makeAnalysis() })
        })
    })

    it('loadCached loads a previously cached analysis for the given presentation', () => {
        const analysis = makeAnalysis({ overall_score: 55 })
        sessionStorage.setItem(CACHE_KEY, JSON.stringify({ '7': analysis }))
        const { result } = renderHook(() => useAiAnalysis())

        act(() => result.current.loadCached('7'))

        expect(result.current.result).toEqual(analysis)
        expect(result.current.error).toBeNull()
    })

    it('loadCached sets result to null when nothing is cached for that id', () => {
        const { result } = renderHook(() => useAiAnalysis())
        act(() => result.current.loadCached('unknown'))
        expect(result.current.result).toBeNull()
    })

    it('loadCached sets result to null for a falsy presentation id', () => {
        sessionStorage.setItem(CACHE_KEY, JSON.stringify({ '7': makeAnalysis() }))
        const { result } = renderHook(() => useAiAnalysis())
        act(() => result.current.loadCached(''))
        expect(result.current.result).toBeNull()
    })
})
