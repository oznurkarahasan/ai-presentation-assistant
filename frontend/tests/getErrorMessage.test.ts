import { describe, it, expect } from 'vitest'
import { AxiosError, AxiosHeaders } from 'axios'
import { getErrorMessage } from '../app/lib/getErrorMessage'

function makeAxiosError(overrides: Partial<AxiosError>): AxiosError {
    const err = new AxiosError('Request failed')
    return Object.assign(err, overrides)
}

describe('getErrorMessage', () => {
    it('returns a network-down message for ERR_NETWORK', () => {
        const err = makeAxiosError({ code: 'ERR_NETWORK' })
        expect(getErrorMessage(err, 'fallback')).toMatch(/cannot connect to server/i)
    })

    it('returns a generic message for a 500 response, ignoring any detail field', () => {
        const err = makeAxiosError({
            response: {
                status: 500,
                statusText: 'Internal Server Error',
                headers: {},
                config: { headers: new AxiosHeaders() },
                data: { detail: 'leaked stack trace' },
            },
        })
        const message = getErrorMessage(err, 'fallback')
        expect(message).toMatch(/server error/i)
        expect(message).not.toContain('leaked stack trace')
    })

    it('surfaces the backend detail field for a 4xx response', () => {
        const err = makeAxiosError({
            response: {
                status: 400,
                statusText: 'Bad Request',
                headers: {},
                config: { headers: new AxiosHeaders() },
                data: { detail: 'This email is already registered.' },
            },
        })
        expect(getErrorMessage(err, 'fallback')).toBe('This email is already registered.')
    })

    it('falls back to the caller-provided message when the response has no detail field', () => {
        const err = makeAxiosError({
            response: {
                status: 422,
                statusText: 'Unprocessable Entity',
                headers: {},
                config: { headers: new AxiosHeaders() },
                data: {},
            },
        })
        expect(getErrorMessage(err, 'Something went wrong')).toBe('Something went wrong')
    })

    it('returns a no-response message when the request was sent but nothing came back', () => {
        const err = makeAxiosError({ request: {} })
        expect(getErrorMessage(err, 'fallback')).toMatch(/did not respond/i)
    })

    it('returns the fallback for a non-axios error', () => {
        expect(getErrorMessage(new Error('boom'), 'fallback message')).toBe('fallback message')
    })

    it('returns the fallback for a completely unexpected value', () => {
        expect(getErrorMessage('not even an error', 'fallback message')).toBe('fallback message')
        expect(getErrorMessage(null, 'fallback message')).toBe('fallback message')
    })
})
