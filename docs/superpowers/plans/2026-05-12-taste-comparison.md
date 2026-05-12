# Taste Comparison Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajouter une section "comparaison de goûts" sur la page profil d'un ami (`/users/[id]`) avec un score de similarité, les titres en commun, et les découvertes potentielles.

**Architecture:** On enrichit l'API existante `GET /api/users/[id]/profile` pour récupérer les items de l'utilisateur connecté en plus de ceux de l'ami, calculer le score et les listes côté serveur, et renvoyer un champ `comparison` dans la réponse. La page front affiche une nouvelle section en bas avec le score coloré et deux scrolls horizontaux de posters.

**Tech Stack:** Next.js 15, TypeScript, Supabase (service role), Tailwind + CSS inline existant.

---

## Fichiers modifiés

- Modify: `lib/types.ts` — ajout du type `Comparison` et du champ dans `FriendProfileSummary`
- Modify: `app/api/users/[id]/profile/route.ts` — calcul comparison côté serveur
- Modify: `app/(app)/users/[id]/page.tsx` — affichage section comparison

---

### Task 1 : Ajouter le type `Comparison` dans `lib/types.ts`

**Files:**
- Modify: `lib/types.ts`

- [ ] **Step 1 : Ajouter le type et l'intégrer à `FriendProfileSummary`**

Dans `lib/types.ts`, remplacer :

```ts
export interface FriendProfileSummary {
  profile: UserProfile
  stats: { movies: number; tvshows: number; games: number }
  recent: Pick<MediaItem, 'id' | 'title' | 'type' | 'year' | 'poster_url' | 'date_added'>[]
  favorites: Pick<MediaItem, 'id' | 'title' | 'type' | 'year' | 'poster_url'>[]
}
```

par :

```ts
export type ComparisonItem = Pick<MediaItem, 'id' | 'title' | 'type' | 'year' | 'poster_url'>

export interface Comparison {
  score: number
  common: ComparisonItem[]
  toDiscover: ComparisonItem[]
}

export interface FriendProfileSummary {
  profile: UserProfile
  stats: { movies: number; tvshows: number; games: number }
  recent: Pick<MediaItem, 'id' | 'title' | 'type' | 'year' | 'poster_url' | 'date_added'>[]
  favorites: Pick<MediaItem, 'id' | 'title' | 'type' | 'year' | 'poster_url'>[]
  comparison: Comparison
}
```

- [ ] **Step 2 : Commit**

```bash
git add lib/types.ts
git commit -m "feat(types): add Comparison type to FriendProfileSummary"
```

---

### Task 2 : Calcul de la comparaison dans l'API

**Files:**
- Modify: `app/api/users/[id]/profile/route.ts`

- [ ] **Step 1 : Récupérer les items de l'utilisateur connecté**

Après la récupération des items de l'ami (`items`), ajouter :

```ts
const { data: myItems } = await supabase
  .from('media_items')
  .select('id, type, title, year, poster_url, rating, status')
  .eq('user_id', user.id)
  .eq('wishlist', false)

const myAll = myItems ?? []
```

- [ ] **Step 2 : Calculer la comparaison**

Ajouter la fonction de calcul juste avant la construction du `result` :

```ts
function computeComparison(
  myAll: { title: string; rating?: number | null; status: string }[],
  friendAll: { id: string; title: string; type: string; year?: number | null; poster_url?: string | null; rating?: number | null; status: string }[]
): Comparison {
  const normalize = (t: string) => t.toLowerCase().trim()

  const myMap = new Map(myAll.map(i => [normalize(i.title), i]))
  const friendMap = new Map(friendAll.map(i => [normalize(i.title), i]))

  const commonKeys = [...friendMap.keys()].filter(k => myMap.has(k))

  // Jaccard similarity
  const totalUnique = myMap.size + friendMap.size - commonKeys.length
  const jaccard = totalUnique > 0 ? commonKeys.length / totalUnique : 0

  // Rating agreement on commonly-rated items
  const ratedCommon = commonKeys.filter(k => myMap.get(k)?.rating && friendMap.get(k)?.rating)
  const ratingAgreement = ratedCommon.length > 0
    ? ratedCommon.reduce((sum, k) => {
        const diff = Math.abs((myMap.get(k)!.rating ?? 0) - (friendMap.get(k)!.rating ?? 0))
        return sum + (1 - diff / 4)
      }, 0) / ratedCommon.length
    : null

  const rawScore = ratingAgreement !== null
    ? (jaccard + ratingAgreement) / 2
    : jaccard
  const score = Math.round(rawScore * 100)

  const common = commonKeys.slice(0, 6).map(k => {
    const f = friendMap.get(k)!
    return { id: f.id, title: f.title, type: f.type, year: f.year ?? undefined, poster_url: f.poster_url ?? undefined }
  })

  const toDiscover = friendAll
    .filter(i => i.status === 'completed' && !myMap.has(normalize(i.title)) && i.rating)
    .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
    .slice(0, 6)
    .map(i => ({ id: i.id, title: i.title, type: i.type, year: i.year ?? undefined, poster_url: i.poster_url ?? undefined }))

  return { score, common, toDiscover }
}
```

- [ ] **Step 3 : Intégrer dans la réponse**

Remplacer :

```ts
const result: FriendProfileSummary = { profile, stats, recent, favorites }
return NextResponse.json(result)
```

par :

```ts
const comparison = computeComparison(myAll, all)
const result: FriendProfileSummary = { profile, stats, recent, favorites, comparison }
return NextResponse.json(result)
```

- [ ] **Step 4 : Ajouter l'import du type `Comparison`**

En haut du fichier, modifier l'import :

```ts
import type { FriendProfileSummary, Comparison } from '@/lib/types'
```

- [ ] **Step 5 : Commit**

```bash
git add app/api/users/[id]/profile/route.ts
git commit -m "feat(api): compute taste comparison in friend profile endpoint"
```

---

### Task 3 : Afficher la section comparison dans la page profil

**Files:**
- Modify: `app/(app)/users/[id]/page.tsx`

- [ ] **Step 1 : Ajouter la section comparison après les favoris**

Dans `app/(app)/users/[id]/page.tsx`, après le bloc `{/* Favorites */}`, ajouter :

```tsx
{/* Taste comparison */}
{data.comparison && (
  <div className="flex flex-col gap-4">
    {/* Score */}
    <div className="glass rounded-2xl p-5 flex flex-col items-center gap-1">
      <span
        className="text-5xl font-bold"
        style={{
          color: data.comparison.score >= 65
            ? '#4ADE80'
            : data.comparison.score >= 35
            ? '#FACC15'
            : '#F87171'
        }}
      >
        {data.comparison.score}%
      </span>
      <span className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>
        de goûts similaires
      </span>
    </div>

    {/* Common */}
    {data.comparison.common.length > 0 && (
      <div className="flex flex-col gap-3">
        <p className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'rgba(255,255,255,0.5)' }}>
          En commun · {data.comparison.common.length}
        </p>
        <div className="flex gap-3 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
          {data.comparison.common.map(item => (
            <div key={item.id} className="flex-shrink-0" style={{ width: 90 }}>
              {item.poster_url
                ? <img src={item.poster_url} className="rounded-xl object-cover" style={{ width: 90, height: 130 }} alt={item.title} />
                : <div className="rounded-xl" style={{ width: 90, height: 130, background: 'rgba(255,255,255,0.1)' }} />
              }
              <p className="text-xs mt-1 truncate" style={{ color: 'rgba(255,255,255,0.7)' }}>{item.title}</p>
            </div>
          ))}
        </div>
      </div>
    )}

    {/* To discover */}
    {data.comparison.toDiscover.length > 0 && (
      <div className="flex flex-col gap-3">
        <p className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'rgba(255,255,255,0.5)' }}>
          À découvrir chez {profile.display_name.split(' ')[0]}
        </p>
        <div className="flex gap-3 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
          {data.comparison.toDiscover.map(item => (
            <div key={item.id} className="flex-shrink-0" style={{ width: 90 }}>
              {item.poster_url
                ? <img src={item.poster_url} className="rounded-xl object-cover" style={{ width: 90, height: 130 }} alt={item.title} />
                : <div className="rounded-xl" style={{ width: 90, height: 130, background: 'rgba(255,255,255,0.15)' }} />
              }
              <p className="text-xs mt-1 truncate" style={{ color: 'rgba(255,255,255,0.7)' }}>{item.title}</p>
            </div>
          ))}
        </div>
      </div>
    )}
  </div>
)}
```

- [ ] **Step 2 : Commit**

```bash
git add "app/(app)/users/[id]/page.tsx"
git commit -m "feat(ui): add taste comparison section to friend profile page"
```

- [ ] **Step 3 : Push**

```bash
git push
```

---

## Test manuel post-déploiement

1. Toi et ton pote êtes amis (friendship acceptée)
2. Toi et ton pote avez au moins un titre en commun dans vos bibliothèques
3. Va sur `/users/[id]` (profil de ton pote)
4. Vérifie : score affiché en couleur, section "En commun" avec posters, section "À découvrir" avec ses meilleures notes que tu n'as pas
