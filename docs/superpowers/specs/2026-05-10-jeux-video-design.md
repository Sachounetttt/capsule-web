# Design : Support jeux vidéo

**Date :** 2026-05-10
**Statut :** Approuvé

## Objectif

Ajouter `game` comme type de média à part entière dans capsule-web : tendances sur la home, recherche, ajout en bibliothèque/wishlist, avec tracking de la plateforme. Source de données : RAWG API (gratuit, clé simple).

---

## 1. Données

### `lib/types.ts`
- `MediaType` : `'movie' | 'tvshow' | 'book'` → `'movie' | 'tvshow' | 'book' | 'game'`
- `MediaItem` : ajouter `platform?: string` et `developer?: string`
- `SearchResult` : ajouter `platform?: string` et `developer?: string`

### `supabase/schema.sql`
Ajouter à `media_items` :
```sql
ALTER TABLE media_items ADD COLUMN IF NOT EXISTS platform text;
ALTER TABLE media_items ADD COLUMN IF NOT EXISTS developer text;
```
À appliquer via Supabase Dashboard → SQL Editor.

---

## 2. API

### Variable d'environnement
```
RAWG_API_KEY=<clé gratuite depuis rawg.io>
```
À ajouter dans `.env.local`.

### `/api/trending/route.ts`
- Si `type=game` : appelle `https://api.rawg.io/api/games?ordering=-added&page_size=6&key=...`
- Mappe les champs RAWG → `SearchResult` (name, released, background_image, developers)
- Les autres types (`movie`, `tvshow`) continuent d'utiliser TMDB sans changement

### `/api/search/route.ts`
- Si `type=game` : appelle `https://api.rawg.io/api/games?search=...&key=...`
- Mappe les champs RAWG → `SearchResult`
- Les autres types continuent d'utiliser TMDB

---

## 3. Home page

### `components/home/DiscoverClient.tsx`
Trois sections de tendances en parallèle :
1. **Tendances Films** — `/api/trending?type=movie` (existant)
2. **Tendances Séries** — `/api/trending?type=tvshow` (nouveau)
3. **Tendances Jeux** — `/api/trending?type=game` (nouveau)
4. **Tu pourrais aimer** — `/api/similar` (existant)

Chaque fetch est indépendant avec son propre état `loading`. Le composant `DiscoverSection` est réutilisé sans modification.

Le `QuickAddSheet` reçoit le bon `mediaType` selon la section depuis laquelle l'item est sélectionné.

---

## 4. Ajout & formulaire

### `components/add/MediaForm.tsx`
- Option "Jeu vidéo" ajoutée dans le sélecteur de type (avec icône manette `Gamepad2` de lucide-react)
- Champ "Plateforme" (texte libre) visible uniquement si `type === 'game'`
- Champs masqués pour `game` : réalisateur, saisons, auteur, pages, ISBN
- Champ "Développeur" visible si `type === 'game'`

### `components/add/SearchResults.tsx`
- Quand `type === 'game'`, la recherche appelle `/api/search?q=...&type=game`
- Affichage identique aux autres types (poster + titre + année)

---

## Périmètre exclu

- Pas de champ "temps de jeu" (heures jouées) — hors scope
- Pas de données Metacritic ni plateformes multiples — plateforme = texte libre
- Library, Wishlist, Detail : aucun changement UI nécessaire (génériques par design)
