import { renderHook, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { hasValidAccessToken, useRequireAuth } from '../app/hooks/useRequireAuth'

const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
    useRouter: () => ({ push: mockPush }),
}))

describe('hasValidAccessToken', () => {
    beforeEach(() => {
        localStorage.clear()
    })

    it('returns false when nothing is stored', () => {
        expect(hasValidAccessToken()).toBe(false)
    })

    it('returns true for a real token', () => {
        localStorage.setItem('access_token', 'a-real-jwt')
        expect(hasValidAccessToken()).toBe(true)
    })

    it('returns false for the literal string "undefined"', () => {
        // Can happen if a caller does localStorage.setItem('access_token', String(undefinedValue))
        localStorage.setItem('access_token', 'undefined')
        expect(hasValidAccessToken()).toBe(false)
    })

    it('returns false for the literal string "null"', () => {
        localStorage.setItem('access_token', 'null')
        expect(hasValidAccessToken()).toBe(false)
    })

    it('returns false for an empty string', () => {
        localStorage.setItem('access_token', '')
        expect(hasValidAccessToken()).toBe(false)
    })
})

describe('useRequireAuth', () => {
    beforeEach(() => {
        localStorage.clear()
        mockPush.mockClear()
    })

    it('redirects to the default /login when there is no token', async () => {
        const { result } = renderHook(() => useRequireAuth())
        await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/login'))
        expect(result.current.isChecking).toBe(true)
    })

    it('redirects to a custom path when provided', async () => {
        renderHook(() => useRequireAuth('/signin'))
        await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/signin'))
    })

    it('does not redirect and clears isChecking when a valid token exists', async () => {
        localStorage.setItem('access_token', 'a-real-jwt')
        const { result } = renderHook(() => useRequireAuth())
        await waitFor(() => expect(result.current.isChecking).toBe(false))
        expect(mockPush).not.toHaveBeenCalled()
    })
})
