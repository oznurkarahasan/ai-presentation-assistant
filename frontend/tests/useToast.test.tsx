import { act, renderHook } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useToast } from '../app/hooks/useToast'

describe('useToast', () => {
    beforeEach(() => {
        vi.useFakeTimers()
    })

    afterEach(() => {
        vi.useRealTimers()
    })

    it('starts with no toast', () => {
        const { result } = renderHook(() => useToast())
        expect(result.current.toast).toBeNull()
    })

    it('shows a toast with the given type and message', () => {
        const { result } = renderHook(() => useToast())
        act(() => result.current.showToast('success', 'Saved!'))
        expect(result.current.toast).toEqual({ type: 'success', message: 'Saved!' })
    })

    it('auto-dismisses after 4 seconds', () => {
        const { result } = renderHook(() => useToast())
        act(() => result.current.showToast('error', 'Something broke'))
        expect(result.current.toast).not.toBeNull()

        act(() => vi.advanceTimersByTime(4000))
        expect(result.current.toast).toBeNull()
    })

    it('does not dismiss early, before the 4-second window elapses', () => {
        const { result } = renderHook(() => useToast())
        act(() => result.current.showToast('success', 'Saved!'))

        act(() => vi.advanceTimersByTime(3000))
        expect(result.current.toast).not.toBeNull()
    })

    it('replacing a toast before it dismisses resets the timer to the new message', () => {
        const { result } = renderHook(() => useToast())
        act(() => result.current.showToast('success', 'First'))
        act(() => vi.advanceTimersByTime(3000))
        act(() => result.current.showToast('error', 'Second'))
        act(() => vi.advanceTimersByTime(3000))

        // 3s (old timer, now superseded) + 3s (new timer) = 6s since 'Second' was
        // shown at t=3s, but only 3s of *its own* window has elapsed -> still visible.
        expect(result.current.toast).toEqual({ type: 'error', message: 'Second' })
    })
})
