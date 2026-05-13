# Library Status Sub-Filter — Design Spec

**Date:** 2026-05-13
**Status:** Approved

## Objectif

Ajouter une deuxième ligne de filtres "Tous / Terminé / En cours" dans la bibliothèque, visible uniquement sur les onglets Tout/Film/Série/Jeux (pas sur Wishlist).

## Fichiers modifiés

### 1. `components/library/FilterPills.tsx`

**Nouvelles props :**
```ts
statusFilter: 'all' | 'completed' | 'inProgress'
onStatusFilter: (s: 'all' | 'completed' | 'inProgress') => void
```

**Comportement :**
- Afficher une deuxième ligne uniquement quand `filter !== 'wishlist'`
- Trois boutons : `Tous` | `Terminé` | `En cours`
- Style : plus petit que les pills du dessus, discret — même pattern que les anciens boutons Date/Note/Titre (texte `rgba(255,255,255,0.5)`, actif `rgba(124,58,237,0.2)` + texte `#A78BFA`)

**Interface finale :**
```ts
interface Props {
  filter: Filter
  onFilter: (f: Filter) => void
  statusFilter: 'all' | 'completed' | 'inProgress'
  onStatusFilter: (s: 'all' | 'completed' | 'inProgress') => void
}
```

### 2. `app/(app)/library/page.tsx`

**Nouveau state :**
```ts
const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'inProgress'>('all')
```

**`handleFilterChange` — reset statusFilter quand on change d'onglet :**
```ts
function handleFilterChange(f: Filter) {
  setFilter(f)
  setShowAll(false)
  setStatusFilter('all')
}
```

**`displayed` — appliquer le filtre statut après le filtre type :**
```ts
if (statusFilter !== 'all') list = list.filter(i => i.status === statusFilter)
```
Appliqué uniquement quand `filter !== 'wishlist'` (la source wishlist n'a pas de statut pertinent — mais puisque `statusFilter` est reset à `'all'` quand on va sur Wishlist, ce cas ne se produit jamais).

**`FilterPills` — passer les nouvelles props :**
```tsx
<FilterPills
  filter={filter}
  onFilter={handleFilterChange}
  statusFilter={statusFilter}
  onStatusFilter={setStatusFilter}
/>
```

## Ce qui ne change pas

- `MediaCard.tsx` — aucun changement
- `lib/types.ts` — `MediaStatus` déjà défini avec `'completed' | 'inProgress' | 'dropped' | 'abandoned'`
- API — aucun changement (filtrage côté client)
- `dropped` / `abandoned` : visibles uniquement sous "Tous", ignorés par "Terminé" et "En cours"
