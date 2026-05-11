import { hashPin, verifyPin } from '@/lib/pin'

process.env.PIN_SALT = 'test_salt'

describe('PIN auth', () => {
  it('hashPin produit un hash SHA-256 hex 64 chars', () => {
    const hash = hashPin('1234')
    expect(hash).toHaveLength(64)
    expect(hash).toMatch(/^[a-f0-9]+$/)
  })

  it('hashPin est déterministe avec le même sel', () => {
    expect(hashPin('1234')).toBe(hashPin('1234'))
  })

  it('verifyPin retourne true si le PIN est correct', () => {
    const hash = hashPin('1234')
    expect(verifyPin('1234', hash)).toBe(true)
  })

  it('verifyPin retourne false si le PIN est incorrect', () => {
    const hash = hashPin('1234')
    expect(verifyPin('9999', hash)).toBe(false)
  })
})
