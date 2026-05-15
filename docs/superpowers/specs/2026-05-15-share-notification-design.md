---
title: Partage de média + Notifications in-app
date: 2026-05-15
status: approved
---

## Résumé

Permettre à un utilisateur de partager un média de sa bibliothèque avec un ami. L'ami reçoit une notification in-app visible à sa prochaine connexion, avec accès rapide à la recherche pour ajouter le média à sa propre bibliothèque.

---

## Base de données

### Nouvelle table `notifications`

| Colonne | Type | Description |
|---------|------|-------------|
| `id` | uuid PK | Identifiant |
| `user_id` | uuid FK → profiles | Destinataire |
| `type` | text | `'share'` (extensible : `'friend_accepted'`, etc.) |
| `payload` | jsonb | Données spécifiques au type (voir ci-dessous) |
| `read` | boolean | `false` par défaut |
| `created_at` | timestamptz | Auto |

**RLS** : un utilisateur ne peut lire/modifier que ses propres notifs (`user_id = auth.uid()`).

### Payload pour `type = 'share'`

```json
{
  "sender_id": "uuid",
  "sender_name": "Sacha",
  "media_title": "Inception",
  "media_type": "movie",
  "poster_path": "/abc123.jpg",
  "rating": 4,
  "message": "À voir absolument !"
}
```

Les données sont snapshotées à l'envoi — la notif reste valide même si l'expéditeur supprime l'item.

---

## API

### `POST /api/notifications`

Crée une notif de partage vers un ami.

**Body :**
```json
{
  "recipient_id": "uuid",
  "media_item_id": "uuid",
  "message": "optionnel"
}
```

**Validations :**
- L'expéditeur et le destinataire doivent être amis (`friendships` status `accepted`)
- `media_item_id` doit appartenir à l'expéditeur

**Réponse :** `201` avec la notif créée.

---

### `GET /api/notifications`

Retourne les notifs du user connecté + count non-lues.

**Réponse :**
```json
{
  "notifications": [...],
  "unread_count": 3
}
```

---

### `PATCH /api/notifications/[id]`

Marque une notif comme lue (`read: true`).

---

## UI

### 1. Bouton "Partager" sur `/media/[id]`

- Bouton secondaire en bas de page (icône `Share2` de lucide)
- Ouvre une **modale bottom-sheet** avec :
  - Liste des amis (depuis `/api/friends`)
  - Champ texte optionnel "Ajouter un message..."
  - Bouton "Envoyer"
- Feedback après envoi : toast "Partagé !" + fermeture modale
- Si aucun ami : message "Ajoute des amis pour partager"

### 2. Clochette dans `ProfileAvatar`

- Icône `Bell` de lucide en haut à droite
- Badge rouge avec `unread_count` si > 0 (max affiché : "9+")
- Au clic → navigation vers `/notifications`
- Le count est fetché au montage du composant

### 3. Page `/notifications`

- Liste des notifs, plus récentes en premier
- Chaque item : avatar sender + texte + poster miniature + date relative
- Texte : *"**Sacha** t'a recommandé **Inception** ⭐⭐⭐⭐"* + message si présent
- Tap → marque comme lue + redirige vers `/add?q=Inception&type=movie`
- État vide : "Aucune notification pour l'instant"
- Les notifs non-lues ont un fond légèrement différent

---

## Flux complet

```
Expéditeur                          Destinataire
    |                                    |
    | Ouvre /media/[id]                  |
    | Appuie sur "Partager"              |
    | Sélectionne ami + message          |
    | POST /api/notifications            |
    |   → insert notifications row       |
    |                                    |
    |                    Ouvre l'app     |
    |                    GET /api/notifs |
    |                    Badge = 1       |
    |                    Tape clochette  |
    |                    Voit la notif   |
    |                    Tape la notif   |
    |                    → /add?q=...    |
```

---

## Ce qui est hors scope (v1)

- Push notifications (service worker / FCM)
- Partage vers plusieurs amis en même temps
- Répondre à une notif
- Supprimer des notifs
