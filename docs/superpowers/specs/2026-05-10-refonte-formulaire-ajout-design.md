# Design : Refonte formulaire d'ajout

**Date :** 2026-05-10
**Statut :** Approuvé

## Objectif

Simplifier et enrichir le formulaire d'ajout de médias : masquer le sélecteur de type quand déjà choisi, réduire les statuts, supprimer le statut en mode wishlist, et remplacer la note unique par des critères spécifiques par type de média.

---

## 1. Sélecteur de type

**Fichier :** `app/(app)/add/page.tsx`

Si `?type=` est présent dans l'URL au montage du composant, le bloc sélecteur de type (les 4 pills Film/Série/Livre/Jeu) est masqué entièrement. L'utilisateur venant du speed dial a déjà choisi son type — l'afficher à nouveau serait redondant.

Si aucun paramètre `type` n'est passé (accès direct à `/add`), le sélecteur reste visible comme aujourd'hui.

**Implémentation :** Ajouter un état `typeFromUrl: boolean` initialisé à `false`, passé à `true` dans le `useEffect` si `searchParams.get('type')` est non-null. Conditionner le rendu du sélecteur sur `!typeFromUrl`.

---

## 2. Statuts

**Fichier :** `components/add/MediaForm.tsx`

### 2a. Options réduites
Garder uniquement 2 statuts :
- `completed` → "Terminé"
- `inProgress` → "En cours"

Supprimer `dropped` ("Abandonné") et `abandoned` ("Dropped").

### 2b. Masquage en mode wishlist
`MediaForm` reçoit une nouvelle prop `wishlist?: boolean`. Quand `wishlist={true}` :
- La section statut est masquée
- Le statut est forcé à `'inProgress'` dans le form initial

**Fichier :** `app/(app)/add/page.tsx` — passer `wishlist={destination === 'wishlist'}` à `<MediaForm>`.

---

## 3. Notes par critères

**Fichiers :** `lib/types.ts`, `supabase/schema.sql`, `components/add/MediaForm.tsx`, `components/ui/CriteriaRating.tsx` (nouveau)

### Critères par type

| Type | Critères (label → clé JSON) |
|------|----------|
| `movie` | Histoire→`histoire`, Réalisation→`realisation`, Acteurs→`acteurs`, Musique→`musique` |
| `tvshow` | Histoire→`histoire`, Acteurs→`acteurs`, Réalisation→`realisation`, Rythme→`rythme` |
| `book` | Histoire→`histoire`, Écriture→`ecriture`, Personnages→`personnages`, Univers→`univers` |
| `game` | Graphisme→`graphisme`, Histoire→`histoire`, Gameplay→`gameplay`, Level Design→`leveldesign` |

### Structure des données par critère

Chaque critère contient une note ET un avis texte optionnel :
```ts
type CriterionValue = { rating: number; review?: string }
type RatingsJson = Record<string, CriterionValue>
// ex: { histoire: { rating: 4, review: "Scénario captivant" }, realisation: { rating: 5 } }
```

### Composant `CriteriaRating`

Nouveau composant `components/ui/CriteriaRating.tsx` :
```tsx
interface Props {
  criteria: { label: string; key: string }[]
  // ex: [{ label: 'Histoire', key: 'histoire' }, ...]
  values: Record<string, CriterionValue>
  onChange: (values: Record<string, CriterionValue>) => void
}
```
Affiche par critère :
1. Le label + un `StarRating` (1-5) sur la même ligne
2. Un champ texte court (1 ligne) en dessous pour l'avis — placeholder `"Ton avis sur [label]... (optionnel)"`

### Dans `MediaForm`

- Remplacer le bloc `<StarRating value={form.rating} ...>` par `<CriteriaRating criteria={...} values={form.ratings_json ?? {}} onChange={v => update('ratings_json', v)} />`
- Le champ `rating` n'est plus affiché dans le formulaire

### Types

Ajouter à `lib/types.ts` :
```ts
export type CriterionValue = { rating: number; review?: string }

// Dans MediaItem
ratings_json?: Record<string, CriterionValue>
```
Garder `rating?: number` pour compatibilité avec les données existantes, mais ne plus le générer dans le formulaire.

### Schéma DB

Ajouter dans `supabase/schema.sql` :
```sql
ALTER TABLE media_items ADD COLUMN IF NOT EXISTS ratings_json jsonb;
```
À exécuter dans Supabase SQL Editor.

---

## Périmètre exclu

- Pas de calcul automatique d'une note globale à partir des critères
- L'affichage des critères dans la vue détail (`/media/[id]`) n'est pas dans ce scope
- Le champ `rating` existant reste en DB pour les entrées passées
