'use client'
import Image from 'next/image'
import { motion } from 'framer-motion'

interface Props {
  posterUrl?: string
  title: string
  itemId: string
  dominantColor?: string
  mediaType?: string
}

export default function PosterHero({ posterUrl, title, itemId, dominantColor, mediaType }: Props) {
  return (
    <div className="relative w-full overflow-hidden" style={{ height: 288 }}>
      {dominantColor && (
        <div
          className="absolute inset-0"
          style={{
            background: `radial-gradient(ellipse at center, ${dominantColor}60, transparent 70%)`,
          }}
        />
      )}
      <motion.div
        layoutId={`card-${itemId}`}
        className="w-full h-full"
      >
        {posterUrl ? (
          <Image
            src={posterUrl}
            alt={title}
            fill
            className="object-cover"
            unoptimized
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center text-4xl font-bold"
            style={{
              color: 'rgba(255,255,255,0.2)',
              background: dominantColor ? `${dominantColor}30` : 'rgba(255,255,255,0.05)',
            }}
          >
            {title[0]}
          </div>
        )}
      </motion.div>
      {/* Gradient fade at bottom */}
      <div
        className="absolute bottom-0 left-0 right-0"
        style={{
          height: 128,
          background: 'linear-gradient(to top, var(--color-bg), transparent)',
        }}
      />
    </div>
  )
}
