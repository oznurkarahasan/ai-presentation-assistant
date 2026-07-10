import { describe, it, expect, beforeEach } from 'vitest'
import type { InternalAxiosRequestConfig } from 'axios'
import client from '../app/api/client'

/**
 * client.ts wires two interceptors that every authenticated request in the
 * app depends on: attaching the bearer token from localStorage, and clearing
 * it on a 401 so a stale token doesn't get silently retried forever. Axios
 * doesn't expose a public way to invoke interceptors without a real network
 * call, so we reach into the (stable, widely-relied-upon) internal
 * `interceptors.request/response.handlers` array — the same pattern used
 * across the axios ecosystem for interceptor unit tests.
 */
type Handler<T> = { fulfilled: T; rejected?: (error: unknown) => unknown }

function getRequestInterceptor() {
    const handlers = (client.interceptors.request as unknown as { handlers: Handler<(config: InternalAxiosRequestConfig) => InternalAxiosRequestConfig>[] }).handlers
    return handlers[0].fulfilled
}

function getResponseErrorInterceptor() {
    const handlers = (client.interceptors.response as unknown as { handlers: Handler<unknown>[] }).handlers
    return handlers[0].rejected as (error: unknown) => Promise<unknown>
}

describe('api client request interceptor', () => {
    beforeEach(() => {
        localStorage.clear()
    })

    it('attaches a Bearer Authorization header when a token is stored', () => {
        localStorage.setItem('access_token', 'abc123')
        const config = getRequestInterceptor()({ headers: {} } as InternalAxiosRequestConfig)
        expect(config.headers.Authorization).toBe('Bearer abc123')
    })

    it('does not attach an Authorization header when no token is stored', () => {
        const config = getRequestInterceptor()({ headers: {} } as InternalAxiosRequestConfig)
        expect(config.headers.Authorization).toBeUndefined()
    })
})

describe('api client response interceptor', () => {
    beforeEach(() => {
        localStorage.clear()
    })

    it('clears the stored token on a 401 response', async () => {
        localStorage.setItem('access_token', 'abc123')
        const error = { response: { status: 401 } }
        await expect(getResponseErrorInterceptor()(error)).rejects.toEqual(error)
        expect(localStorage.getItem('access_token')).toBeNull()
    })

    it('leaves the stored token intact for a non-401 error', async () => {
        localStorage.setItem('access_token', 'abc123')
        const error = { response: { status: 500 } }
        await expect(getResponseErrorInterceptor()(error)).rejects.toEqual(error)
        expect(localStorage.getItem('access_token')).toBe('abc123')
    })

    it('leaves the stored token intact for a network error with no response', async () => {
        localStorage.setItem('access_token', 'abc123')
        const error = { request: {} }
        await expect(getResponseErrorInterceptor()(error)).rejects.toEqual(error)
        expect(localStorage.getItem('access_token')).toBe('abc123')
    })
})
