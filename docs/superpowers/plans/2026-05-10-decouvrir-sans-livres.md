# Onglet Découvrir + suppression livres — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Supprimer complètement le type `book` de l'app et ajouter un onglet "Découvrir" avec un feed de propositions films/séries/jeux.

**Architecture:** 4 tâches séquentielles — suppression livre dans les fondations (types/API), suppression livre dans l'UI, nouvelle route `/api/top`, puis page Découvrir + onglet nav. Chaque tâche compile indépendamment.

**Tech Stack:** Next.js 16, React 19, TypeScript, TMDB API, RAWG API, Lucide React

---

## File Map

| Fichier | Action |
|---------|--------|
| `lib/types.ts` | Modifier — retirer 'book', author, pages, isbn |
| `lib/search.ts` | Modifier — retirer buildBookResult, searchBooks |
| `lib/__tests__/search.test.ts` | Modifier — retirer tests book |
| `app/api/search/route.ts` | Modifier — retirer branche book |
| `supabase/schema.sql` | Modifier — mettre à jour constraint |
| `components/nav/BottomNav.tsx` | Modifier — retirer book de mediaTypes, ajouter tab Découvrir + Compass |
| `app/(app)/add/page.tsx` | Modifier — retirer book du sélecteur et de initial |
| `components/add/MediaForm.tsx` | Modifier — retirer book de CRITERIA et champs book |
| `components/library/FilterPills.tsx` | Modifier — retirer filtre book |
| `components/detail/FinishFlow.tsx` | Modifier — retirer book de CRITERIA |
| `app/api/top/route.ts` | Créer — top rated films et jeux |
| `app/(app)/discover/page.tsx` | Créer — page Découvrir |

---

## Task 1 : Supprimer les livres — fondations

**Files:**
- Modify: `lib/types.ts`
- Modify: `lib/search.ts`
- Modify: `lib/__tests__/search.test.ts`
- Modify: `app/api/search/route.ts`
- Modify: `supabase/schema.sql`

- [ ] **Étape 1 — Mettre à jour `lib/types.ts`**

Lis le fichier. Appliquer ces changements :

1. `MediaType` : `'movie' | 'tvshow' | 'game'` (retirer `'book'`)
2. Dans `MediaItem` : supprimer les 3 lignes `author?: string`, `pages?: number`, `isbn?: string`
3. Dans `SearchResult` : supprimer les 3 lignes `author?: string`, `pages?: number`, `isbn?: string`

- [ ] **Étape 2 — Mettre à jour `lib/search.ts`**

Lis le fichier. Supprimer :
- La fonction `buildBookResult` et sa doc
- La fonction `searchBooks`
- La constante `OPENLIBRARY_BASE` ou `OPEN_LIBRARY` si elle existe (liée aux livres uniquement)

Les fonctions `buildMovieResult`, `buildTVResult`, `buildGameResult`, `searchMovies`, `searchTV`, `searchGames` restent intactes.

- [ ] **Étape 3 — Mettre à jour `lib/__tests__/search.test.ts`**

Lis le fichier. Appliquer :

1. Retirer `buildBookResult` de la ligne d'import :
```ts
import { buildMovieResult, buildTVResult, buildGameResult } from '@/lib/search'
```

2. Supprimer le bloc `describe('buildBookResult', ...)` et son contenu.

- [ ] **Étape 4 — Lancer les tests pour valider**

```bash
npm test -- --testPathPattern=search --no-coverage 2>&1 | tail -15
```
Attendu : PASS — tous les tests passent (les tests book ont disparu, les autres restent).

- [ ] **Étape 5 — Mettre à jour `app/api/search/route.ts`**

Lis le fichier. Appliquer :

1. Retirer `searchBooks` de l'import :
```ts
import { searchMovies, searchTV, searchGames } from '@/lib/search'
```

2. Supprimer la ligne `else if (type === 'book') results = await searchBooks(query)`

- [ ] **Étape 6 — Mettre à jour `supabase/schema.sql`**

Lis le fichier. Deux changements :

1. Dans le CREATE TABLE, mettre à jour le CHECK inline :
```sql
  type            text NOT NULL CHECK (type IN ('movie', 'tvshow', 'game')),
```

2. En fin de fichier, remplacer les lignes qui gèrent `media_items_type_check` par :
```sql
ALTER TABLE media_items DROP CONSTRAINT IF EXISTS media_items_type_check;
ALTER TABLE media_items ADD CONSTRAINT media_items_type_check CHECK (type IN ('movie', 'tvshow', 'game'));
```

- [ ] **Étape 7 — Vérifier la compilation**

```bash
npm run build 2>&1 | grep -E "(error TS|✓ Compiled)" | head -5
```
Attendu : `✓ Compiled successfully`

- [ ] **Étape 8 — Commit**

```bash
git add lib/types.ts lib/search.ts lib/__tests__/search.test.ts app/api/search/route.ts supabase/schema.sql
git commit -m "feat: remove book type from types, search functions and API"
```

---

## Task 2 : Supprimer les livres — UI

**Files:**
- Modify: `components/nav/BottomNav.tsx`
- Modify: `app/(app)/add/page.tsx`
- Modify: `components/add/MediaForm.tsx`
- Modify: `components/library/FilterPills.tsx`
- Modify: `components/detail/FinishFlow.tsx`

- [ ] **Étape 1 — `components/nav/BottomNav.tsx`**

Lis le fichier. Dans le tableau `mediaTypes`, supprimer l'entrée book :
```ts
const mediaTypes: { type: MediaType; label: string; icon: React.ElementType }[] = [
  { type: 'movie', label: 'Film', icon: Clapperboard },
  { type: 'tvshow', label: 'Série', icon: Tv },
  { type: 'game', label: 'Jeu', icon: Gamepad2 },
]
```
Ne pas retirer `BookOpen` des imports — il est utilisé pour l'onglet Bibliothèque.

- [ ] **Étape 2 — `app/(app)/add/page.tsx`**

Lis le fichier. Trois modifications :

**2a.** Tableau `types` :
```ts
const types: { value: MediaType; label: string }[] = [
  { value: 'movie', label: 'Film' },
  { value: 'tvshow', label: 'Série' },
  { value: 'game', label: 'Jeu' },
]
```

**2b.** Placeholder de recherche — supprimer le cas `livre` :
```tsx
placeholder={`Rechercher un ${
  mediaType === 'movie' ? 'film' :
  mediaType === 'tvshow' ? 'série' : 'jeu'
}...`}
```

**2c.** Dans le bloc `initial` de `<MediaForm>`, retirer `author: selected.author,` et `pages: selected.pages,`

- [ ] **Étape 3 — `components/add/MediaForm.tsx`**

Lis le fichier. Deux modifications :

**3a.** Dans `CRITERIA`, supprimer l'entrée `book` :
```ts
const CRITERIA: Record<string, { label: string; key: string }[]> = {
  movie: [ ... ],
  tvshow: [ ... ],
  game: [ ... ],
}
```

**3b.** Supprimer le bloc conditionnel book :
```tsx
// Supprimer ce bloc entier :
{form.type === 'book' && (
  <input ... placeholder="Nombre de pages (optionnel)" ... />
)}
```

- [ ] **Étape 4 — `components/library/FilterPills.tsx`**

Lis le fichier. Dans `filters`, supprimer `{ value: 'book', label: 'Livres' }` :
```ts
const filters: { value: Filter; label: string }[] = [
  { value: 'all', label: 'Tout' },
  { value: 'movie', label: 'Films' },
  { value: 'tvshow', label: 'Séries' },
  { value: 'game', label: 'Jeux' },
]
```

- [ ] **Étape 5 — `components/detail/FinishFlow.tsx`**

Lis le fichier. Dans `CRITERIA`, supprimer l'entrée `book` :
```ts
const CRITERIA: Record<string, { label: string; key: string }[]> = {
  movie: [ ... ],
  tvshow: [ ... ],
  game: [ ... ],
}
```

- [ ] **Étape 6 — Vérifier la compilation + tests**

```bash
npm run build 2>&1 | grep -E "(error TS|✓ Compiled)" | head -5
npm test -- --no-coverage 2>&1 | tail -8
```
Attendu : `✓ Compiled successfully` + tous les tests passent.

- [ ] **Étape 7 — Commit**

```bash
git add components/nav/BottomNav.tsx "app/(app)/add/page.tsx" components/add/MediaForm.tsx components/library/FilterPills.tsx components/detail/FinishFlow.tsx
git commit -m "feat: remove book from all UI components"
```

---

## Task 3 : Route /api/top

**Files:**
- Create: `app/api/top/route.ts`

- [ ] **Étape 1 — Créer `app/api/top/route.ts`**

```ts
import { NextRequest, NextResponse } from 'next/server'
import { buildMovieResult, buildGameResult } from '@/lib/search'

const TMDB_BASE = 'https://api.themoviedb.org/3'
const RAWG_BASE = 'https://api.rawg.io/api'

export async function GET(req: NextRequest) {
  const type = new URL(req.url).searchParams.get('type') ?? 'movie'

  if (type === 'game') {
    try {
      const res = await fetch(
        `${RAWG_BASE}/games?ordering=-metacritic&page_size=6&key=${process.env.RAWG_API_KEY}`
      )
      if (!res.ok) return NextResponse.json([], { status: 200 })
      const data = await res.json()
      return NextResponse.json((data.results ?? []).map(buildGameResult))
    } catch {
      return NextResponse.json([], { status: 200 })
    }
  }

  try {
    const res = await fetch(
      `${TMDB_BASE}/movie/top_rated?api_key=${process.env.TMDB_API_KEY}`
    )
    if (!res.ok) return NextResponse.json([], { status: 200 })
    const data = await res.json()
    return NextResponse.json((data.results ?? []).slice(0, 6).map(buildMovieResult))
  } catch {
    return NextResponse.json([], { status: 200 })
  }
}
```

- [ ] **Étape 2 — Vérifier la compilation**

```bash
npm run build 2>&1 | grep -E "(error TS|✓ Compiled)" | head -5
```
Attendu : `✓ Compiled successfully`

- [ ] **Étape 3 — Commit**

```bash
git add app/api/top/route.ts
git commit -m "feat: add /api/top route for top-rated movies and games"
```

---

## Task 4 : Page Découvrir + onglet nav

**Files:**
- Create: `app/(app)/discover/page.tsx`
- Modify: `components/nav/BottomNav.tsx`

- [ ] **Étape 1 — Créer `app/(app)/discover/page.tsx`**

```tsx
'use client'
import { useState, useEffect } from 'react'
import DiscoverSection from '@/components/home/DiscoverSection'
import QuickAddSheet from '@/components/home/QuickAddSheet'
import type { MediaType, SearchResult } from '@/lib/types'

export default function DiscoverPage() {
  const [trendingMovies, setTrendingMovies] = useState<SearchResult[]>([])
  const [trendingSeries, setTrendingSeries] = useState<SearchResult[]>([])
  const [trendingGames, setTrendingGames] = useState<SearchResult[]>([])
  const [topMovies, setTopMovies] = useState<SearchResult[]>([])
  const [topGames, setTopGames] = useState<SearchResult[]>([])
  const [loadingTrendingMovies, setLoadingTrendingMovies] = useState(true)
  const [loadingTrendingSeries, setLoadingTrendingSeries] = useState(true)
  const [loadingTrendingGames, setLoadingTrendingGames] = useState(true)
  const [loadingTopMovies, setLoadingTopMovies] = useState(true)
  const [loadingTopGames, setLoadingTopGames] = useState(true)
  const [selected, setSelected] = useState<{ item: SearchResult; type: MediaType } | null>(null)

  useEffect(() => {
    fetch('/api/trending?type=movie')
      .then(r => r.json()).then(d => setTrendingMovies(Array.isArray(d) ? d : [])).catch(() => setTrendingMovies([])).finally(() => setLoadingTrendingMovies(false))

    fetch('/api/trending?type=tvshow')
      .then(r => r.json()).then(d => setTrendingSeries(Array.isArray(d) ? d : [])).catch(() => setTrendingSeries([])).finally(() => setLoadingTrendingSeries(false))

    fetch('/api/trending?type=game')
      .then(r => r.json()).then(d => setTrendingGames(Array.isArray(d) ? d : [])).catch(() => setTrendingGames([])).finally(() => setLoadingTrendingGames(false))

    fetch('/api/top?type=movie')
      .then(r => r.json()).then(d => setTopMovies(Array.isArray(d) ? d : [])).catch(() => setTopMovies([])).finally(() => setLoadingTopMovies(false))

    fetch('/api/top?type=game')
      .then(r => r.json()).then(d => setTopGames(Array.isArray(d) ? d : [])).catch(() => setTopGames([])).finally(() => setLoadingTopGames(false))
  }, [])

  return (
    <>
      <div className="pb-4" style={{ paddingTop: '3.5rem' }}>
        <h1 className="text-3xl font-bold tracking-tight mb-6 px-4">Découvrir</h1>
        <DiscoverSection
          title="Tendances Films"
          items={trendingMovies}
          loading={loadingTrendingMovies}
          onSelect={item => setSelected({ item, type: 'movie' })}
        />
        <DiscoverSection
          title="Tendances Séries"
          items={trendingSeries}
          loading={loadingTrendingSeries}
          onSelect={item => setSelected({ item, type: 'tvshow' })}
        />
        <DiscoverSection
          title="Tendances Jeux"
          items={trendingGames}
          loading={loadingTrendingGames}
          onSelect={item => setSelected({ item, type: 'game' })}
        />
        <DiscoverSection
          title="Les mieux notés — Films"
          items={topMovies}
          loading={loadingTopMovies}
          onSelect={item => setSelected({ item, type: 'movie' })}
        />
        <DiscoverSection
          title="Les mieux notés — Jeux"
          items={topGames}
          loading={loadingTopGames}
          onSelect={item => setSelected({ item, type: 'game' })}
        />
      </div>
      <QuickAddSheet
        item={selected?.item ?? null}
        mediaType={selected?.type ?? 'movie'}
        onClose={() => setSelected(null)}
      />
    </>
  )
}
```

- [ ] **Étape 2 — Ajouter l'onglet Découvrir dans `components/nav/BottomNav.tsx`**

Lis le fichier. Deux modifications :

**2a.** Ajouter `Compass` à l'import lucide :
```ts
import { Home, BookOpen, Plus, X, Clapperboard, Tv, Gamepad2, Compass } from 'lucide-react'
```

**2b.** Ajouter l'onglet Découvrir dans `tabs` :
```ts
const tabs = [
  { href: '/', icon: Home, label: 'Accueil' },
  { href: '/discover', icon: Compass, label: 'Découvrir' },
  { href: '/library', icon: BookOpen, label: 'Bibliothèque' },
]
```

- [ ] **Étape 3 — Vérifier la compilation + tests**

```bash
npm run build 2>&1 | grep -E "(error TS|✓ Compiled)" | head -5
npm test -- --no-coverage 2>&1 | tail -8
```
Attendu : `✓ Compiled successfully` + tous les tests passent.

- [ ] **Étape 4 — Commit**

```bash
git add "app/(app)/discover/page.tsx" components/nav/BottomNav.tsx
git commit -m "feat: add Découvrir page with trending and top-rated sections"
```
