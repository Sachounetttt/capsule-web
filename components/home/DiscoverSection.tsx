'use client'
import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'
import ShimmerCard from '@/components/ui/ShimmerCard'
import type { SearchResult } from '@/lib/types'

interface Props {
  title: string
  items: SearchResult[]
  loading: boolean
  getHref: (item: SearchResult) => string
}

export default function DiscoverSection({ title, items, loading, getHref }: Props) {
  if (!loading && items.length === 0) return null

  return (
    <div className="mb-6">
      <h2
        className="text-sm font-semibold uppercase tracking-widest mb-3 px-4"
        style={{ color: 'rgba(255,255,255,0.4)' }}
      >
        {title}
      </h2>
      <div
        className="flex gap-3 overflow-x-auto pb-2 no-scrollbar px-4"
        style={{ scrollSnapType: 'x mandatory' }}
      >
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} style={{ width: 96, height: 136, flexShrink: 0 }}>
                <ShimmerCard className="h-full" />
              </div>
            ))
          : items.map((item, i) => (
              <Link
                key={`${item.title}-${i}`}
                href={getHref(item)}
                style={{ flexShrink: 0, scrollSnapAlign: 'start', display: 'block', width: 96, height: 136 }}
              >
                <motion.div
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05, type: 'spring', stiffness: 300, damping: 25 }}
                  className="rounded-[12px] overflow-hidden relative glass w-full h-full"
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
                      style={{ color: 'rgba(255,255,255,0.3)' }}
                    >
                      {item.title}
                    </div>
                  )}
                </motion.div>
              </Link>
            ))
        }
      </div>
    </div>
  )
}
