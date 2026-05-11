# Jeux vidéo — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajouter `game` comme type de média à part entière — tendances RAWG sur la home, recherche, ajout en bibliothèque/wishlist avec plateforme et développeur.

**Architecture:** On étend le pattern existant movie/tvshow/book : une fonction `buildGameResult` + `searchGames` dans `lib/search.ts`, branchée dans les routes `/api/trending` et `/api/search`, puis exposée dans le `DiscoverClient` (home) et la page `/add`.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind 4, RAWG API (rawg.io), Lucide React (icône Gamepad2)

---

## File Map

| Fichier | Action | Rôle |
|---------|--------|------|
| `lib/types.ts` | Modifier | Ajouter `'game'` à `MediaType`, `platform`/`developer` aux interfaces |
| `supabase/schema.sql` | Modifier | Colonnes `platform` et `developer` |
| `lib/search.ts` | Modifier | `buildGameResult` + `searchGames` |
| `lib/__tests__/search.test.ts` | Modifier | Tests du builder RAWG |
| `app/api/trending/route.ts` | Modifier | Branche RAWG si `type=game` |
| `app/api/search/route.ts` | Modifier | Branche RAWG si `type=game` |
| `.env.local` | Modifier | Ajouter `RAWG_API_KEY` |
| `components/home/DiscoverClient.tsx` | Modifier | Sections séries + jeux, types corrects |
| `components/home/QuickAddSheet.tsx` | Modifier | `mediaType: MediaType` (était `'movie' \| 'tvshow'`) |
| `app/(app)/add/page.tsx` | Modifier | Option `game` dans le sélecteur de type + placeholder |
| `components/add/MediaForm.tsx` | Modifier | Champs `platform` et `developer` pour `game` |

---

## Task 1 : Types & schéma DB

**Files:**
- Modify: `lib/types.ts`
- Modify: `supabase/schema.sql`

- [ ] **Étape 1 — Mettre à jour `lib/types.ts`**

Remplacer le contenu entier par :

```ts
export type MediaType = 'movie' | 'tvshow' | 'book' | 'game'
export type MediaStatus = 'completed' | 'inProgress' | 'dropped' | 'abandoned'

export interface MediaItem {
  id: string
  type: MediaType
  title: string
  year?: number
  status: MediaStatus
  rating?: number
  notes: string
  date_added: string
  date_completed?: string
  poster_url?: string
  dominant_color?: string
  genre?: string
  director?: string
  seasons_watched?: number
  total_seasons?: number
  author?: string
  pages?: number
  isbn?: string
  platform?: string
  developer?: string
  wishlist?: boolean
}

export interface SearchResult {
  title: string
  year?: number
  poster_url?: string
  genre?: string
  director?: string
  author?: string
  pages?: number
  total_seasons?: number
  isbn?: string
  platform?: string
  developer?: string
}
```

- [ ] **Étape 2 — Ajouter les colonnes dans `supabase/schema.sql`**

Ajouter à la fin du fichier :

```sql
ALTER TABLE media_items ADD COLUMN IF NOT EXISTS platform text;
ALTER TABLE media_items ADD COLUMN IF NOT EXISTS developer text;
```

- [ ] **Étape 3 — Appliquer en base**

Dans Supabase Dashboard → **SQL Editor**, coller et exécuter :
```sql
ALTER TABLE media_items ADD COLUMN IF NOT EXISTS platform text;
ALTER TABLE media_items ADD COLUMN IF NOT EXISTS developer text;
```

- [ ] **Étape 4 — Vérifier la compilation TypeScript**

```bash
npm run build 2>&1 | head -20
```

Attendu : `✓ Compiled successfully` (peut échouer sur supabaseUrl si pas de .env.local complet, c'est normal — seule la partie TypeScript compte).

- [ ] **Étape 5 — Commit**

```bash
git add lib/types.ts supabase/schema.sql
git commit -m "feat: add game MediaType with platform and developer fields"
```

---

## Task 2 : RAWG search — lib/search.ts

**Files:**
- Modify: `lib/search.ts`
- Modify: `lib/__tests__/search.test.ts`

- [ ] **Étape 1 — Écrire le test en premier**

Dans `lib/__tests__/search.test.ts` :
1. Mettre à jour la ligne d'import existante (ligne 1) pour y ajouter `buildGameResult` :
```ts
import { buildMovieResult, buildTVResult, buildBookResult, buildGameResult } from '@/lib/search'
```
2. Ajouter à la fin du fichier :

```ts
describe('buildGameResult', () => {
  it('extrait name, released et background_image', () => {
    const raw = {
      name: 'Elden Ring',
      released: '2022-02-25',
      background_image: 'https://media.rawg.io/elden.jpg',
    }
    const result = buildGameResult(raw)
    expect(result.title).toBe('Elden Ring')
    expect(result.year).toBe(2022)
    expect(result.poster_url).toBe('https://media.rawg.io/elden.jpg')
  })

  it('gère background_image null', () => {
    const result = buildGameResult({ name: 'Test', released: null, background_image: null })
    expect(result.poster_url).toBeUndefined()
    expect(result.year).toBeUndefined()
  })
})
```

- [ ] **Étape 2 — Lancer le test pour confirmer l'échec**

```bash
npm test -- --testPathPattern=search --no-coverage 2>&1 | tail -20
```

Attendu : `FAIL` — `buildGameResult is not exported`

- [ ] **Étape 3 — Implémenter `buildGameResult` et `searchGames` dans `lib/search.ts`**

Ajouter à la fin du fichier (après `searchBooks`) :

```ts
const RAWG_BASE = 'https://api.rawg.io/api'

export function buildGameResult(raw: Record<string, unknown>): SearchResult {
  return {
    title: raw.name as string,
    year: raw.released ? parseInt((raw.released as string).slice(0, 4)) : undefined,
    poster_url: (raw.background_image as string | null) ?? undefined,
  }
}

export async function searchGames(query: string): Promise<SearchResult[]> {
  const res = await fetch(
    `${RAWG_BASE}/games?search=${encodeURIComponent(query)}&page_size=8&key=${process.env.RAWG_API_KEY}`
  )
  if (!res.ok) return []
  const data = await res.json()
  return (data.results ?? []).map(buildGameResult)
}
```

- [ ] **Étape 4 — Relancer le test**

```bash
npm test -- --testPathPattern=search --no-coverage 2>&1 | tail -20
```

Attendu : `PASS` — 5 tests passent.

- [ ] **Étape 5 — Commit**

```bash
git add lib/search.ts lib/__tests__/search.test.ts
git commit -m "feat: add RAWG buildGameResult and searchGames"
```

---

## Task 3 : API routes + variable d'env

**Files:**
- Modify: `app/api/trending/route.ts`
- Modify: `app/api/search/route.ts`
- Modify: `.env.local`

- [ ] **Étape 1 — Ajouter `RAWG_API_KEY` dans `.env.local`**

Ajouter la ligne suivante dans `.env.local` :
```
RAWG_API_KEY=<ta clé depuis rawg.io/apidocs — inscription gratuite>
```

Créer un compte sur [rawg.io/apidocs](https://rawg.io/apidocs) si pas encore fait, puis copier la clé dans **API key** section.

- [ ] **Étape 2 — Mettre à jour `/api/trending/route.ts`**

Remplacer le contenu entier par :

```ts
import { NextRequest, NextResponse } from 'next/server'
import type { SearchResult } from '@/lib/types'
import { buildGameResult } from '@/lib/search'

const TMDB_BASE = 'https://api.themoviedb.org/3'
const TMDB_IMG = 'https://image.tmdb.org/t/p/w500'
const RAWG_BASE = 'https://api.rawg.io/api'

export async function GET(req: NextRequest) {
  const type = new URL(req.url).searchParams.get('type') ?? 'movie'

  if (type === 'game') {
    try {
      const res = await fetch(
        `${RAWG_BASE}/games?ordering=-added&page_size=6&key=${process.env.RAWG_API_KEY}`
      )
      if (!res.ok) return NextResponse.json([], { status: 200 })
      const data = await res.json()
      return NextResponse.json((data.results ?? []).map(buildGameResult))
    } catch {
      return NextResponse.json([], { status: 200 })
    }
  }

  const endpoint = type === 'tvshow' ? 'tv' : 'movie'
  try {
    const res = await fetch(
      `${TMDB_BASE}/trending/${endpoint}/week?api_key=${process.env.TMDB_API_KEY}`
    )
    if (!res.ok) return NextResponse.json([], { status: 200 })
    const data = await res.json()
    const results: SearchResult[] = (data.results ?? []).slice(0, 6).map((r: Record<string, unknown>) => ({
      title: (r.title ?? r.name) as string,
      year: r.release_date
        ? parseInt((r.release_date as string).slice(0, 4))
        : r.first_air_date
          ? parseInt((r.first_air_date as string).slice(0, 4))
          : undefined,
      poster_url: r.poster_path ? `${TMDB_IMG}${r.poster_path}` : undefined,
    }))
    return NextResponse.json(results)
  } catch {
    return NextResponse.json([], { status: 200 })
  }
}
```

- [ ] **Étape 3 — Mettre à jour `/api/search/route.ts`**

Remplacer le contenu entier par :

```ts
import { NextRequest, NextResponse } from 'next/server'
import { searchMovies, searchTV, searchBooks, searchGames } from '@/lib/search'
import type { MediaType, SearchResult } from '@/lib/types'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const query = searchParams.get('q')
  const type = searchParams.get('type') as MediaType | null

  if (!query || query.length < 2) {
    return NextResponse.json({ error: 'Requête trop courte' }, { status: 400 })
  }

  try {
    let results: SearchResult[]
    if (type === 'movie') results = await searchMovies(query)
    else if (type === 'tvshow') results = await searchTV(query)
    else if (type === 'book') results = await searchBooks(query)
    else if (type === 'game') results = await searchGames(query)
    else results = []

    return NextResponse.json(results)
  } catch {
    return NextResponse.json({ error: 'Erreur de recherche' }, { status: 500 })
  }
}
```

- [ ] **Étape 4 — Vérifier la compilation**

```bash
npm run build 2>&1 | grep -E "(error|Error|✓ Compiled)"
```

Attendu : `✓ Compiled successfully`

- [ ] **Étape 5 — Commit**

```bash
git add app/api/trending/route.ts app/api/search/route.ts
git commit -m "feat: add game support to trending and search API routes"
```

---

## Task 4 : Home — DiscoverClient + QuickAddSheet

**Files:**
- Modify: `components/home/DiscoverClient.tsx`
- Modify: `components/home/QuickAddSheet.tsx`

- [ ] **Étape 1 — Mettre à jour `QuickAddSheet.tsx`**

Remplacer la Props interface et l'import pour accepter `MediaType` :

```tsx
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
```

- [ ] **Étape 2 — Mettre à jour `DiscoverClient.tsx`**

Remplacer le contenu entier par :

```tsx
'use client'
import { useState, useEffect } from 'react'
import DiscoverSection from './DiscoverSection'
import QuickAddSheet from './QuickAddSheet'
import type { MediaType, SearchResult } from '@/lib/types'

export default function DiscoverClient() {
  const [trendingMovies, setTrendingMovies] = useState<SearchResult[]>([])
  const [trendingSeries, setTrendingSeries] = useState<SearchResult[]>([])
  const [trendingGames, setTrendingGames] = useState<SearchResult[]>([])
  const [similar, setSimilar] = useState<SearchResult[]>([])
  const [loadingMovies, setLoadingMovies] = useState(true)
  const [loadingSeries, setLoadingSeries] = useState(true)
  const [loadingGames, setLoadingGames] = useState(true)
  const [loadingSimilar, setLoadingSimilar] = useState(true)
  const [selected, setSelected] = useState<{ item: SearchResult; type: MediaType } | null>(null)

  useEffect(() => {
    fetch('/api/trending?type=movie')
      .then(r => r.json())
      .then(data => setTrendingMovies(Array.isArray(data) ? data : []))
      .catch(() => setTrendingMovies([]))
      .finally(() => setLoadingMovies(false))

    fetch('/api/trending?type=tvshow')
      .then(r => r.json())
      .then(data => setTrendingSeries(Array.isArray(data) ? data : []))
      .catch(() => setTrendingSeries([]))
      .finally(() => setLoadingSeries(false))

    fetch('/api/trending?type=game')
      .then(r => r.json())
      .then(data => setTrendingGames(Array.isArray(data) ? data : []))
      .catch(() => setTrendingGames([]))
      .finally(() => setLoadingGames(false))

    fetch('/api/similar')
      .then(r => r.json())
      .then(data => setSimilar(Array.isArray(data) ? data : []))
      .catch(() => setSimilar([]))
      .finally(() => setLoadingSimilar(false))
  }, [])

  return (
    <>
      <DiscoverSection
        title="Tendances Films"
        items={trendingMovies}
        loading={loadingMovies}
        onSelect={item => setSelected({ item, type: 'movie' })}
      />
      <DiscoverSection
        title="Tendances Séries"
        items={trendingSeries}
        loading={loadingSeries}
        onSelect={item => setSelected({ item, type: 'tvshow' })}
      />
      <DiscoverSection
        title="Tendances Jeux"
        items={trendingGames}
        loading={loadingGames}
        onSelect={item => setSelected({ item, type: 'game' })}
      />
      <DiscoverSection
        title="Tu pourrais aimer"
        items={similar}
        loading={loadingSimilar}
        onSelect={item => setSelected({ item, type: 'movie' })}
      />
      <QuickAddSheet
        item={selected?.item ?? null}
        mediaType={selected?.type ?? 'movie'}
        onClose={() => setSelected(null)}
      />
    </>
  )
}
```

- [ ] **Étape 3 — Vérifier la compilation**

```bash
npm run build 2>&1 | grep -E "(error|Error|✓ Compiled)"
```

Attendu : `✓ Compiled successfully`

- [ ] **Étape 4 — Commit**

```bash
git add components/home/DiscoverClient.tsx components/home/QuickAddSheet.tsx
git commit -m "feat: add séries and jeux trending sections to home"
```

---

## Task 5 : Page /add + MediaForm

**Files:**
- Modify: `app/(app)/add/page.tsx`
- Modify: `components/add/MediaForm.tsx`

- [ ] **Étape 1 — Ajouter `game` dans le sélecteur de type de `add/page.tsx`**

Localiser le tableau `types` ligne 10-14 et le remplacer :

```ts
const types: { value: MediaType; label: string }[] = [
  { value: 'movie', label: 'Film' },
  { value: 'tvshow', label: 'Série' },
  { value: 'book', label: 'Livre' },
  { value: 'game', label: 'Jeu' },
]
```

- [ ] **Étape 2 — Mettre à jour le placeholder de recherche dans `add/page.tsx`**

Localiser la ligne avec `placeholder={...}` (autour de la ligne 143) et remplacer :

```tsx
placeholder={`Rechercher un ${
  mediaType === 'movie' ? 'film' :
  mediaType === 'tvshow' ? 'série' :
  mediaType === 'game' ? 'jeu' : 'livre'
}...`}
```

- [ ] **Étape 3 — Passer `platform` et `developer` dans `initial` de `MediaForm`**

Localiser le bloc `initial={selected ? { ... } : ...}` (autour ligne 193) et ajouter les deux champs dans l'objet `selected` :

```tsx
initial={
  selected
    ? {
        type: mediaType,
        title: selected.title,
        year: selected.year,
        poster_url: selected.poster_url,
        director: selected.director,
        author: selected.author,
        pages: selected.pages,
        total_seasons: selected.total_seasons,
        platform: selected.platform,
        developer: selected.developer,
        status: 'inProgress',
        notes: '',
      }
    : { type: mediaType, status: 'inProgress', notes: '' }
}
```

- [ ] **Étape 4 — Ajouter les champs `platform` et `developer` dans `MediaForm.tsx`**

Ajouter le bloc jeu après le bloc `{form.type === 'book' && ...}` (ligne ~122) :

```tsx
{form.type === 'game' && (
  <>
    <input
      value={form.platform ?? ''}
      onChange={e => update('platform', e.target.value || undefined)}
      placeholder="Plateforme (PS5, PC, Switch…)"
      style={inputStyle}
    />
    <input
      value={form.developer ?? ''}
      onChange={e => update('developer', e.target.value || undefined)}
      placeholder="Développeur (optionnel)"
      style={inputStyle}
    />
  </>
)}
```

- [ ] **Étape 5 — Vérifier la compilation**

```bash
npm run build 2>&1 | grep -E "(error|Error|✓ Compiled)"
```

Attendu : `✓ Compiled successfully`

- [ ] **Étape 6 — Lancer tous les tests**

```bash
npm test -- --no-coverage 2>&1 | tail -15
```

Attendu : tous les tests passent.

- [ ] **Étape 7 — Commit final**

```bash
git add app/\(app\)/add/page.tsx components/add/MediaForm.tsx
git commit -m "feat: add game type to add page and MediaForm with platform/developer fields"
```
