import { act, renderHook } from '@testing-library/react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { useZoomFullscreen } from '../app/hooks/useZoomFullscreen'

function setFullscreenElement(el: Element | null) {
    Object.defineProperty(document, 'fullscreenElement', {
        configurable: true,
        get: () => el,
    })
}

describe('useZoomFullscreen', () => {
    afterEach(() => {
        setFullscreenElement(null)
        // @ts-expect-error - jsdom doesn't implement the Fullscreen API; tests assign it directly
        delete document.documentElement.requestFullscreen
        // @ts-expect-error - same as above
        delete document.exitFullscreen
    })

    it('starts at the default 150% zoom and not fullscreen', () => {
        const { result } = renderHook(() => useZoomFullscreen())
        expect(result.current.zoom).toBe(150)
        expect(result.current.isFullscreen).toBe(false)
    })

    it('zooms in by 25, capped at 200', () => {
        const { result } = renderHook(() => useZoomFullscreen())
        act(() => result.current.setZoom(190))
        act(() => result.current.handleZoomIn())
        expect(result.current.zoom).toBe(200)
        act(() => result.current.handleZoomIn())
        expect(result.current.zoom).toBe(200)
    })

    it('zooming in from "fit" (0) jumps to 125, not 25', () => {
        const { result } = renderHook(() => useZoomFullscreen())
        act(() => result.current.handleZoomFit())
        act(() => result.current.handleZoomIn())
        expect(result.current.zoom).toBe(125)
    })

    it('zooms out by 25, floored at 50', () => {
        const { result } = renderHook(() => useZoomFullscreen())
        act(() => result.current.setZoom(60))
        act(() => result.current.handleZoomOut())
        expect(result.current.zoom).toBe(50)
        act(() => result.current.handleZoomOut())
        expect(result.current.zoom).toBe(50)
    })

    it('zooming out from "fit" (0) jumps to 75, not -25', () => {
        const { result } = renderHook(() => useZoomFullscreen())
        act(() => result.current.handleZoomFit())
        act(() => result.current.handleZoomOut())
        expect(result.current.zoom).toBe(75)
    })

    it('handleZoomFit sets zoom to 0 regardless of current zoom', () => {
        const { result } = renderHook(() => useZoomFullscreen())
        act(() => result.current.setZoom(175))
        act(() => result.current.handleZoomFit())
        expect(result.current.zoom).toBe(0)
    })

    it('entering fullscreen requests it and optimistically sets isFullscreen true', () => {
        const requestFullscreen = vi.fn().mockResolvedValue(undefined)
        document.documentElement.requestFullscreen = requestFullscreen
        const { result } = renderHook(() => useZoomFullscreen())

        act(() => result.current.handleToggleFullscreen())

        expect(requestFullscreen).toHaveBeenCalledTimes(1)
        expect(result.current.isFullscreen).toBe(true)
    })

    it('exiting fullscreen calls exitFullscreen and optimistically sets isFullscreen false', () => {
        const exitFullscreen = vi.fn().mockResolvedValue(undefined)
        document.exitFullscreen = exitFullscreen
        setFullscreenElement(document.body)
        const { result } = renderHook(() => useZoomFullscreen())

        act(() => result.current.handleToggleFullscreen())

        expect(exitFullscreen).toHaveBeenCalledTimes(1)
        expect(result.current.isFullscreen).toBe(false)
    })

    it('does not throw when the Fullscreen API is unavailable', () => {
        const { result } = renderHook(() => useZoomFullscreen())
        expect(() => act(() => result.current.handleToggleFullscreen())).not.toThrow()
    })

    it('syncs isFullscreen when the browser fires fullscreenchange externally (e.g. pressing Esc)', () => {
        const { result } = renderHook(() => useZoomFullscreen())

        setFullscreenElement(document.body)
        act(() => {
            document.dispatchEvent(new Event('fullscreenchange'))
        })
        expect(result.current.isFullscreen).toBe(true)

        setFullscreenElement(null)
        act(() => {
            document.dispatchEvent(new Event('fullscreenchange'))
        })
        expect(result.current.isFullscreen).toBe(false)
    })

    it('removes the fullscreenchange listener on unmount', () => {
        const removeSpy = vi.spyOn(document, 'removeEventListener')
        const { unmount } = renderHook(() => useZoomFullscreen())
        unmount()
        expect(removeSpy).toHaveBeenCalledWith('fullscreenchange', expect.any(Function))
    })
})
