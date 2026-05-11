'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Search } from 'lucide-react'
import WishlistCard from '@/components/wishlist/WishlistCard'
import ShimmerCard from '@/components/ui/ShimmerCard'
import type { MediaItem } from '@/lib/types'

export default function WishlistPage() {
  const router = useRouter()
  const [items, setItems] = useState<MediaItem[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')

  useEffect(() => {
    fetch('/api/media?wishlist=true')
      .then(r => r.json())
      .then(data => { setItems(Array.isArray(data) ? data : []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const displayed = query
    ? items.filter(i => i.title.toLowerCase().includes(query.toLowerCase()))
    : items

  function handleDelete(id: string) {
    setItems(prev => prev.filter(i => i.id !== id))
  }

  function handleMoveToLibrary(id: string) {
    setItems(prev => prev.filter(i => i.id !== id))
    router.push('/library')
  }

  return (
    <div className="px-4 pb-4" style={{ paddingTop: '3.5rem' }}>
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/"
          className="glass rounded-full flex items-center justify-center shrink-0"
          style={{ width: 36, height: 36 }}
        >
          <ArrowLeft size={18} />
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Ma wishlist</h1>
      </div>

      <div className="glass rounded-[12px] flex items-center gap-2 px-3 py-2 mb-4">
        <Search size={16} style={{ color: 'rgba(255,255,255,0.3)', flexShrink: 0 }} />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Rechercher..."
          className="bg-transparent flex-1 outline-none text-sm"
          style={{ color: 'white' }}
        />
      </div>

      <div className="flex flex-col gap-3">
        {loading
          ? Array.from({ length: 3 }).map((_, i) => <ShimmerCard key={i} className="h-24" />)
          : displayed.map((item, i) => (
              <WishlistCard
                key={item.id}
                item={item}
                index={i}
                onDelete={handleDelete}
                onMoveToLibrary={handleMoveToLibrary}
              />
            ))
        }
        {!loading && displayed.length === 0 && (
          <p className="text-center py-12 text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>
            {query ? 'Aucun résultat' : 'Ta wishlist est vide'}
          </p>
        )}
      </div>
    </div>
  )
}
