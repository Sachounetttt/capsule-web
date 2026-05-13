'use client'
import { motion } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
import type { MediaItem } from '@/lib/types'

export default function RecentScroll({ items }: { items: MediaItem[] }) {
  return (
    <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar" style={{ scrollSnapType: 'x mandatory' }}>
      {items.map((item, i) => (
        <motion.div
          key={item.id}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.06, type: 'spring', stiffness: 300, damping: 25 }}
          style={{ scrollSnapAlign: 'start', flexShrink: 0 }}
        >
          <Link href={`/media/${item.id}`}>
            <div
              className="glass rounded-[12px] overflow-hidden relative"
              style={{ width: 112, height: 160 }}
            >
              {item.poster_url ? (
                <Image
                  src={item.poster_url}
                  alt={item.title}
                  fill
                  className="object-cover"
                  unoptimized
                />
              ) : (
                <div
                  className="w-full h-full flex items-center justify-center text-xs text-center px-2"
                  style={{ color: 'rgba(255,255,255,0.2)' }}
                >
                  {item.title}
                </div>
              )}
            </div>
          </Link>
        </motion.div>
      ))}
    </div>
  )
}
