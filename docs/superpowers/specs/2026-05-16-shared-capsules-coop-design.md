# Capsule Web — Capsules Co-op Partagées

**Date :** 2026-05-16  
**Statut :** Approuvé  
**Dépend de :** `2026-05-10-capsule-social-friends-design.md` (amis, profils, OAuth Google)

---

## Objectif

Permettre à deux amis de créer une capsule partagée pour un jeu joué en co-op. Chaque joueur garde ses données personnelles (statut, note, notes perso) et la capsule expose en plus une zone commune (notes partagées). La capsule co-op coexiste avec les entrées personnelles de chaque joueur sans conflit.

---

## Modèle de données

### Table `shared_capsules`

Entité centrale — données communes du jeu partagé.

```sql
CREATE TABLE shared_capsules (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title          text NOT NULL,
  poster_url     text,
  rawg_id        text,
  dominant_color text,
  shared_notes   text NOT NULL DEFAULT '',
  created_by     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at     timestamptz NOT NULL DEFAULT now()
);
```

### Table `shared_capsule_members`

Données personnelles de chaque joueur dans la capsule.

```sql
CREATE TABLE shared_capsule_members (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  capsule_id      uuid NOT NULL REFERENCES shared_capsules(id) ON DELETE CASCADE,
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status          text NOT NULL DEFAULT 'inProgress'
                  CHECK (status IN ('completed', 'inProgress', 'dropped', 'abandoned')),
  personal_rating int CHECK (personal_rating BETWEEN 1 AND 5),
  personal_notes  text NOT NULL DEFAULT '',
  joined_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (capsule_id, user_id)
);
```

### Table `shared_capsule_invitations`

Invitations en attente d'acceptation.

```sql
CREATE TABLE shared_capsule_invitations (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  capsule_id  uuid NOT NULL REFERENCES shared_capsules(id) ON DELETE CASCADE,
  inviter_id  uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invitee_id  uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status      text NOT NULL DEFAULT 'pending'
              CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (capsule_id, invitee_id)
);
```

### RLS (Row Level Security)

- `shared_capsules` : lecture si membre (`shared_capsule_members.user_id = auth.uid()`)
- `shared_capsule_members` : lecture si même capsule ; écriture uniquement sur sa propre ligne
- `shared_capsule_invitations` : lecture si `inviter_id` ou `invitee_id` = `auth.uid()`

---

## API Routes

| Méthode | Route | Description |
|---------|-------|-------------|
| `GET` | `/api/shared-capsules` | Liste des capsules co-op de l'utilisateur courant |
| `POST` | `/api/shared-capsules` | Créer une capsule + s'y ajouter comme membre |
| `GET` | `/api/shared-capsules/[id]` | Détail capsule (données communes + membres) |
| `PATCH` | `/api/shared-capsules/[id]` | Modifier `shared_notes` (tout membre peut) |
| `PATCH` | `/api/shared-capsules/[id]/me` | Modifier son propre statut/note perso |
| `POST` | `/api/shared-capsules/[id]/invite` | Inviter un ami (doit être dans `friendships`) |
| `POST` | `/api/shared-capsules/invitations/[id]/respond` | Accepter ou refuser une invitation |

---

## Flow utilisateur

### Créer une capsule co-op

1. L'utilisateur ouvre la fiche d'un jeu (existant en biblio ou via recherche)
2. Bouton **"Jouer avec..."** visible uniquement si au moins un ami existe
3. Friend picker : liste des amis acceptés (`friendships` status = `accepted`)
4. Confirmation → `POST /api/shared-capsules` crée la capsule + l'invitation
5. L'ami reçoit une notification in-app (badge sur la cloche)

### Accepter une invitation

1. L'ami voit la notification → "X t'invite à une capsule co-op : [titre]"
2. Il accepte → `POST /api/shared-capsules/invitations/[id]/respond` avec `{ accepted: true }`
3. Une ligne `shared_capsule_members` est créée pour lui (status: `inProgress`)
4. La capsule apparaît dans sa bibliothèque

### Modifier la capsule

- **Notes partagées** : les deux joueurs peuvent éditer librement
- **Statut / note perso** : chaque joueur ne modifie que sa propre ligne member
- Pas de verrou : last write wins sur `shared_notes` (usage à 2, conflit improbable)

---

## UI

### Page Bibliothèque (`/library`)

Les capsules co-op s'affichent dans la même liste que les entrées personnelles, avec :
- Badge discret **"Co-op"** (icône à deux personnes)
- Petit avatar de l'ami co-joueur superposé sur le poster
- Filtres existants (Film / Série / Jeu) : les capsules co-op apparaissent sous "Jeu"

### Fiche détail capsule co-op (`/shared/[id]`)

Route dédiée, distincte de `/media/[id]`.

Sections :
1. **Header** : poster + titre + badge Co-op + avatars des deux joueurs
2. **Statuts** : ligne par joueur avec son statut individuel (ex. "Toi : En cours — Ami : Terminé")
3. **Notes partagées** : textarea éditable par les deux, sauvegarde auto (debounce 1s)
4. **Notes perso** : section repliable, visible uniquement par son auteur
5. **Notes perso de l'ami** : affichées en lecture seule si l'ami les a rendues visibles (champ `public_notes` optionnel — hors scope V1, prévoir la colonne)

### Fiche jeu existante (`/media/[id]`)

Ajout du bouton **"Jouer avec..."** en bas de page, conditionné à :
- `type === 'game'`
- L'utilisateur a au moins un ami

---

## Notifications

Réutilise le système de notifications prévu dans le spec social.

| Événement | Destinataire | Message |
|-----------|-------------|---------|
| Invitation reçue | Invité | "@Sacha t'invite à une capsule co-op : Elden Ring" |
| Invitation acceptée | Invitant | "@Ami a rejoint ta capsule Elden Ring" |
| Ami a terminé le jeu | Co-joueur | "@Ami a terminé Elden Ring" |

---

## Périmètre V1

**Inclus :**
- 2 joueurs max par capsule co-op
- Invitation uniquement vers des amis acceptés
- Statut et note perso indépendants
- Notes partagées communes
- Badge co-op dans la bibliothèque
- Notifications in-app

**Hors scope V1 (backlog) :**
- 3+ joueurs
- Notes perso rendues publiques à l'ami
- Historique d'édition des notes partagées
- Capsule co-op depuis `/add` directement
- Tracker de temps de jeu Windows (spec séparée)

---

## Dépendances

Ce spec suppose que le spec social (`2026-05-10`) est implémenté en premier :
- Supabase Auth + Google OAuth
- Table `profiles`
- Table `friendships`
- Système de notifications in-app
