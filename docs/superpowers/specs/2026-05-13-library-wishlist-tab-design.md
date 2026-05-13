# Library — Wishlist Tab + Afficher Plus — Design Spec

**Date:** 2026-05-13
**Status:** Approved

## Objectif

Remplacer les filtres de tri (Date/Note/Titre) par un onglet Wishlist dans la bibliothèque, et limiter l'affichage initial à 5 items avec un bouton "Afficher plus" qui révèle tout d'un coup.

## Fichiers modifiés

### 1. `components/library/FilterPills.tsx`

**Changements :**
- Supprimer `Sort`, `onSort`, et les boutons Date/Note/Titre entièrement
- Ajouter `'wishlist'` au type `Filter` : `type Filter = MediaType | 'all' | 'wishlist'`
- Ajouter le pill `{ value: 'wishlist', label: 'Wishlist' }` en 5e position
- Supprimer le séparateur vertical entre type-filters et sort-buttons

**Interface finale :**
```ts
interface Props {
  filter: 'all' | 'movie' | 'tvshow' | 'game' | 'wishlist'
  onFilter: (f: Filter) => void
}
```

### 2. `app/(app)/library/page.tsx`

**Changements :**

**State :**
- Supprimer `sort: Sort` et son `useState`
- Ajouter `wishlistItems: MediaItem[]` et `wishlistLoading`
- Ajouter `showAll: boolean` (default `false`)

**Fetch :**
- Au mount : deux fetches en parallèle
  - `fetch('/api/media')` → items bibliothèque (wishlist=false)
  - `fetch('/api/media?wishlist=true')` → items wishlist

**Logique d'affichage :**
- Si `filter === 'wishlist'` : source = `wishlistItems`, pas de filtre par type
- Sinon : source = `items`, filtré par type si filter !== 'all'
- Recherche texte appliquée dans les deux cas
- Tri supprimé (ordre du serveur = date desc)
- `displayed` = liste filtrée complète
- `visible` = `showAll ? displayed : displayed.slice(0, 5)`

**Bouton "Afficher plus" :**
- Affiché si `!showAll && displayed.length > 5`
- Texte : `Afficher plus (${displayed.length - 5} de plus)`
- Au clic : `setShowAll(true)`
- Réinitialiser `showAll` à `false` quand `filter` change

**Suppression :**
- `handleDelete` retire l'item du bon state (`items` ou `wishlistItems`) selon `filter`

## Ce qui ne change pas

- `MediaCard.tsx` — aucun changement
- `api/media/route.ts` — supporte déjà `?wishlist=true` (paramètre existant)
- `lib/types.ts` — aucun changement
- La barre de recherche — conservée telle quelle
