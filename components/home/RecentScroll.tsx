'use client'
import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { motion } from 'framer-motion'
import type { MediaItem } from '@/lib/types'

export default function RecentScroll({ items }: { items: MediaItem[] }) {
  type FriendReaction = { emoji: string; display_name: string }

  const [reactions, setReactions] = useState<Record<string, FriendReaction[]>>({})

  useEffect(() => {
    const ids = items.map(i => i.id).join(',')
    if (!ids) return
    fetch(`/api/reactions?item_ids=${ids}`)
      .then(r => r.json())
      .then((data: Record<string, { emoji: string; display_name: string; is_mine: boolean }[]>) => {
        const filtered: Record<string, FriendReaction[]> = {}
        for (const [id, rs] of Object.entries(data)) {
          filtered[id] = rs.filter(r => !r.is_mine)
        }
        setReactions(filtered)
      })
  }, [items])

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
          {(reactions[item.id] ?? []).length > 0 && (
            <div className="flex flex-wrap gap-x-2 gap-y-0.5 mt-1" style={{ width: 112 }}>
              {(reactions[item.id] ?? []).map((r, i) => (
                <span key={i} className="text-xs" style={{ color: 'rgba(255,255,255,0.6)' }}>
                  {r.emoji} {r.display_name.split(' ')[0]}
                </span>
              ))}
            </div>
          )}
        </motion.div>
      ))}
    </div>
  )
}
