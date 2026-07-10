import { describe, it, expect } from 'vitest'
import { isSlideLayoutId, SLIDE_LAYOUT_IDS, SLIDE_LAYOUT_ICONS } from '../app/lib/slideLayouts'

describe('isSlideLayoutId', () => {
    it.each(SLIDE_LAYOUT_IDS)('accepts the known layout id "%s"', (id) => {
        expect(isSlideLayoutId(id)).toBe(true)
    })

    it('rejects an unknown layout id', () => {
        expect(isSlideLayoutId('carousel')).toBe(false)
    })

    it('rejects an empty string', () => {
        expect(isSlideLayoutId('')).toBe(false)
    })

    it('is case-sensitive', () => {
        expect(isSlideLayoutId('Standard')).toBe(false)
    })
})

describe('SLIDE_LAYOUT_ICONS', () => {
    it('has an icon for every known layout id', () => {
        for (const id of SLIDE_LAYOUT_IDS) {
            expect(SLIDE_LAYOUT_ICONS[id]).toBeTruthy()
        }
    })
})
