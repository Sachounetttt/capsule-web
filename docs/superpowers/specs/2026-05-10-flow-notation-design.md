# Design : Flow notation conditionnel

**Date :** 2026-05-10
**Statut :** Approuvé

## Objectif

Séparer l'ajout d'un média "En cours" de sa notation : les critères n'apparaissent que quand le statut est "Terminé". Sur la page détail, un bouton "J'ai terminé !" permet de noter après coup et de passer le statut à Terminé via un PATCH.

---

## 1. Formulaire d'ajout — `MediaForm`

**Fichier :** `components/add/MediaForm.tsx`

Condition actuelle :
```tsx
{criteria.length > 0 && (
  <div>Notes...
```

Nouvelle condition — afficher la notation seulement si statut = Terminé :
```tsx
{criteria.length > 0 && form.status === 'completed' && (
  <div>Notes...
```

Comportement :
- Sélectionner "En cours" → section Notes cachée
- Sélectionner "Terminé" → section Notes révélée
- Pas d'autre changement

---

## 2. Page détail — bouton "J'ai terminé !"

**Fichiers :**
- Créer : `components/detail/FinishFlow.tsx` (client component)
- Modifier : `app/(app)/media/[id]/page.tsx` — monter `FinishFlow` si `item.status === 'inProgress'`

### Comportement de `FinishFlow`

**État 1 — Bouton initial** (visible si `status === 'inProgress'`) :
```
[ J'ai terminé ! ]   ← bouton violet plein
```

**État 2 — Formulaire de notation** (après clic) :
- Les critères de notation apparaissent (`CriteriaRating` avec les bons critères selon le type)
- Bouton "Confirmer" en bas
- Bouton "Annuler" pour revenir à l'état 1

**État 3 — Confirmation** (après clic "Confirmer") :
- PATCH `/api/media/:id` avec `{ status: 'completed', ratings_json: { ... } }`
- Redirection vers `/library` après succès

### Props de `FinishFlow`
```tsx
interface Props {
  itemId: string
  mediaType: MediaType
}
```

### Critères selon le type
Réutilise le même `CRITERIA` map que `MediaForm` — défini dans `FinishFlow` de façon identique.

### Intégration dans la page détail
```tsx
{item.status === 'inProgress' && (
  <FinishFlow itemId={item.id} mediaType={item.type as MediaType} />
)}
```
Affiché après le bouton "Retour à la bibliothèque", avant le bouton "Supprimer".

---

## Périmètre exclu

- Pas de modification du flux wishlist
- Pas d'édition des notes après coup si déjà "Terminé" (hors scope)
- La notation reste optionnelle — on peut confirmer sans noter
