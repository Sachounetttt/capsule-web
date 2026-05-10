# Capsule Web — Fonctionnalité Amis & Multi-utilisateurs

**Date :** 2026-05-10
**Statut :** Approuvé — en attente du plan d'implémentation

---

## Objectif

Transformer Capsule Web d'une app mono-utilisateur (PIN perso) en une app multi-utilisateurs hébergée publiquement, où jusqu'à ~10 amis peuvent créer un compte, tracker leurs médias, et voir le profil résumé de leurs amis.

---

## Stack & Hébergement

- **App :** Next.js 16 + React 19 + TypeScript + Tailwind 4 + Framer Motion (inchangé)
- **Backend :** Supabase (PostgreSQL hébergé) — inchangé
- **Auth :** Supabase Auth avec Google OAuth (remplace le PIN)
- **Hébergement :** Vercel (plan gratuit — suffisant pour ~10 utilisateurs)
- **Mobile :** PWA installable via Safari "Ajouter à l'écran d'accueil"
- **Coût :** 0€ sur les plans gratuits Vercel + Supabase

---

## Modèle de données

### Changements sur `media_items`

```sql
ALTER TABLE media_items ADD COLUMN user_id uuid REFERENCES auth.users(id);
-- Migration one-shot : rattacher les médias existants au premier user (le propriétaire actuel)
```

### Nouvelle table `profiles`

Créée automatiquement à la première connexion Google via un trigger Supabase.

```sql
CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL,
  avatar_url text,
  created_at timestamptz DEFAULT now()
);
```

### Nouvelle table `friendships`

Un seul enregistrement par paire. Le statut passe de `pending` à `accepted` quand l'destinataire accepte.

```sql
CREATE TABLE friendships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  addressee_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted')),
  created_at timestamptz DEFAULT now(),
  UNIQUE (requester_id, addressee_id)
);
```

---

## Authentification

### Avant
- PIN SHA-256 stocké dans `config` (Supabase)
- Cookie `capsule_session` vérifié dans `proxy.ts`
- Mono-utilisateur, pas de notion d'identité

### Après
- **Supabase Auth + Google OAuth**
- `proxy.ts` vérifie la session Supabase (`supabase.auth.getUser()`) au lieu du cookie PIN
- Page `/login` avec bouton "Continuer avec Google"
- À la première connexion → trigger crée automatiquement le `profile`

### Nouvelles variables d'environnement

```
NEXT_PUBLIC_SUPABASE_URL       # déjà présente
NEXT_PUBLIC_SUPABASE_ANON_KEY  # nouvelle — clé publique (safe côté client)
```

La `SUPABASE_SERVICE_ROLE_KEY` reste uniquement server-side pour les API routes.

### Migration du propriétaire actuel

Le propriétaire (Sacha) se connecte avec Google. Un script one-shot rattache tous les `media_items` existants à son `user_id`. L'ancien système PIN est supprimé.

---

## API Routes

### Routes existantes — changement minimal

Chaque route extrait l'utilisateur connecté depuis la session Supabase :

```typescript
const { data: { user } } = await supabase.auth.getUser()
if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
// Ensuite filtrer par user.id dans toutes les requêtes Supabase
```

### Nouvelles routes

| Route | Méthode | Description |
|---|---|---|
| `/api/friends` | GET | Liste d'amis acceptés + demandes en attente reçues |
| `/api/friends` | POST | Envoyer une demande d'ami (body: `{ addressee_id }`) |
| `/api/friends/[id]` | PATCH | Accepter ou refuser une demande (`{ action: 'accept'|'reject' }`) |
| `/api/friends/[id]` | DELETE | Supprimer un ami |
| `/api/users/search` | GET | Chercher des utilisateurs par nom (`?q=`) |
| `/api/users/[id]/profile` | GET | Profil résumé d'un ami (vérifie que la friendship est acceptée) |

---

## UI & Navigation

### Nouvelles pages

| Route | Description |
|---|---|
| `/login` | Page de connexion Google — remplace `/pin` |
| `/profile` | Ton propre profil : stats, liste d'amis, déconnexion |
| `/friends` | Gérer ses amis : liste, demandes en attente, recherche |
| `/users/[id]` | Profil résumé d'un ami |

### Navigation

Le bouton profil (avatar Google de l'utilisateur connecté) s'ajoute **en haut à droite de la home** — pas d'onglet supplémentaire dans la bottom nav. Les amis sont accessibles depuis `/profile`.

Badge rouge sur l'avatar quand une demande d'ami est en attente.

### Profil résumé d'un ami (`/users/[id]`)

Visible uniquement si la friendship est `accepted`.

- Photo + nom Google
- Stats : X films · Y séries · Z jeux
- **Derniers ajouts** — 5 cartes en scroll horizontal (poster + titre + année)
- **Coups de cœur** — médias notés 5★ (poster + titre)
- Non visible : notes privées, reviews, wishlist

### Page `/friends`

- Barre de recherche par nom d'affichage
- Résultats : avatar + nom + bouton "Ajouter"
- Section "En attente" : demandes reçues avec Accepter / Refuser
- Section "Mes amis" : liste avec lien vers leur profil

---

## Flux utilisateur complet

### Inscription (nouvel utilisateur)
1. Reçoit un lien vers l'app (WhatsApp, etc.)
2. Ouvre l'URL → page `/login`
3. Clique "Continuer avec Google"
4. Profil créé automatiquement → redirect vers `/`
5. Cherche ses amis dans `/friends` → envoie des demandes

### Demande d'ami
1. Alice cherche "Sacha" dans `/friends`
2. Elle clique "Ajouter"
3. Sacha voit un badge rouge sur son avatar
4. Il accepte → Alice apparaît dans sa liste d'amis et vice versa
5. Chacun peut voir le profil résumé de l'autre

### Installation PWA (iPhone)
1. Ouvrir l'URL dans Safari
2. Partager → "Ajouter à l'écran d'accueil"
3. L'app s'installe comme une app native

---

## Ce qui ne change pas

- Toute la logique médias (CRUD, recherche TMDB/RAWG, trending, top)
- Le design visuel (glassmorphism, Framer Motion, bottom nav)
- Le système de ratings par critères
- La page Découvrir
- L'export JSON

---

## Périmètre explicitement exclu

- Pas de like / commentaire sur les médias des amis (lecture seule)
- Pas de feed global (timeline commune)
- Pas de notifications push (badge suffit pour les demandes d'ami)
- Pas de gestion des rôles / admin (tous les comptes sont égaux)
- Pas de suppression de compte (hors scope)
