# Library Wishlist Tab + Afficher Plus — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace sort filters (Date/Note/Titre) with a Wishlist tab, and show 5 items by default with a "Afficher plus" button that reveals everything at once.

**Architecture:** `FilterPills` loses its sort props and gains a `wishlist` value. `LibraryPage` fetches library and wishlist in parallel at mount, derives `displayed` from the active source, slices to 5 unless `showAll=true`, resets `showAll` on tab change.

**Tech Stack:** React 19, Next.js 16, framer-motion, Tailwind CSS

---

## Files

| Action | File |
|--------|------|
| Modify | `components/library/FilterPills.tsx` |
| Modify | `app/(app)/library/page.tsx` |

---

## Task 1: Simplify `FilterPills.tsx` — remove sort, add Wishlist

**Files:**
- Modify: `components/library/FilterPills.tsx`

- [ ] **Step 1: Replace the entire file**

```tsx
'use client'
import type { MediaType } from '@/lib/types'

export type Filter = MediaType | 'all' | 'wishlist'

interface Props {
  filter: Filter
  onFilter: (f: Filter) => void
}

const filters: { value: Filter; label: string }[] = [
  { value: 'all', label: 'Tout' },
  { value: 'movie', label: 'Films' },
  { value: 'tvshow', label: 'Séries' },
  { value: 'game', label: 'Jeux' },
  { value: 'wishlist', label: 'Wishlist' },
]

export default function FilterPills({ filter, onFilter }: Props) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
      {filters.map(f => (
        <button
          key={f.value}
          onClick={() => onFilter(f.value)}
          className="shrink-0 px-4 py-1.5 rounded-full text-sm font-medium"
          style={{
            background: filter === f.value ? '#7C3AED' : 'rgba(255,255,255,0.05)',
            color: filter === f.value ? 'white' : 'rgba(255,255,255,0.5)',
            border: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          {f.label}
        </button>
      ))}
    </div>
  )
}
```

Note: `Filter` is exported so `LibraryPage` can import it directly from this file.

- [ ] **Step 2: Verify TypeScript**

```bash
npm run build
```

Expected: TypeScript errors about `sort` and `onSort` props being passed from `LibraryPage` — that's expected, Task 2 will fix them.

- [ ] **Step 3: Commit**

```bash
git add components/library/FilterPills.tsx
git commit -m "feat: FilterPills — remove sort, add Wishlist tab"
```

---

## Task 2: Rewrite `LibraryPage` — parallel fetches + showAll

**Files:**
- Modify: `app/(app)/library/page.tsx`

- [ ] **Step 1: Replace the entire file**

```tsx
'use client'
import { useState, useEffect, useMemo } from 'react'
import { Search } from 'lucide-react'
import FilterPills, { type Filter } from '@/components/library/FilterPills'
import MediaCard from '@/components/library/MediaCard'
import ShimmerCard from '@/components/ui/ShimmerCard'
import type { MediaItem } from '@/lib/types'

export default function LibraryPage() {
  const [items, setItems] = useState<MediaItem[]>([])
  const [wishlistItems, setWishlistItems] = useState<MediaItem[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [showAll, setShowAll] = useState(false)

  useEffect(() => {
    Promise.all([
      fetch('/api/media').then(r => r.json()),
      fetch('/api/media?wishlist=true').then(r => r.json()),
    ])
      .then(([lib, wish]) => {
        setItems(Array.isArray(lib) ? lib : [])
        setWishlistItems(Array.isArray(wish) ? wish : [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const displayed = useMemo(() => {
    const source = filter === 'wishlist' ? wishlistItems : items
    let list = [...source]
    if (filter !== 'all' && filter !== 'wishlist') list = list.filter(i => i.type === filter)
    if (query) list = list.filter(i => i.title.toLowerCase().includes(query.toLowerCase()))
    return list
  }, [items, wishlistItems, filter, query])

  const visible = useMemo(
    () => (showAll ? displayed : displayed.slice(0, 5)),
    [displayed, showAll]
  )

  function handleFilterChange(f: Filter) {
    setFilter(f)
    setShowAll(false)
  }

  function handleDelete(id: string) {
    if (filter === 'wishlist') {
      setWishlistItems(prev => prev.filter(i => i.id !== id))
    } else {
      setItems(prev => prev.filter(i => i.id !== id))
    }
  }

  return (
    <div className="px-4 pb-4" style={{ paddingTop: '3.5rem' }}>
      <h1 className="text-3xl font-bold tracking-tight mb-4">Bibliothèque</h1>

      <div className="glass rounded-[12px] flex items-center gap-2 px-3 py-2 mb-3">
        <Search size={16} style={{ color: 'rgba(255,255,255,0.3)', flexShrink: 0 }} />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Rechercher..."
          className="bg-transparent flex-1 outline-none text-sm"
          style={{ color: 'white' }}
        />
      </div>

      <div className="mb-4">
        <FilterPills filter={filter} onFilter={handleFilterChange} />
      </div>

      <div className="flex flex-col gap-3">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <ShimmerCard key={i} className="h-24" />
            ))
          : visible.map((item, i) => (
              <MediaCard key={item.id} item={item} index={i} onDelete={handleDelete} />
            ))
        }
        {!loading && displayed.length === 0 && (
          <p
            className="text-center py-12 text-sm"
            style={{ color: 'rgba(255,255,255,0.3)' }}
          >
            Aucun élément
          </p>
        )}
      </div>

      {!loading && !showAll && displayed.length > 5 && (
        <button
          onClick={() => setShowAll(true)}
          className="w-full mt-3 py-3 rounded-[12px] text-sm font-medium"
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            color: 'rgba(255,255,255,0.5)',
          }}
        >
          Afficher plus ({displayed.length - 5} de plus)
        </button>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npm run build
```

Expected: `✓ Compiled successfully`, no TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add "app/(app)/library/page.tsx"
git commit -m "feat: library — wishlist tab, parallel fetch, afficher plus"
```

---

## Task 3: Push

- [ ] **Step 1: Push**

```bash
git push origin master
```

- [ ] **Step 2: Vérifier sur l'app**

1. Ouvrir `/library` → 5 items max visibles, bouton "Afficher plus (N de plus)" si > 5
2. Cliquer "Afficher plus" → tous les items apparaissent, bouton disparaît
3. Cliquer "Wishlist" → liste wishlist, bouton "Afficher plus" si > 5
4. Changer d'onglet → `showAll` se reset, retour à 5 items
5. Vérifier que Date/Note/Titre ont disparu
