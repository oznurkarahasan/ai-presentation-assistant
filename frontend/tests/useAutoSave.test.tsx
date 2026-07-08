import { act, renderHook } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useAutoSave } from '../app/hooks/useAutoSave'
import type { PresentationMetadata, PresentationSlide } from '../app/types/presentation'

const mockPut = vi.fn()
vi.mock('../app/api/client', () => ({
    default: { put: (...args: unknown[]) => mockPut(...args) },
}))

const metadata: PresentationMetadata = {
    title: 'Deck',
    theme: 'sunset',
    primary_color: '#f97316',
    accent_color: '#06b6d4',
    font_family: 'Inter',
}
const slides: PresentationSlide[] = [{ id: '1', title: 'A', content_type: 'standard', items: [] }]

describe('useAutoSave', () => {
    beforeEach(() => {
        vi.useFakeTimers()
        mockPut.mockReset()
        sessionStorage.clear()
    })

    afterEach(() => {
        vi.useRealTimers()
    })

    it('does not persist when no active presentation id is stored', async () => {
        sessionStorage.setItem('precue_active_presentation_id', '')
        const { result } = renderHook(() => useAutoSave())

        await act(async () => {
            result.current.scheduleAutoSave(slides, metadata)
            await vi.advanceTimersByTimeAsync(1500)
        })

        expect(mockPut).not.toHaveBeenCalled()
        expect(result.current.autoSaveStatus).toBe('idle')
    })

    it('debounces: does not call the API before 1500ms have elapsed', async () => {
        sessionStorage.setItem('precue_active_presentation_id', '42')
        mockPut.mockResolvedValue({ data: {} })
        const { result } = renderHook(() => useAutoSave())

        act(() => {
            result.current.scheduleAutoSave(slides, metadata)
        })
        await act(async () => {
            await vi.advanceTimersByTimeAsync(1000)
        })

        expect(mockPut).not.toHaveBeenCalled()
    })

    it('persists to the correct endpoint after the debounce window and reports saved status', async () => {
        sessionStorage.setItem('precue_active_presentation_id', '42')
        mockPut.mockResolvedValue({ data: {} })
        const { result } = renderHook(() => useAutoSave())

        act(() => {
            result.current.scheduleAutoSave(slides, metadata)
        })
        await act(async () => {
            await vi.advanceTimersByTimeAsync(1500)
        })

        expect(mockPut).toHaveBeenCalledWith('/api/v1/presentations/42/ai-state', { metadata, slides })
        expect(result.current.autoSaveStatus).toBe('saved')

        await act(async () => {
            await vi.advanceTimersByTimeAsync(2500)
        })
        expect(result.current.autoSaveStatus).toBe('idle')
    })

    it('resets the debounce timer on rapid successive calls, persisting only the latest state', async () => {
        sessionStorage.setItem('precue_active_presentation_id', '42')
        mockPut.mockResolvedValue({ data: {} })
        const { result } = renderHook(() => useAutoSave())

        const staleMetadata = { ...metadata, title: 'Stale' }
        const freshMetadata = { ...metadata, title: 'Fresh' }

        act(() => {
            result.current.scheduleAutoSave(slides, staleMetadata)
        })
        await act(async () => {
            await vi.advanceTimersByTimeAsync(1000)
        })
        act(() => {
            result.current.scheduleAutoSave(slides, freshMetadata)
        })
        await act(async () => {
            await vi.advanceTimersByTimeAsync(1500)
        })

        expect(mockPut).toHaveBeenCalledTimes(1)
        expect(mockPut).toHaveBeenCalledWith('/api/v1/presentations/42/ai-state', { metadata: freshMetadata, slides })
    })

    it('reports error status when the save request fails, then recovers to idle', async () => {
        sessionStorage.setItem('precue_active_presentation_id', '42')
        mockPut.mockRejectedValue(new Error('network down'))
        const { result } = renderHook(() => useAutoSave())

        act(() => {
            result.current.scheduleAutoSave(slides, metadata)
        })
        await act(async () => {
            await vi.advanceTimersByTimeAsync(1500)
        })

        expect(result.current.autoSaveStatus).toBe('error')

        await act(async () => {
            await vi.advanceTimersByTimeAsync(3000)
        })
        expect(result.current.autoSaveStatus).toBe('idle')
    })
})
