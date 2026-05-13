# Half-Star Rating — Design Spec

**Date:** 2026-05-13
**Status:** Approved

## Objectif

Permettre des notes en demi-étoiles (0,5 incrément) et afficher les moyennes exactes en format `X,X/5` dans la section "Vos amis ont adoré".

## Fichiers modifiés

### 1. `components/ui/StarRating.tsx`

**Changement :** Support des valeurs 0 à 5 par pas de 0,5.

**Interaction :**
- Chaque étoile est divisée en deux zones cliquables invisibles (largeur 50% chacune)
- Zone gauche → valeur `star - 0.5`
- Zone droite → valeur `star`
- Compatible touch et mouse

**Affichage :**
- Étoile pleine : `star <= value` → fill purple
- Demi-étoile : `star - 0.5 === value` → deux `Star` superposées, la gauche avec `clipPath: 'inset(0 50% 0 0)'` fill purple, la droite fill none
- Étoile vide : fill none

**Rétrocompatibilité :** Les valeurs entières existantes continuent de s'afficher correctement. Le composant est utilisé en mode readonly dans `MediaCard` et `media/[id]/page.tsx` — le rendu demi-étoile s'y applique aussi automatiquement.

**Interface (inchangée) :**
```ts
interface Props {
  value: number      // 0–5, multiples de 0.5
  onChange?: (v: number) => void
  readonly?: boolean
}
```

### 2. `app/(app)/page.tsx`

**Changement :** Section "Vos amis ont adoré" — remplacer l'affichage étoiles par texte.

Avant : `{'⭐'.repeat(Math.round(item.avgRating))}`
Après : `` `${item.avgRating.toFixed(1).replace('.', ',')}/5` ``

Exemple rendu : `4,6/5`

**Seuil de filtrage :** Inchangé — `avg >= 4` requis pour apparaître dans la section.

## Ce qui ne change pas

- `CriteriaRating.tsx` — aucun changement, délègue déjà à `StarRating`
- `lib/types.ts` — `rating: number` supporte déjà les décimaux
- `MediaForm.tsx` — aucun changement
- La logique `getAvgRating` dans `page.tsx` — aucun changement, calcule déjà la moyenne exacte
- Le schéma Supabase — `ratings_json` stocke des `number`, 0,5 est déjà compatible
