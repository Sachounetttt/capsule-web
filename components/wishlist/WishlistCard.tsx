'use client'
import Image from 'next/image'
import { motion, useMotionValue, useTransform, animate } from 'framer-motion'
import { Trash2 } from 'lucide-react'
import type { MediaItem } from '@/lib/types'

interface Props {
  item: MediaItem
  index: number
  onDelete: (id: string) => void
  onMoveToLibrary: (id: string) => void
}

const typeLabel: Record<string, string> = { movie: 'Film', tvshow: 'Série', book: 'Livre' }

export default function WishlistCard({ item, index, onDelete, onMoveToLibrary }: Props) {
  const x = useMotionValue(0)
  const deleteOpacity = useTransform(x, [-80, -40], [1, 0])

  async function handleDelete() {
    await fetch(`/api/media/${item.id}`, { method: 'DELETE' })
    onDelete(item.id)
  }

  async function handleMoveToLibrary() {
    await fetch(`/api/media/${item.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ wishlist: false, status: 'inProgress' }),
    })
    onMoveToLibrary(item.id)
  }

  return (
    <div className="relative overflow-hidden rounded-[20px]">
      <motion.div
        style={{ opacity: deleteOpacity }}
        className="absolute right-0 top-0 bottom-0 w-20 flex items-center justify-center"
        onClick={handleDelete}
      >
        <div className="absolute inset-0" style={{ background: 'rgba(248,113,113,0.15)' }} />
        <Trash2 size={20} style={{ color: '#F87171', position: 'relative' }} />
      </motion.div>

      <motion.div
        drag="x"
        dragConstraints={{ left: -80, right: 0 }}
        dragElastic={0.1}
        style={{ x }}
        onDragEnd={async (_, info) => {
          if (info.offset.x < -60) await animate(x, -80)
          else animate(x, 0)
        }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.06, type: 'spring', stiffness: 300, damping: 25 }}
        className="glass rounded-[20px] flex gap-3 p-3"
      >
        <div
          className="rounded-[10px] overflow-hidden relative shrink-0"
          style={{ width: 64, height: 88, background: 'rgba(255,255,255,0.05)' }}
        >
          {item.poster_url ? (
            <Image src={item.poster_url} alt={item.title} fill className="object-cover" unoptimized />
          ) : (
            <div
              className="w-full h-full flex items-center justify-center text-lg font-bold"
              style={{ color: 'rgba(255,255,255,0.2)' }}
            >
              {item.title[0]}
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0 py-1">
          <p className="text-xs mb-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
            {typeLabel[item.type]}{item.year ? ` · ${item.year}` : ''}
          </p>
          <h3 className="font-semibold text-sm leading-tight mb-3 truncate">{item.title}</h3>
          <button
            onClick={handleMoveToLibrary}
            className="text-xs px-3 py-1 rounded-full font-medium"
            style={{
              background: 'rgba(124,58,237,0.2)',
              color: 'var(--color-purple)',
              border: '1px solid rgba(124,58,237,0.3)',
            }}
          >
            → Déplacer dans la bibliothèque
          </button>
        </div>
      </motion.div>
    </div>
  )
}
