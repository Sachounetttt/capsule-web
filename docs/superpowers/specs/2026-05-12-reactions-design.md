# Réactions sur les médias — Design Spec

**Date:** 2026-05-12
**Statut:** Approuvé

## Contexte

Permettre aux utilisateurs de réagir aux médias de leurs amis avec un emoji. Les réactions apparaissent sur deux surfaces : le profil d'un ami (interactif) et la home de l'utilisateur (lecture seule).

## Emojis disponibles (fixe)

`🔥` Incroyable · `👀` Je veux voir · `✅` Vu aussi · `😴` Bof

## Base de données

```sql
CREATE TABLE reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES media_items(id) ON DELETE CASCADE,
  from_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  emoji text NOT NULL CHECK (emoji IN ('🔥', '👀', '✅', '😴')),
  created_at timestamptz DEFAULT now(),
  UNIQUE (item_id, from_user_id)
);

CREATE INDEX idx_reactions_item_id ON reactions(item_id);
CREATE INDEX idx_reactions_from_user ON reactions(from_user_id);
```

Contrainte `UNIQUE (item_id, from_user_id)` : une réaction par utilisateur par item. Changer d'emoji = upsert (`ON CONFLICT DO UPDATE`).

## API

### `POST /api/reactions`
- Auth requise
- Body : `{ item_id: string, emoji: string }`
- Upsert : si une réaction existe déjà pour cet (item_id, user_id), remplace l'emoji
- Validation : emoji doit être dans `['🔥', '👀', '✅', '😴']`
- Réponse : `{ ok: true }`

### `DELETE /api/reactions/[item_id]`
- Auth requise
- Supprime la réaction du user connecté sur cet item
- Réponse : `{ ok: true }`

### `GET /api/reactions?item_ids=id1,id2,...`
- Auth requise
- Retourne les réactions pour les items demandés, **filtrées aux amis acceptés** de l'utilisateur connecté (+ ses propres réactions)
- Format réponse :
```json
{
  "item_id_1": [
    { "from_user_id": "...", "emoji": "🔥", "display_name": "Thomas" }
  ],
  "item_id_2": []
}
```

## UI

### Profil ami `/users/[id]` — section "Derniers ajouts"

Sous chaque poster dans le scroll horizontal, une rangée de 4 emojis :
- Emoji actif (ta réaction) : fond `rgba(255,255,255,0.15)`, légèrement mis en avant
- Emoji inactif : texte semi-transparent
- Clic sur emoji inactif → POST → réaction posée (optimiste)
- Clic sur emoji actif → DELETE → réaction retirée (optimiste)
- Un seul emoji actif par item

Chargement : `GET /api/reactions?item_ids=id1,id2,...` au montage du composant avec les IDs des 5 items récents.

### Home `/` — section "Récemment ajoutés"

Sous chaque poster, affichage lecture seule des réactions d'amis :
- Format : `🔥 Thomas  👀 Léa`
- Si aucune réaction → rien affiché
- Chargement : `GET /api/reactions?item_ids=...` au montage avec les IDs des 6 items récents

La home est un Server Component — le fetch des réactions se fait côté client dans `RecentScroll` (qui devient client component si pas déjà le cas).

## Fichiers à modifier/créer

| Fichier | Action |
|---------|--------|
| `app/api/reactions/route.ts` | Créer (GET + POST) |
| `app/api/reactions/[item_id]/route.ts` | Créer (DELETE) |
| `app/(app)/users/[id]/page.tsx` | Modifier — ajouter emojis sous posters |
| `components/home/RecentScroll.tsx` | Modifier — afficher réactions amis |

## Non inclus

- Notifications push quand quelqu'un réagit
- Réactions sur `/media/[id]`
- Compteurs agrégés (ex: "3 🔥")
- Emojis personnalisés
