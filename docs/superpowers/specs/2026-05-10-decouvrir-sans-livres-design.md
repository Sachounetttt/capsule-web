# Design : Onglet Découvrir + suppression des livres

**Date :** 2026-05-10
**Statut :** Approuvé

## Objectif

1. Supprimer complètement le type `book` de l'application (UI, types, APIs)
2. Ajouter un onglet "Découvrir" dans la nav avec un feed de propositions (films, séries, jeux)

---

## Partie 1 : Suppression des livres

### `lib/types.ts`
- `MediaType` : `'movie' | 'tvshow' | 'game'` (suppression de `'book'`)
- `MediaItem` : supprimer `author?: string`, `pages?: number`, `isbn?: string`
- `SearchResult` : supprimer `author?: string`, `pages?: number`, `isbn?: string`, `total_seasons` reste

### `lib/search.ts`
- Supprimer `buildBookResult` et `searchBooks`

### `lib/__tests__/search.test.ts`
- Supprimer le describe `buildBookResult` et son test
- Mettre à jour l'import pour retirer `buildBookResult`

### `app/api/search/route.ts`
- Supprimer `import { searchBooks }` et la branche `else if (type === 'book')`

### `components/nav/BottomNav.tsx`
- `mediaTypes` : retirer `{ type: 'book', label: 'Livre', icon: BookOpen }`
- **NE PAS** retirer `BookOpen` des imports — il est toujours utilisé pour l'onglet Bibliothèque

### `app/(app)/add/page.tsx`
- `types` array : retirer `{ value: 'book', label: 'Livre' }`
- Bloc `initial` de MediaForm : retirer `author`, `pages`
- Placeholder recherche : retirer le cas `livre`

### `components/add/MediaForm.tsx`
- Supprimer le bloc `{form.type === 'book' && (...)}`
- Supprimer `book` du CRITERIA map

### `components/library/FilterPills.tsx`
- Retirer `{ value: 'book', label: 'Livres' }` du tableau `filters`

### `components/detail/FinishFlow.tsx`
- Supprimer `book` du CRITERIA map

### `supabase/schema.sql`
- Mettre à jour le CHECK constraint : `CHECK (type IN ('movie', 'tvshow', 'game'))`
- Ajouter migration : `ALTER TABLE media_items DROP CONSTRAINT IF EXISTS media_items_type_check; ALTER TABLE media_items ADD CONSTRAINT media_items_type_check CHECK (type IN ('movie', 'tvshow', 'game'));`
- Les colonnes `author`, `pages`, `isbn` restent en DB (données existantes préservées)

---

## Partie 2 : Onglet Découvrir

### Navigation — `components/nav/BottomNav.tsx`

Ajouter `{ href: '/discover', icon: Compass, label: 'Découvrir' }` dans le tableau `tabs`, entre Accueil et Bibliothèque.

```
[ Accueil ]  [ Découvrir ]  [ Bibliothèque ]  [ + ]
```

### Route API — `app/api/top/route.ts` (nouvelle)

`GET /api/top?type=movie|game`
- `type=movie` → TMDB `https://api.themoviedb.org/3/movie/top_rated?api_key=...` → 6 résultats mappés avec `buildMovieResult`
- `type=game` → RAWG `https://api.rawg.io/api/games?ordering=-metacritic&page_size=6&key=...` → 6 résultats mappés avec `buildGameResult`

### Page Découvrir — `app/(app)/discover/page.tsx`

Client component. Charge 5 sections en parallèle au montage :

| Section | Endpoint | mediaType |
|---------|----------|-----------|
| Tendances Films | `/api/trending?type=movie` | `movie` |
| Tendances Séries | `/api/trending?type=tvshow` | `tvshow` |
| Tendances Jeux | `/api/trending?type=game` | `game` |
| Les mieux notés — Films | `/api/top?type=movie` | `movie` |
| Les mieux notés — Jeux | `/api/top?type=game` | `game` |

Réutilise `DiscoverSection` et `QuickAddSheet` existants sans modification.

### Layout page
```
h1 "Découvrir"
[ Tendances Films    →→→ ]
[ Tendances Séries   →→→ ]
[ Tendances Jeux     →→→ ]
[ Les mieux notés — Films →→→ ]
[ Les mieux notés — Jeux  →→→ ]
<QuickAddSheet />
```

---

## Périmètre exclu
- La page Accueil (home) n'est pas modifiée
- Les données livres existantes en DB ne sont pas supprimées
- Pas de section "Par genre" pour cette version
