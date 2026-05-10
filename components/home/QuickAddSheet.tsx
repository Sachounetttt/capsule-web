'use client'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { X, Library, Heart } from 'lucide-react'
import Image from 'next/image'
import type { MediaType, SearchResult } from '@/lib/types'

interface Props {
  item: SearchResult | null
  mediaType: MediaType
  onClose: () => void
}

export default function QuickAddSheet({ item, mediaType, onClose }: Props) {
  const router = useRouter()

  async function addToWishlist() {
    if (!item) return
    await fetch('/api/media', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: mediaType,
        title: item.title,
        year: item.year,
        poster_url: item.poster_url,
        status: 'inProgress',
        notes: '',
        wishlist: true,
        community_rating: item.community_rating,
        community_rating_source: item.community_rating_source,
      }),
    })
    onClose()
  }

  function addToLibrary() {
    if (!item) return
    const params = new URLSearchParams()
    params.set('type', mediaType)
    params.set('title', item.title)
    if (item.year) params.set('year', String(item.year))
    if (item.poster_url) params.set('poster_url', item.poster_url)
    router.push(`/add?${params.toString()}`)
    onClose()
  }

  return (
    <AnimatePresence>
      {item && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40"
            style={{ background: 'rgba(0,0,0,0.7)' }}
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed bottom-0 left-0 right-0 glass z-50"
            style={{ borderRadius: '28px 28px 0 0', padding: '24px 24px 48px' }}
          >
            <div className="flex items-center gap-3 mb-6">
              {item.poster_url && (
                <div className="rounded-[10px] overflow-hidden relative shrink-0" style={{ width: 48, height: 64 }}>
                  <Image src={item.poster_url} alt={item.title} fill className="object-cover" unoptimized />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">{item.title}</p>
                {item.year && (
                  <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>{item.year}</p>
                )}
              </div>
              <button
                onClick={onClose}
                className="glass rounded-full flex items-center justify-center shrink-0"
                style={{ width: 32, height: 32 }}
              >
                <X size={16} />
              </button>
            </div>
            <div className="flex flex-col gap-3">
              <button
                onClick={addToLibrary}
                className="glass rounded-[12px] px-4 py-3 flex items-center gap-3 text-sm font-medium"
              >
                <Library size={18} style={{ color: 'var(--color-purple)' }} />
                Ajouter à la bibliothèque
              </button>
              <button
                onClick={addToWishlist}
                className="glass rounded-[12px] px-4 py-3 flex items-center gap-3 text-sm font-medium"
              >
                <Heart size={18} style={{ color: '#F87171' }} />
                Ajouter à la wishlist
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
