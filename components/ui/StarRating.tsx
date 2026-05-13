'use client'
import { motion } from 'framer-motion'
import { Star } from 'lucide-react'

interface Props {
  value: number
  onChange?: (v: number) => void
  readonly?: boolean
}

export default function StarRating({ value, onChange, readonly }: Props) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(star => {
        const isFull = star <= value
        const isHalf = !isFull && star - 0.5 === value

        return (
          <motion.div
            key={star}
            className="relative"
            style={{ width: 20, height: 20 }}
            whileTap={readonly ? undefined : { scale: 1.4 }}
          >
            {/* Empty star (background) */}
            <Star
              size={20}
              style={{
                fill: 'none',
                color: 'rgba(255,255,255,0.2)',
                position: 'absolute',
                top: 0,
                left: 0,
                pointerEvents: 'none',
              }}
            />
            {/* Filled overlay — full or half via clipPath */}
            {(isFull || isHalf) && (
              <Star
                size={20}
                style={{
                  fill: 'var(--color-purple)',
                  color: 'var(--color-purple)',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  clipPath: isHalf ? 'inset(0 50% 0 0)' : undefined,
                  pointerEvents: 'none',
                }}
              />
            )}
            {/* Click zones — only when interactive */}
            {!readonly && (
              <>
                <button
                  type="button"
                  onClick={() => onChange?.(star - 0.5)}
                  aria-label={`${star - 0.5} étoiles`}
                  className="absolute inset-y-0 left-0"
                  style={{ width: '50%', background: 'transparent' }}
                />
                <button
                  type="button"
                  onClick={() => onChange?.(star)}
                  aria-label={`${star} étoiles`}
                  className="absolute inset-y-0 right-0"
                  style={{ width: '50%', background: 'transparent' }}
                />
              </>
            )}
          </motion.div>
        )
      })}
    </div>
  )
}
