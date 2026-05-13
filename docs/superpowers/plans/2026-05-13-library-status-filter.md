# Library Status Sub-Filter — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Tous / Terminé / En cours" second row of filter buttons below the type tabs, hidden on the Wishlist tab.

**Architecture:** `FilterPills` gains a second props pair (`statusFilter` + `onStatusFilter`) and renders a second row conditionally. `LibraryPage` adds a `statusFilter` state, resets it on tab change, and applies it in the `displayed` memo. Both types are exported from `FilterPills` and imported in the page.

**Tech Stack:** React 19, Next.js 16, Tailwind CSS

---

## Files

| Action | File |
|--------|------|
| Modify | `components/library/FilterPills.tsx` |
| Modify | `app/(app)/library/page.tsx` |

---

## Task 1: Update `FilterPills.tsx` — add status second row

**Files:**
- Modify: `components/library/FilterPills.tsx`

- [ ] **Step 1: Replace the entire file**

```tsx
'use client'
import type { MediaType } from '@/lib/types'

export type Filter = MediaType | 'all' | 'wishlist'
export type StatusFilter = 'all' | 'completed' | 'inProgress'

interface Props {
  filter: Filter
  onFilter: (f: Filter) => void
  statusFilter: StatusFilter
  onStatusFilter: (s: StatusFilter) => void
}

const filters: { value: Filter; label: string }[] = [
  { value: 'all', label: 'Tout' },
  { value: 'movie', label: 'Films' },
  { value: 'tvshow', label: 'Séries' },
  { value: 'game', label: 'Jeux' },
  { value: 'wishlist', label: 'Wishlist' },
]

const statusFilters: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'Tous' },
  { value: 'completed', label: 'Terminé' },
  { value: 'inProgress', label: 'En cours' },
]

export default function FilterPills({ filter, onFilter, statusFilter, onStatusFilter }: Props) {
  return (
    <div className="flex flex-col gap-2">
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
      {filter !== 'wishlist' && (
        <div className="flex gap-2">
          {statusFilters.map(s => (
            <button
              key={s.value}
              onClick={() => onStatusFilter(s.value)}
              className="shrink-0 px-3 py-1.5 rounded-full text-xs"
              style={{
                background: statusFilter === s.value ? 'rgba(124,58,237,0.2)' : 'transparent',
                color: statusFilter === s.value ? '#A78BFA' : 'rgba(255,255,255,0.3)',
              }}
            >
              {s.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npm run build
```

Expected: TypeScript error in `app/(app)/library/page.tsx` about missing `statusFilter`/`onStatusFilter` props — that's expected and fixed in Task 2. `FilterPills.tsx` itself compiles cleanly.

- [ ] **Step 3: Commit**

```bash
git add components/library/FilterPills.tsx
git commit -m "feat: FilterPills — status sub-filter row (Tous/Terminé/En cours)"
```

---

## Task 2: Update `LibraryPage` — statusFilter state + displayed logic

**Files:**
- Modify: `app/(app)/library/page.tsx`

- [ ] **Step 1: Replace the entire file**

```tsx
'use client'
import { useState, useEffect, useMemo } from 'react'
import { Search } from 'lucide-react'
import FilterPills, { type Filter, type StatusFilter } from '@/components/library/FilterPills'
import MediaCard from '@/components/library/MediaCard'
import ShimmerCard from '@/components/ui/ShimmerCard'
import type { MediaItem } from '@/lib/types'

export default function LibraryPage() {
  const [items, setItems] = useState<MediaItem[]>([])
  const [wishlistItems, setWishlistItems] = useState<MediaItem[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [showAll, setShowAll] = useState(false)

  useEffect(() => {
    Promise.allSettled([
      fetch('/api/media').then(r => r.json()),
      fetch('/api/media?wishlist=true').then(r => r.json()),
    ]).then(([lib, wish]) => {
      if (lib.status === 'fulfilled') setItems(Array.isArray(lib.value) ? lib.value : [])
      if (wish.status === 'fulfilled') setWishlistItems(Array.isArray(wish.value) ? wish.value : [])
      setLoading(false)
    })
  }, [])

  const displayed = useMemo(() => {
    const source = filter === 'wishlist' ? wishlistItems : items
    let list = [...source]
    if (filter !== 'all' && filter !== 'wishlist') list = list.filter(i => i.type === filter)
    if (statusFilter !== 'all') list = list.filter(i => i.status === statusFilter)
    if (query) list = list.filter(i => i.title.toLowerCase().includes(query.toLowerCase()))
    return list
  }, [items, wishlistItems, filter, statusFilter, query])

  const visible = useMemo(
    () => (showAll ? displayed : displayed.slice(0, 5)),
    [displayed, showAll]
  )

  function handleFilterChange(f: Filter) {
    setFilter(f)
    setStatusFilter('all')
    setShowAll(false)
  }

  function handleDelete(id: string) {
    setItems(prev => prev.filter(i => i.id !== id))
    setWishlistItems(prev => prev.filter(i => i.id !== id))
  }

  return (
    <div className="px-4 pb-4" style={{ paddingTop: '3.5rem' }}>
      <h1 className="text-3xl font-bold tracking-tight mb-4">Bibliothèque</h1>

      <div className="glass rounded-[12px] flex items-center gap-2 px-3 py-2 mb-3">
        <Search size={16} style={{ color: 'rgba(255,255,255,0.3)', flexShrink: 0 }} />
        <input
          value={query}
          onChange={e => { setQuery(e.target.value); setShowAll(false) }}
          placeholder="Rechercher..."
          className="bg-transparent flex-1 outline-none text-sm"
          style={{ color: 'white' }}
        />
      </div>

      <div className="mb-4">
        <FilterPills
          filter={filter}
          onFilter={handleFilterChange}
          statusFilter={statusFilter}
          onStatusFilter={setStatusFilter}
        />
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

Expected: `✓ Compiled successfully`, no TypeScript errors, 23 routes générées.

- [ ] **Step 3: Commit**

```bash
git add "app/(app)/library/page.tsx"
git commit -m "feat: library — status filter (Terminé/En cours), reset on tab change"
```

---

## Task 3: Push

- [ ] **Step 1: Push**

```bash
git push origin master
```

- [ ] **Step 2: Vérifier sur l'app**

1. `/library` → deuxième ligne "Tous | Terminé | En cours" visible sous les onglets type
2. Cliquer "Terminé" → seuls les items `status=completed` s'affichent
3. Cliquer "En cours" → seuls les items `status=inProgress`
4. Basculer sur "Wishlist" → deuxième ligne disparaît
5. Revenir sur "Tout" → deuxième ligne réapparaît, statut remis sur "Tous"
6. Combiner filtre type + filtre statut (ex: Films + Terminé) → les deux s'appliquent bien
