import { hexFromRgb } from '@/lib/color'

describe('color extraction', () => {
  it('hexFromRgb convertit les composantes RGB en hex', () => {
    expect(hexFromRgb(124, 58, 237)).toBe('#7c3aed')
    expect(hexFromRgb(0, 0, 0)).toBe('#000000')
    expect(hexFromRgb(255, 255, 255)).toBe('#ffffff')
  })
})
