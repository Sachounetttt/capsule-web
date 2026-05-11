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
      {[1, 2, 3, 4, 5].map(star => (
        <motion.button
          key={star}
          type="button"
          disabled={readonly}
          onClick={() => onChange?.(star)}
          whileTap={readonly ? undefined : { scale: 1.4 }}
          className="p-0.5 disabled:cursor-default"
        >
          <Star
            size={20}
            style={{
              fill: star <= value ? 'var(--color-purple)' : 'none',
              color: star <= value ? 'var(--color-purple)' : 'rgba(255,255,255,0.2)',
            }}
          />
        </motion.button>
      ))}
    </div>
  )
}
