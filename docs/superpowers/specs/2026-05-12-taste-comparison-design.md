# Comparaison de goûts entre amis

**Date:** 2026-05-12
**Statut:** Approuvé

## Contexte

La page `/users/[id]` affiche le profil d'un ami (stats, récents, favoris). On y ajoute une section de comparaison de goûts entre l'utilisateur connecté et l'ami.

## Fonctionnalités

1. **Score de similarité** (0–100) pondéré par les notes
2. **Titres en commun** — scroll horizontal, max 6
3. **À découvrir** — titres complétés par l'ami que l'utilisateur n'a pas, triés par note ami desc, max 6

## Architecture

### API — `GET /api/users/[id]/profile`

Enrichissement de l'endpoint existant. En plus des données actuelles, on récupère les items de l'utilisateur connecté et on calcule :

**Match :** par `title.toLowerCase().trim()` entre les deux bibliothèques (wishlist=false).

**Score de similarité :**
```
jaccard = commun.length / (total_moi + total_ami - commun.length)

rating_agreement = moyenne(1 - |note_moi - note_ami| / 4)
  → uniquement sur les titres communs où les deux ont noté

score = (jaccard + rating_agreement) / 2   // si rated_common > 0
score = jaccard                             // sinon
score_pct = Math.round(score * 100)        // 0–100
```

**À découvrir :** items de l'ami avec `status = 'completed'`, titre absent de la bibliothèque de l'utilisateur, triés par `rating DESC`, limités à 6.

**En commun :** 6 premiers items matchés (côté ami pour avoir le poster).

### Type ajouté à `FriendProfileSummary`

```ts
comparison: {
  score: number          // 0–100
  common: Pick<MediaItem, 'id' | 'title' | 'type' | 'year' | 'poster_url'>[]
  toDiscover: Pick<MediaItem, 'id' | 'title' | 'type' | 'year' | 'poster_url'>[]
}
```

### UI — `/users/[id]/page.tsx`

Nouvelle section en bas de page, après "Coups de coeur". Trois blocs :

**1. Score**
```
[  78%  ]
de goûts similaires
```
Couleur : vert ≥ 65, jaune 35–64, rouge < 35.

**2. En commun** (masqué si vide)
Titre : `"En commun · N"`
Scroll horizontal de posters — même pattern que "Récents".

**3. À découvrir** (masqué si vide)
Titre : `"À découvrir chez [prénom]"`
Scroll horizontal de posters — même pattern.

Pas de nouveaux composants. Réutilise le pattern scroll existant.

## Fichiers modifiés

- `app/api/users/[id]/profile/route.ts` — calcul comparison
- `lib/types.ts` — ajout champ comparison à FriendProfileSummary
- `app/(app)/users/[id]/page.tsx` — affichage section comparison

## Non inclus

- Matching par ID externe (TMDB/RAWG) — titre suffit pour l'instant
- Page dédiée `/compare`
- Notifications
