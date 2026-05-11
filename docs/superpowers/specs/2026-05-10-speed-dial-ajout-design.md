# Design : Speed dial sélecteur de type

**Date :** 2026-05-10
**Statut :** Approuvé

## Objectif

Remplacer le lien direct `/add` du bouton `+` dans la bottom nav par un speed dial vertical : cliquer sur `+` ouvre 4 pills animées au-dessus du bouton pour choisir le type de média avant de naviguer vers `/add?type=<type>`.

---

## Comportement

1. **Fermé** : bouton `+` violet, comportement identique à aujourd'hui visuellement
2. **Ouvert** : 
   - Fond semi-transparent (`rgba(0,0,0,0.5)`) couvre l'écran
   - Le bouton `+` devient **blanc** avec une icône `✕` **noire**
   - 4 pills remontent avec animation Framer Motion (stagger)
   - Cliquer une pill → `router.push('/add?type=<type>')` + ferme le dial
   - Cliquer le fond → ferme le dial

## Pills (de bas en haut)

| Position | Label | Icône Lucide |
|----------|-------|-------------|
| 1 (bas) | Film | `Clapperboard` |
| 2 | Série | `Tv` |
| 3 | Livre | `BookOpen` |
| 4 (haut) | Jeu | `Gamepad2` |

## Style

- Pills : fond `rgba(255,255,255,0.08)`, border `rgba(255,255,255,0.15)`, border-radius 99px
- Icônes et texte : **blanc**, aucune couleur
- Bouton ouvert : fond **blanc**, icône ✕ **noire** (inverse du bouton fermé)
- Animation : `framer-motion` déjà disponible dans le projet

## Architecture

Tout tient dans **`components/nav/BottomNav.tsx`** uniquement :
- Passer le composant en `'use client'` (déjà fait)
- Ajouter `useState(false)` pour `open`
- Ajouter `useRouter()` pour la navigation
- Remplacer le `<Link href="/add">` par un `<button>` qui toggle `open`
- Rendre le backdrop et les 4 pills conditionnellement avec `AnimatePresence`

Aucun nouveau fichier nécessaire.

## Périmètre exclu

- Pas d'animation radiale (speed dial horizontal)
- Pas de couleurs par type
- La page `/add` elle-même n'est pas modifiée
