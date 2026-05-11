import { createHash, timingSafeEqual } from 'crypto'

export function hashPin(pin: string): string {
  return createHash('sha256')
    .update(pin + process.env.PIN_SALT!)
    .digest('hex')
}

export function verifyPin(input: string, storedHash: string): boolean {
  const a = Buffer.from(hashPin(input), 'hex')
  const b = Buffer.from(storedHash, 'hex')
  return a.length === b.length && timingSafeEqual(a, b)
}
