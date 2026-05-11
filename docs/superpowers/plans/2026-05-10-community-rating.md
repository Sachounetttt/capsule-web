# Notes communautaires — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Capturer la note communautaire (TMDB pour films/séries, RAWG pour jeux) au moment de l'ajout et l'afficher sur la page détail.

**Architecture:** On étend les builders de recherche existants pour extraire `vote_average` (TMDB) et `rating` (RAWG), on stocke `community_rating` + `community_rating_source` en DB via le flow d'ajout existant (qui spread déjà tout le payload), et on l'affiche sur la page détail.

**Tech Stack:** Next.js 16, TypeScript, Supabase, TMDB API, RAWG API

---

## File Map

| Fichier | Action |
|---------|--------|
| `lib/types.ts` | Modifier — ajouter `community_rating` et `community_rating_source` |
| `supabase/schema.sql` | Modifier — 2 nouvelles colonnes |
| `lib/search.ts` | Modifier — extraire la note dans les builders |
| `lib/__tests__/search.test.ts` | Modifier — tests des nouveaux champs |
| `app/(app)/add/page.tsx` | Modifier — passer les champs dans initial + quick-save |
| `components/home/QuickAddSheet.tsx` | Modifier — passer les champs dans addToWishlist |
| `app/(app)/media/[id]/page.tsx` | Modifier — afficher la note communautaire |

---

## Task 1 : Types, DB et builders de recherche

**Files:**
- Modify: `lib/types.ts`
- Modify: `supabase/schema.sql`
- Modify: `lib/search.ts`
- Modify: `lib/__tests__/search.test.ts`

- [ ] **Étape 1 — Ajouter les champs dans `lib/types.ts`**

Lis le fichier. Ajouter dans `SearchResult` après `developer?: string` :
```ts
  community_rating?: number
  community_rating_source?: string
```

Ajouter dans `MediaItem` après `developer?: string` :
```ts
  community_rating?: number
  community_rating_source?: string
```

- [ ] **Étape 2 — Ajouter les colonnes dans `supabase/schema.sql`**

Ajouter à la fin du fichier :
```sql
ALTER TABLE media_items ADD COLUMN IF NOT EXISTS community_rating float;
ALTER TABLE media_items ADD COLUMN IF NOT EXISTS community_rating_source text;
```

- [ ] **Étape 3 — Appliquer en base**

Dans Supabase Dashboard → SQL Editor, exécuter :
```sql
ALTER TABLE media_items ADD COLUMN IF NOT EXISTS community_rating float;
ALTER TABLE media_items ADD COLUMN IF NOT EXISTS community_rating_source text;
```

- [ ] **Étape 4 — Écrire les tests en premier (TDD)**

Dans `lib/__tests__/search.test.ts`, ajouter après les tests existants :

```ts
describe('community_rating extraction', () => {
  it('buildMovieResult extrait vote_average comme community_rating TMDB', () => {
    const raw = {
      title: 'Inception',
      release_date: '2010-07-16',
      poster_path: '/path.jpg',
      vote_average: 8.8,
    }
    const result = buildMovieResult(raw)
    expect(result.community_rating).toBe(8.8)
    expect(result.community_rating_source).toBe('TMDB')
  })

  it('buildMovieResult gère vote_average absent', () => {
    const result = buildMovieResult({ title: 'Test', release_date: null, poster_path: null })
    expect(result.community_rating).toBeUndefined()
  })

  it('buildGameResult extrait rating comme community_rating RAWG', () => {
    const raw = {
      name: 'Elden Ring',
      released: '2022-02-25',
      background_image: 'https://media.rawg.io/elden.jpg',
      rating: 4.47,
    }
    const result = buildGameResult(raw)
    expect(result.community_rating).toBe(4.47)
    expect(result.community_rating_source).toBe('RAWG')
  })

  it('buildGameResult gère rating absent', () => {
    const result = buildGameResult({ name: 'Test', released: null, background_image: null })
    expect(result.community_rating).toBeUndefined()
  })
})
```

- [ ] **Étape 5 — Lancer les tests pour confirmer l'échec**

```bash
npm test -- --testPathPattern=search --no-coverage 2>&1 | tail -15
```
Attendu : FAIL — `community_rating` et `community_rating_source` sont `undefined`

- [ ] **Étape 6 — Mettre à jour les builders dans `lib/search.ts`**

Mettre à jour `buildMovieResult` :
```ts
export function buildMovieResult(raw: Record<string, unknown>): SearchResult {
  return {
    title: raw.title as string,
    year: raw.release_date
      ? parseInt((raw.release_date as string).slice(0, 4))
      : undefined,
    poster_url: raw.poster_path
      ? `${TMDB_IMG}${raw.poster_path}`
      : undefined,
    community_rating: raw.vote_average ? (raw.vote_average as number) : undefined,
    community_rating_source: raw.vote_average ? 'TMDB' : undefined,
  }
}
```

Mettre à jour `buildTVResult` :
```ts
export function buildTVResult(raw: Record<string, unknown>): SearchResult {
  return {
    title: raw.name as string,
    year: raw.first_air_date
      ? parseInt((raw.first_air_date as string).slice(0, 4))
      : undefined,
    poster_url: raw.poster_path
      ? `${TMDB_IMG}${raw.poster_path}`
      : undefined,
    community_rating: raw.vote_average ? (raw.vote_average as number) : undefined,
    community_rating_source: raw.vote_average ? 'TMDB' : undefined,
  }
}
```

Mettre à jour `buildGameResult` :
```ts
export function buildGameResult(raw: Record<string, unknown>): SearchResult {
  return {
    title: raw.name as string,
    year: raw.released ? parseInt((raw.released as string).slice(0, 4)) : undefined,
    poster_url: (raw.background_image as string | null) ?? undefined,
    community_rating: raw.rating ? (raw.rating as number) : undefined,
    community_rating_source: raw.rating ? 'RAWG' : undefined,
  }
}
```

- [ ] **Étape 7 — Relancer les tests**

```bash
npm test -- --testPathPattern=search --no-coverage 2>&1 | tail -15
```
Attendu : PASS — tous les tests passent (anciens + nouveaux)

- [ ] **Étape 8 — Vérifier la compilation**

```bash
npm run build 2>&1 | grep -E "(error TS|✓ Compiled)" | head -5
```
Attendu : `✓ Compiled successfully`

- [ ] **Étape 9 — Commit**

```bash
git add lib/types.ts supabase/schema.sql lib/search.ts lib/__tests__/search.test.ts
git commit -m "feat: extract community_rating from TMDB and RAWG search builders"
```

---

## Task 2 : Passer community_rating dans les flows d'ajout

**Files:**
- Modify: `app/(app)/add/page.tsx`
- Modify: `components/home/QuickAddSheet.tsx`

- [ ] **Étape 1 — Lis `app/(app)/add/page.tsx`**

Repère deux endroits :
- Le bloc `initial={selected ? { ... } : ...}` passé à `<MediaForm>`
- Le bloc wishlist quick-save avec `onClick={() => handleSubmit({ title: selected.title, ... })`

- [ ] **Étape 2 — Ajouter les champs dans `initial` de MediaForm**

Dans le bloc `initial={selected ? { ... } : ...}`, ajouter après `developer: selected.developer,` :
```tsx
community_rating: selected.community_rating,
community_rating_source: selected.community_rating_source,
```

- [ ] **Étape 3 — Ajouter les champs dans le quick-save wishlist**

Dans le `onClick` du bouton wishlist quick-save, ajouter après `wishlist: true,` :
```ts
community_rating: selected.community_rating,
community_rating_source: selected.community_rating_source,
```

Le bloc complet doit ressembler à :
```tsx
onClick={() => handleSubmit({
  type: mediaType,
  title: selected.title,
  year: selected.year,
  poster_url: selected.poster_url,
  status: 'inProgress',
  notes: '',
  wishlist: true,
  community_rating: selected.community_rating,
  community_rating_source: selected.community_rating_source,
})}
```

- [ ] **Étape 4 — Lis `components/home/QuickAddSheet.tsx`**

Repère la fonction `addToWishlist` qui fait `fetch('/api/media', { body: JSON.stringify({ ... }) })`.

- [ ] **Étape 5 — Ajouter les champs dans addToWishlist**

Dans le `JSON.stringify({ ... })`, ajouter après `wishlist: true,` :
```ts
community_rating: item.community_rating,
community_rating_source: item.community_rating_source,
```

- [ ] **Étape 6 — Vérifier la compilation**

```bash
npm run build 2>&1 | grep -E "(error TS|✓ Compiled)" | head -5
```
Attendu : `✓ Compiled successfully`

- [ ] **Étape 7 — Commit**

```bash
git add "app/(app)/add/page.tsx" components/home/QuickAddSheet.tsx
git commit -m "feat: pass community_rating through add and quick-save flows"
```

---

## Task 3 : Affichage sur la page détail

**Files:**
- Modify: `app/(app)/media/[id]/page.tsx`

- [ ] **Étape 1 — Lis le fichier**

Repère le bloc :
```tsx
<div className="flex items-center gap-3 flex-wrap">
  <StatusBadge status={item.status as MediaStatus} />
  {item.rating && !ratingsJson ? <StarRating value={item.rating} readonly /> : null}
</div>
```

- [ ] **Étape 2 — Ajouter l'affichage de la note communautaire**

Remplacer ce bloc par :
```tsx
<div className="flex items-center gap-3 flex-wrap">
  <StatusBadge status={item.status as MediaStatus} />
  {item.rating && !ratingsJson ? <StarRating value={item.rating} readonly /> : null}
  {item.community_rating != null && (
    <span
      className="text-xs px-2 py-1 rounded-full"
      style={{
        background: 'rgba(255,255,255,0.08)',
        border: '1px solid rgba(255,255,255,0.15)',
        color: 'rgba(255,255,255,0.7)',
      }}
    >
      {item.community_rating.toFixed(1)} · {item.community_rating_source}
    </span>
  )}
</div>
```

- [ ] **Étape 3 — Vérifier la compilation**

```bash
npm run build 2>&1 | grep -E "(error TS|✓ Compiled)" | head -5
```
Attendu : `✓ Compiled successfully`

- [ ] **Étape 4 — Lancer tous les tests**

```bash
npm test -- --no-coverage 2>&1 | tail -8
```
Attendu : tous les tests passent.

- [ ] **Étape 5 — Commit**

```bash
git add "app/(app)/media/[id]/page.tsx"
git commit -m "feat: display community rating on media detail page"
```
