'use client'
import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { motion } from 'framer-motion'
import type { MediaItem } from '@/lib/types'

export default function WishlistPreview() {
  const [items, setItems] = useState<MediaItem[]>([])

  useEffect(() => {
    fetch('/api/media?wishlist=true')
      .then(r => r.json())
      .then(data => setItems(Array.isArray(data) ? data.slice(0, 6) : []))
      .catch(() => setItems([]))
  }, [])

  if (items.length === 0) return null

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3 px-4">
        <h2
          className="text-sm font-semibold uppercase tracking-widest"
          style={{ color: 'rgba(255,255,255,0.4)' }}
        >
          Ma wishlist
        </h2>
        <Link
          href="/wishlist"
          className="text-xs font-medium"
          style={{ color: 'var(--color-purple)' }}
        >
          Voir tout →
        </Link>
      </div>
      <div
        className="flex gap-3 overflow-x-auto pb-2 no-scrollbar px-4"
        style={{ scrollSnapType: 'x mandatory' }}
      >
        {items.map((item, i) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05, type: 'spring', stiffness: 300, damping: 25 }}
            style={{ scrollSnapAlign: 'start', flexShrink: 0 }}
          >
            <Link href="/wishlist">
              <div
                className="glass rounded-[12px] overflow-hidden relative"
                style={{ width: 96, height: 136 }}
              >
                {item.poster_url ? (
                  <Image src={item.poster_url} alt={item.title} fill className="object-cover" unoptimized />
                ) : (
                  <div
                    className="w-full h-full flex items-center justify-center text-xs text-center px-2"
                    style={{ color: 'rgba(255,255,255,0.3)' }}
                  >
                    {item.title}
                  </div>
                )}
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
