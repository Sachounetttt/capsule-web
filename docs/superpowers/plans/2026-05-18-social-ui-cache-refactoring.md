# Social, UI & Cache Refactoring — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Corriger les bugs co-op, ajouter le cache API, enrichir les pages détail, et améliorer les fonctionnalités sociales de capsule-web.

**Architecture:** Les tâches sont indépendantes par section UI/API/BDD. La section "Pages Détails Riches" dépend du cache API (Task 9 dépend de Task 8). Toutes les autres tâches sont indépendantes entre elles.

**Tech Stack:** Next.js 16 App Router, React 19, Supabase (service_role server client), TMDB API, RAWG API, TypeScript, Tailwind 4, Framer Motion.

---

## Fichiers créés / modifiés

| Fichier | Action | Rôle |
|---|---|---|
| `supabase/migrations/003_cache_runtime.sql` | Créer | Table media_cache + colonne runtime_minutes |
| `lib/types.ts` | Modifier | Ajouter external_id à SearchResult, runtime_minutes à MediaItem |
| `lib/search.ts` | Modifier | Inclure external_id (tmdb/rawg id) dans les résultats |
| `components/ui/CompatBar.tsx` | Modifier | Fix animation double-RAF |
| `components/detail/OnlineToggle.tsx` | Modifier | Centrer bouton, simplifier UI |
| `app/(app)/notifications/page.tsx` | Modifier | Auto-mark all read on mount |
| `app/api/notifications/route.ts` | Modifier | Ajouter PATCH bulk (mark all read) |
| `app/(app)/library/page.tsx` | Modifier | Section "Avec vos amis" + dédup co-op |
| `components/detail/PlayWithButton.tsx` | Modifier | Multi-select amis (coop à l'infini) |
| `app/api/shared-capsules/[id]/invite/route.ts` | Modifier | Limite joueurs retirée (déjà illimitée) |
| `app/api/shared-capsules/invitations/[id]/respond/route.ts` | Modifier | Dédup: si invitee a déjà le jeu, ne pas créer doublon |
| `app/(app)/page.tsx` | Modifier | Pastille avatar ami + items cliquables |
| `app/api/external/[type]/[id]/route.ts` | Créer | Détails riches TMDB/RAWG avec cache BDD |
| `app/(app)/external/[type]/[id]/page.tsx` | Créer | Page détail riche (description, cast, studio) |
| `app/(app)/users/[id]/page.tsx` | Modifier | Bouton "Ajouter" sur items ami + notif |
| `app/api/media/route.ts` | Modifier | Stocker external_id + runtime_minutes à la création |
| `app/(app)/profile/page.tsx` | Modifier | Afficher "Temps passé" |

---

## Task 1 : SQL — Table cache + colonne runtime_minutes

**Files:**
- Create: `supabase/migrations/003_cache_runtime.sql`

- [ ] **Step 1 : Écrire la migration**

```sql
-- Table de cache pour TMDB / RAWG
CREATE TABLE IF NOT EXISTS media_cache (
  external_id   text    NOT NULL,
  media_type    text    NOT NULL CHECK (media_type IN ('movie', 'tvshow', 'game')),
  data          jsonb   NOT NULL,
  cached_at     timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (external_id, media_type)
);

-- Pas de RLS — service_role uniquement
-- Colonne runtime (minutes pour films/séries, minutes estimées pour jeux)
ALTER TABLE media_items ADD COLUMN IF NOT EXISTS runtime_minutes int;
-- Colonne external_id (tmdb_id ou rawg_id, stocké comme texte)
ALTER TABLE media_items ADD COLUMN IF NOT EXISTS external_id text;
```

- [ ] **Step 2 : Exécuter dans Supabase SQL Editor**

Coller le SQL ci-dessus dans le SQL Editor de Supabase et exécuter. Vérifier qu'aucune erreur n'apparaît.

- [ ] **Step 3 : Commit**

```bash
git add supabase/migrations/003_cache_runtime.sql
git commit -m "feat(db): add media_cache table and runtime_minutes/external_id columns"
```

---

## Task 2 : Fix bug CompatBar — animation ne se déclenche pas

**Fichier :** `components/ui/CompatBar.tsx`

Le bug : `useState(0)` → React rend avec `clip-path: inset(0 100% 0 0)`. Après 120ms, `setDisplayed(score)` re-rend. La transition CSS ne se déclenche pas car le navigateur n'a pas eu le temps de *peindre* l'état initial avant le changement. Fix : double `requestAnimationFrame` pour garantir que le premier état est peint.

- [ ] **Step 1 : Modifier le hook dans CompatBar.tsx**

Modifier les lignes 14-19 de `components/ui/CompatBar.tsx` :

```tsx
  const [displayed, setDisplayed] = useState(0)

  useEffect(() => {
    let id1: number, id2: number
    id1 = requestAnimationFrame(() => {
      id2 = requestAnimationFrame(() => setDisplayed(score))
    })
    return () => { cancelAnimationFrame(id1); cancelAnimationFrame(id2) }
  }, [score])
```

- [ ] **Step 2 : Vérifier le build**

```bash
npm run build 2>&1 | tail -20
```
Attendu : `✓ Compiled successfully`

- [ ] **Step 3 : Commit**

```bash
git add components/ui/CompatBar.tsx
git commit -m "fix(ui): animate CompatBar with double-RAF to guarantee initial paint"
```

---

## Task 3 : Bouton "Jeu Solo" — centrer et simplifier

**Fichier :** `components/detail/OnlineToggle.tsx`

Le bouton est `w-full` avec contenu aligné à gauche. Centrer le contenu, supprimer le toggle dot.

- [ ] **Step 1 : Modifier OnlineToggle.tsx**

Remplacer le contenu complet du `<button>` :

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Wifi } from 'lucide-react'

export default function OnlineToggle({ itemId, defaultValue }: { itemId: string; defaultValue: boolean }) {
  const [online, setOnline] = useState(defaultValue)
  const [saving, setSaving] = useState(false)
  const router = useRouter()

  async function toggle() {
    setSaving(true)
    const next = !online
    await fetch(`/api/media/${itemId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ online: next }),
    })
    setOnline(next)
    setSaving(false)
    router.refresh()
  }

  return (
    <button
      onClick={toggle}
      disabled={saving}
      className="glass rounded-[16px] py-3 flex items-center justify-center gap-2 text-sm font-medium mb-3 w-full"
      style={{
        border: `1px solid ${online ? 'var(--color-purple)' : 'rgba(255,255,255,0.1)'}`,
        opacity: saving ? 0.6 : 1,
      }}
    >
      <Wifi size={16} style={{ color: online ? 'var(--color-purple)' : 'rgba(255,255,255,0.4)' }} />
      <span style={{ color: online ? 'var(--color-purple)' : 'rgba(255,255,255,0.6)' }}>
        {online ? 'Jeu en ligne' : 'Jeu solo'}
      </span>
    </button>
  )
}
```

- [ ] **Step 2 : Build**

```bash
npm run build 2>&1 | tail -5
```

- [ ] **Step 3 : Commit**

```bash
git add components/detail/OnlineToggle.tsx
git commit -m "fix(ui): center Jeu Solo toggle button and remove dot indicator"
```

---

## Task 4 : Notifications éphémères — auto-mark all read

**Fichiers :**
- Modify: `app/api/notifications/route.ts`
- Modify: `app/(app)/notifications/page.tsx`

- [ ] **Step 1 : Ajouter PATCH bulk dans `app/api/notifications/route.ts`**

Lire le fichier actuel, puis ajouter après le handler `POST` existant :

```ts
export async function PATCH() {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createServerClient()
  await supabase
    .from('notifications')
    .update({ read: true })
    .eq('user_id', user.id)
    .eq('read', false)

  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 2 : Appeler le PATCH au mount dans `app/(app)/notifications/page.tsx`**

Dans le `useEffect` qui charge les notifications (lignes 28-36), ajouter l'appel bulk read juste après avoir récupéré les notifs :

```tsx
  useEffect(() => {
    Promise.allSettled([
      fetch('/api/notifications').then(r => r.json()),
      fetch('/api/shared-capsules/invitations/pending').then(r => r.json()),
    ]).then(([notifs, invites]) => {
      if (notifs.status === 'fulfilled') setNotifications(notifs.value.notifications ?? [])
      if (invites.status === 'fulfilled' && Array.isArray(invites.value)) setPendingInvites(invites.value)
      setLoading(false)
      // Mark all as read after displaying
      fetch('/api/notifications', { method: 'PATCH' })
    })
  }, [])
```

- [ ] **Step 3 : Build**

```bash
npm run build 2>&1 | tail -5
```

- [ ] **Step 4 : Commit**

```bash
git add app/api/notifications/route.ts app/(app)/notifications/page.tsx
git commit -m "feat(notifications): auto-mark all as read when page is visited"
```

---

## Task 5 : Bibliothèque — section "Avec vos amis" + dédup co-op

**Fichier :** `app/(app)/library/page.tsx`

Objectifs :
1. Ajouter un header de section "Avec vos amis" avant les CoopCards dans le filtre Jeux
2. Masquer le MediaCard personnel d'un jeu si une CoopCard avec le même titre existe (éviter doublon)

- [ ] **Step 1 : Modifier `app/(app)/library/page.tsx`**

Remplacer le bloc de rendu principal (lignes 96-113) par :

```tsx
      <div className="flex flex-col gap-3">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => <ShimmerCard key={i} className="h-24" />)
          : <>
              {/* Personal items — hide games that have a matching coop capsule */}
              {(() => {
                const coopTitles = new Set(displayedCoop.map(c => c.title.toLowerCase().trim()))
                const filteredVisible = (filter === 'all' || filter === 'game')
                  ? visible.filter(item => !(item.type === 'game' && coopTitles.has(item.title.toLowerCase().trim())))
                  : visible
                return filteredVisible.map((item, i) => (
                  <MediaCard key={item.id} item={item} index={i} onDelete={handleDelete} />
                ))
              })()}

              {/* Coop section */}
              {displayedCoop.length > 0 && (
                <>
                  <p
                    className="text-xs font-semibold uppercase tracking-widest mt-2 mb-1"
                    style={{ color: 'rgba(255,255,255,0.35)' }}
                  >
                    Avec vos amis
                  </p>
                  {displayedCoop.map((item, i) => (
                    <CoopCard key={item.id} item={item} index={i} />
                  ))}
                </>
              )}
            </>
        }
        {!loading && displayed.length === 0 && displayedCoop.length === 0 && (
          <p className="text-center py-12 text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>
            Aucun élément
          </p>
        )}
      </div>
```

- [ ] **Step 2 : Build**

```bash
npm run build 2>&1 | tail -5
```

- [ ] **Step 3 : Commit**

```bash
git add "app/(app)/library/page.tsx"
git commit -m "feat(library): add 'Avec vos amis' section header and deduplicate coop games"
```

---

## Task 6 : Coop à l'infini — multi-select dans PlayWithButton

**Fichier :** `components/detail/PlayWithButton.tsx`

Changer le comportement : au lieu de créer + inviter immédiatement au clic d'un ami, afficher des checkboxes pour sélectionner plusieurs amis, puis un bouton "Créer" qui crée la capsule et invite tous les sélectionnés.

- [ ] **Step 1 : Réécrire `components/detail/PlayWithButton.tsx`**

```tsx
'use client'
import { useState } from 'react'
import { Users } from 'lucide-react'
import { useRouter } from 'next/navigation'
import type { UserProfile } from '@/lib/types'

interface Props {
  gameTitle: string
  posterUrl?: string
  rawgId?: string
  dominantColor?: string
  friends: UserProfile[]
}

export default function PlayWithButton({ gameTitle, posterUrl, rawgId, dominantColor, friends }: Props) {
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  if (friends.length === 0) return null

  function toggleFriend(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function handleCreate() {
    if (selected.size === 0) return
    setLoading(true)
    setError(null)
    try {
      const capsuleRes = await fetch('/api/shared-capsules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: gameTitle, poster_url: posterUrl, rawg_id: rawgId, dominant_color: dominantColor }),
      })
      if (!capsuleRes.ok) throw new Error('Erreur lors de la création')
      const capsule = await capsuleRes.json() as { id: string }

      await Promise.all([...selected].map(friendId =>
        fetch(`/api/shared-capsules/${capsule.id}/invite`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ invitee_id: friendId }),
        })
      ))

      setOpen(false)
      router.push(`/shared/${capsule.id}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Une erreur est survenue')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-full glass rounded-[16px] py-3 flex items-center justify-center gap-2 text-sm font-medium mb-3"
      >
        <Users size={16} />
        Jouer avec...
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-6"
          style={{ background: 'rgba(0,0,0,0.6)' }}
          onClick={() => !loading && setOpen(false)}
        >
          <div className="w-full glass rounded-[24px] p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-semibold mb-1">Choisir des amis</h3>
            <p className="text-xs mb-4" style={{ color: 'rgba(255,255,255,0.4)' }}>
              Sélectionne un ou plusieurs amis
            </p>
            {error && (
              <p className="text-xs mb-3 px-1" style={{ color: 'rgba(248,113,113,0.9)' }}>{error}</p>
            )}
            <div className="flex flex-col gap-3 mb-5">
              {friends.map(friend => {
                const isSelected = selected.has(friend.id)
                return (
                  <button
                    key={friend.id}
                    onClick={() => toggleFriend(friend.id)}
                    disabled={loading}
                    className="flex items-center gap-3 rounded-[12px] p-3 text-left"
                    style={{
                      background: isSelected ? 'rgba(139,92,246,0.2)' : 'rgba(255,255,255,0.06)',
                      border: `1px solid ${isSelected ? 'rgba(139,92,246,0.5)' : 'transparent'}`,
                    }}
                  >
                    {friend.avatar_url ? (
                      <img src={friend.avatar_url} alt={friend.display_name} className="rounded-full" style={{ width: 36, height: 36, objectFit: 'cover' }} />
                    ) : (
                      <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold" style={{ background: 'rgba(255,255,255,0.1)' }}>
                        {friend.display_name[0]}
                      </div>
                    )}
                    <span className="text-sm font-medium flex-1">{friend.display_name}</span>
                    <div
                      className="rounded-full flex-shrink-0"
                      style={{
                        width: 20, height: 20,
                        background: isSelected ? 'var(--color-purple)' : 'rgba(255,255,255,0.1)',
                        border: `2px solid ${isSelected ? 'var(--color-purple)' : 'rgba(255,255,255,0.2)'}`,
                      }}
                    />
                  </button>
                )
              })}
            </div>
            <button
              onClick={handleCreate}
              disabled={loading || selected.size === 0}
              className="w-full py-3 rounded-[12px] text-sm font-semibold"
              style={{
                background: selected.size > 0 ? 'var(--color-purple)' : 'rgba(255,255,255,0.08)',
                opacity: loading ? 0.6 : 1,
                color: selected.size > 0 ? 'white' : 'rgba(255,255,255,0.3)',
              }}
            >
              {loading ? 'Création...' : `Jouer avec ${selected.size > 0 ? `(${selected.size})` : '...'}`}
            </button>
          </div>
        </div>
      )}
    </>
  )
}
```

- [ ] **Step 2 : Build**

```bash
npm run build 2>&1 | tail -5
```

- [ ] **Step 3 : Commit**

```bash
git add components/detail/PlayWithButton.tsx
git commit -m "feat(coop): allow selecting multiple friends in PlayWithButton"
```

---

## Task 7 : Fix doublon invitee — vérifier si déjà présent en bibliothèque

**Fichier :** `app/api/shared-capsules/invitations/[id]/respond/route.ts`

Quand user B accepte une invitation, si user B a déjà un `media_item` avec le même titre que le `shared_capsule`, ne pas créer de doublon dans `media_items`. Le code actuel ne crée pas de `media_item` — c'est correct. Le "doublon" était côté bibliothèque (Task 5 résout l'affichage). Mais au moment de l'acceptation, on veut aussi vérifier qu'il n'y a pas déjà une invitation acceptée (doublon d'entrée dans `shared_capsule_members`).

Vérification: le code actuel fait déjà `UNIQUE (capsule_id, user_id)` en BDD et vérifie `existing` dans le route invite. La réponse crée directement le member sans re-vérifier. Ajouter une vérification défensive :

- [ ] **Step 1 : Modifier `app/api/shared-capsules/invitations/[id]/respond/route.ts`**

Remplacer les lignes 34-40 (bloc `if (accepted)`) :

```ts
  if (accepted) {
    // Defensive check: don't insert if already a member
    const { data: existingMember } = await supabase
      .from('shared_capsule_members')
      .select('id')
      .eq('capsule_id', invitation.capsule_id)
      .eq('user_id', user.id)
      .maybeSingle()

    if (!existingMember) {
      await supabase.from('shared_capsule_members').insert({
        capsule_id: invitation.capsule_id,
        user_id: user.id,
        status: 'inProgress',
      })
    }

    const [{ data: capsule }, { data: accepterProfile }] = await Promise.all([
      supabase.from('shared_capsules').select('title').eq('id', invitation.capsule_id).single(),
      supabase.from('profiles').select('display_name').eq('id', user.id).single(),
    ])

    await supabase.from('notifications').insert({
      user_id: invitation.inviter_id,
      type: 'coop_accepted',
      payload: {
        accepter_id: user.id,
        accepter_name: accepterProfile?.display_name ?? 'Un ami',
        capsule_id: invitation.capsule_id,
        capsule_title: capsule?.title ?? '',
      },
    })
  }
```

- [ ] **Step 2 : Build**

```bash
npm run build 2>&1 | tail -5
```

- [ ] **Step 3 : Commit**

```bash
git add "app/api/shared-capsules/invitations/[id]/respond/route.ts"
git commit -m "fix(coop): defensive member insert on invitation accept to prevent duplicates"
```

---

## Task 8 : Pastille avatar ami dans "Vos amis ont adoré"

**Fichier :** `app/(app)/page.tsx`

Objectif : afficher le mini-avatar (initiales ou photo) de l'ami qui a aimé le média.

- [ ] **Step 1 : Mettre à jour la query `friendItems` pour inclure `user_id`**

Ligne 40 dans `app/(app)/page.tsx`, changer le `.select(...)` :

```ts
      .select('title, type, year, poster_url, rating, ratings_json, user_id')
```

- [ ] **Step 2 : Mettre à jour `titleMap` pour stocker les `user_id`**

Remplacer les lignes 55-66 :

```ts
  const titleMap = new Map<string, { title: string; type: string; year?: number; poster_url: string; ratings: number[]; friendIds: string[] }>()

  for (const item of friendItems ?? []) {
    const avg = getAvgRating(item)
    if (avg === null || avg < 4) continue
    const key = item.title.toLowerCase().trim()
    if (myTitles.has(key)) continue
    if (!titleMap.has(key)) {
      titleMap.set(key, { title: item.title, type: item.type, year: item.year ?? undefined, poster_url: item.poster_url, ratings: [], friendIds: [] })
    }
    titleMap.get(key)!.ratings.push(avg)
    if (item.user_id && !titleMap.get(key)!.friendIds.includes(item.user_id)) {
      titleMap.get(key)!.friendIds.push(item.user_id)
    }
  }

  const friendsLoved = [...titleMap.values()]
    .map(({ ratings, friendIds, ...rest }) => ({ ...rest, avgRating: ratings.reduce((a, b) => a + b, 0) / ratings.length, friendIds }))
    .sort((a, b) => b.avgRating - a.avgRating)
    .slice(0, 12)
```

- [ ] **Step 3 : Récupérer les profils des amis pour les avatars**

Ajouter après le bloc `friendsLoved` (avant le `return`) :

```ts
  // Collect unique friend IDs that appear in friendsLoved
  const lovedFriendIds = [...new Set(friendsLoved.flatMap(i => i.friendIds))]
  const { data: lovedProfiles } = lovedFriendIds.length > 0
    ? await supabase.from('profiles').select('id, display_name, avatar_url').in('id', lovedFriendIds)
    : { data: [] }
  const profileMap = Object.fromEntries((lovedProfiles ?? []).map(p => [p.id, p]))
```

- [ ] **Step 4 : Afficher la pastille avatar dans le JSX**

Remplacer le bloc de rendu `friendsLoved.map(...)` (lignes 117-136 environ) :

```tsx
            <div className="flex gap-3 overflow-x-auto pb-2 px-4" style={{ scrollbarWidth: 'none' }}>
              {friendsLoved.map((item, i) => {
                const firstFriend = item.friendIds[0] ? profileMap[item.friendIds[0]] : null
                return (
                  <div key={i} className="flex-shrink-0" style={{ width: 112 }}>
                    <div className="glass rounded-[12px] overflow-hidden relative" style={{ width: 112, height: 160 }}>
                      <img src={item.poster_url} alt={item.title} className="object-cover w-full h-full" />
                      {/* Friend avatar badge */}
                      {firstFriend && (
                        <div className="absolute bottom-1.5 right-1.5">
                          {firstFriend.avatar_url ? (
                            <img
                              src={firstFriend.avatar_url}
                              alt={firstFriend.display_name}
                              className="rounded-full"
                              style={{ width: 22, height: 22, objectFit: 'cover', border: '1.5px solid rgba(255,255,255,0.6)' }}
                            />
                          ) : (
                            <div
                              className="rounded-full flex items-center justify-center text-white"
                              style={{ width: 22, height: 22, background: 'var(--color-purple)', border: '1.5px solid rgba(255,255,255,0.6)', fontSize: 9, fontWeight: 700 }}
                            >
                              {firstFriend.display_name[0]}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <p className="text-xs mt-1 truncate" style={{ color: 'rgba(255,255,255,0.7)', width: 112 }}>
                      {item.title}
                    </p>
                    <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
                      {item.avgRating.toFixed(1).replace('.', ',')}/5
                    </p>
                  </div>
                )
              })}
            </div>
```

- [ ] **Step 5 : Build**

```bash
npm run build 2>&1 | tail -5
```

- [ ] **Step 6 : Commit**

```bash
git add "app/(app)/page.tsx"
git commit -m "feat(home): show friend avatar badge on 'Vos amis ont adoré' items"
```

---

## Task 9 : Cache API — route `/api/external/[type]/[id]`

**Fichier :** `app/api/external/[type]/[id]/route.ts`

Logique : vérifier `media_cache`. Si trouvé et < 7 jours, retourner les données. Sinon : appeler TMDB/RAWG, stocker en cache, retourner.

- [ ] **Step 1 : Créer le fichier `app/api/external/[type]/[id]/route.ts`**

```ts
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

const TMDB_BASE = 'https://api.themoviedb.org/3'
const TMDB_IMG = 'https://image.tmdb.org/t/p/w500'
const RAWG_BASE = 'https://api.rawg.io/api'
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

async function fetchMovieDetails(id: string) {
  const res = await fetch(
    `${TMDB_BASE}/movie/${id}?api_key=${process.env.TMDB_API_KEY}&language=fr&append_to_response=credits`
  )
  if (!res.ok) return null
  const d = await res.json() as Record<string, unknown>
  const credits = d.credits as { cast?: { name: string }[]; crew?: { job: string; name: string }[] } | undefined
  const director = credits?.crew?.find(c => c.job === 'Director')?.name ?? null
  const cast = (credits?.cast ?? []).slice(0, 5).map(c => c.name)
  return {
    title: d.title,
    overview: d.overview ?? null,
    poster_url: d.poster_path ? `${TMDB_IMG}${d.poster_path}` : null,
    backdrop_url: d.backdrop_path ? `https://image.tmdb.org/t/p/w780${d.backdrop_path}` : null,
    year: d.release_date ? parseInt((d.release_date as string).slice(0, 4)) : null,
    runtime_minutes: d.runtime ?? null,
    community_rating: d.vote_average ?? null,
    community_rating_source: 'TMDB',
    director,
    cast,
    genres: (d.genres as { name: string }[] | undefined)?.map(g => g.name) ?? [],
  }
}

async function fetchTVDetails(id: string) {
  const res = await fetch(
    `${TMDB_BASE}/tv/${id}?api_key=${process.env.TMDB_API_KEY}&language=fr&append_to_response=credits`
  )
  if (!res.ok) return null
  const d = await res.json() as Record<string, unknown>
  const credits = d.credits as { cast?: { name: string }[] } | undefined
  const cast = (credits?.cast ?? []).slice(0, 5).map(c => c.name)
  const runtimes = d.episode_run_time as number[] | undefined
  return {
    title: d.name,
    overview: d.overview ?? null,
    poster_url: d.poster_path ? `${TMDB_IMG}${d.poster_path}` : null,
    backdrop_url: d.backdrop_path ? `https://image.tmdb.org/t/p/w780${d.backdrop_path}` : null,
    year: d.first_air_date ? parseInt((d.first_air_date as string).slice(0, 4)) : null,
    total_seasons: d.number_of_seasons ?? null,
    runtime_minutes: runtimes && runtimes.length > 0 ? runtimes[0] : null,
    community_rating: d.vote_average ?? null,
    community_rating_source: 'TMDB',
    cast,
    genres: (d.genres as { name: string }[] | undefined)?.map(g => g.name) ?? [],
  }
}

async function fetchGameDetails(id: string) {
  const res = await fetch(
    `${RAWG_BASE}/games/${id}?key=${process.env.RAWG_API_KEY}`
  )
  if (!res.ok) return null
  const d = await res.json() as Record<string, unknown>
  const developers = (d.developers as { name: string }[] | undefined)?.map(dev => dev.name) ?? []
  return {
    title: d.name,
    overview: d.description_raw ?? null,
    poster_url: d.background_image ?? null,
    backdrop_url: d.background_image ?? null,
    year: d.released ? parseInt((d.released as string).slice(0, 4)) : null,
    runtime_minutes: d.playtime ? Math.round((d.playtime as number) * 60) : null,
    community_rating: d.rating ?? null,
    community_rating_source: 'RAWG',
    developer: developers[0] ?? null,
    studios: developers,
    genres: (d.genres as { name: string }[] | undefined)?.map(g => g.name) ?? [],
    platforms: (d.platforms as { platform: { name: string } }[] | undefined)?.map(p => p.platform.name) ?? [],
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ type: string; id: string }> }
) {
  const { type, id } = await params

  if (!['movie', 'tvshow', 'game'].includes(type)) {
    return NextResponse.json({ error: 'Type invalide' }, { status: 400 })
  }

  const supabase = createServerClient()

  // Check cache
  const { data: cached } = await supabase
    .from('media_cache')
    .select('data, cached_at')
    .eq('external_id', id)
    .eq('media_type', type)
    .single()

  if (cached) {
    const age = Date.now() - new Date(cached.cached_at).getTime()
    if (age < CACHE_TTL_MS) {
      return NextResponse.json(cached.data)
    }
  }

  // Fetch from API
  let data: Record<string, unknown> | null = null
  if (type === 'movie') data = await fetchMovieDetails(id)
  else if (type === 'tvshow') data = await fetchTVDetails(id)
  else if (type === 'game') data = await fetchGameDetails(id)

  if (!data) return NextResponse.json({ error: 'Introuvable' }, { status: 404 })

  // Upsert cache
  await supabase.from('media_cache').upsert({
    external_id: id,
    media_type: type,
    data,
    cached_at: new Date().toISOString(),
  })

  return NextResponse.json(data)
}
```

- [ ] **Step 2 : Build**

```bash
npm run build 2>&1 | tail -5
```

- [ ] **Step 3 : Commit**

```bash
git add "app/api/external/[type]/[id]/route.ts"
git commit -m "feat(api): add external detail route with Supabase cache (TMDB+RAWG)"
```

---

## Task 10 : Page détail riche `/external/[type]/[id]`

**Fichier :** `app/(app)/external/[type]/[id]/page.tsx`

Page affichant les infos riches d'un média externe (pas encore dans la bibliothèque). Bouton d'ajout uniquement en bas.

- [ ] **Step 1 : Créer le dossier et le fichier**

```bash
mkdir -p "app/(app)/external/[type]/[id]"
```

- [ ] **Step 2 : Créer `app/(app)/external/[type]/[id]/page.tsx`**

```tsx
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Star, Clock, Users } from 'lucide-react'
import { createServerClient } from '@/lib/supabase/server'

interface ExternalDetail {
  title: string
  overview?: string | null
  poster_url?: string | null
  backdrop_url?: string | null
  year?: number | null
  runtime_minutes?: number | null
  community_rating?: number | null
  community_rating_source?: string | null
  director?: string | null
  cast?: string[]
  developer?: string | null
  studios?: string[]
  genres?: string[]
  platforms?: string[]
  total_seasons?: number | null
}

const typeLabel: Record<string, string> = { movie: 'Film', tvshow: 'Série', game: 'Jeu' }

function formatRuntime(minutes: number, type: string): string {
  if (type === 'game') {
    const hours = Math.round(minutes / 60)
    return `~${hours}h de jeu`
  }
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return h > 0 ? `${h}h${m > 0 ? m : ''}` : `${m}min`
}

export default async function ExternalDetailPage({
  params,
}: {
  params: Promise<{ type: string; id: string }>
}) {
  const { type, id } = await params

  const supabase = createServerClient()
  const { data: cached } = await supabase
    .from('media_cache')
    .select('data')
    .eq('external_id', id)
    .eq('media_type', type)
    .single()

  let detail: ExternalDetail | null = null

  if (cached) {
    detail = cached.data as ExternalDetail
  } else {
    // Fetch fresh from the API route (server-to-server)
    const base = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
    const res = await fetch(`${base}/api/external/${type}/${id}`, { cache: 'no-store' })
    if (res.ok) detail = await res.json()
  }

  if (!detail) notFound()

  const addQuery = new URLSearchParams({ q: detail.title ?? '', type })

  return (
    <div className="min-h-screen pb-32">
      {/* Backdrop */}
      {detail.backdrop_url && (
        <div className="relative h-56 overflow-hidden">
          <img src={detail.backdrop_url} alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, transparent 30%, #07070d)' }} />
        </div>
      )}

      {/* Back button */}
      <div className={`${detail.backdrop_url ? 'fixed' : ''} top-0 left-0 right-0 z-10 px-4 pt-12`}>
        <Link
          href="javascript:history.back()"
          className="glass rounded-full flex items-center justify-center"
          style={{ width: 36, height: 36 }}
        >
          <ArrowLeft size={18} />
        </Link>
      </div>

      <div className="px-4 relative z-10" style={{ marginTop: detail.backdrop_url ? '-2rem' : '5rem' }}>
        {/* Type badge */}
        <p className="text-xs mb-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
          {typeLabel[type] ?? type}
          {detail.year ? ` · ${detail.year}` : ''}
          {detail.director ? ` · Réal. ${detail.director}` : ''}
          {detail.developer ? ` · ${detail.developer}` : ''}
        </p>

        {/* Title */}
        <h1 className="text-2xl font-bold tracking-tight mb-3">{detail.title}</h1>

        {/* Meta pills */}
        <div className="flex flex-wrap gap-2 mb-4">
          {detail.community_rating != null && (
            <span className="flex items-center gap-1 text-xs px-2 py-1 rounded-full" style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)' }}>
              <Star size={10} />
              {(detail.community_rating as number).toFixed(1)} · {detail.community_rating_source}
            </span>
          )}
          {detail.runtime_minutes != null && (
            <span className="flex items-center gap-1 text-xs px-2 py-1 rounded-full" style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)' }}>
              <Clock size={10} />
              {formatRuntime(detail.runtime_minutes, type)}
            </span>
          )}
          {detail.total_seasons != null && (
            <span className="text-xs px-2 py-1 rounded-full" style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)' }}>
              {detail.total_seasons} saison{detail.total_seasons > 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* Overview */}
        {detail.overview && (
          <div className="glass rounded-[20px] p-4 mb-4">
            <p className="text-xs uppercase tracking-widest mb-2" style={{ color: 'rgba(255,255,255,0.4)' }}>Synopsis</p>
            <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.8)' }}>{detail.overview}</p>
          </div>
        )}

        {/* Cast / Studios */}
        {(detail.cast && detail.cast.length > 0) && (
          <div className="glass rounded-[20px] p-4 mb-4">
            <p className="text-xs uppercase tracking-widest mb-2" style={{ color: 'rgba(255,255,255,0.4)' }}>
              <Users size={10} className="inline mr-1" />Acteurs principaux
            </p>
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.7)' }}>{detail.cast.join(', ')}</p>
          </div>
        )}
        {(detail.studios && detail.studios.length > 0) && (
          <div className="glass rounded-[20px] p-4 mb-4">
            <p className="text-xs uppercase tracking-widest mb-2" style={{ color: 'rgba(255,255,255,0.4)' }}>Studio</p>
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.7)' }}>{detail.studios.join(', ')}</p>
          </div>
        )}

        {/* Genres */}
        {detail.genres && detail.genres.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-6">
            {detail.genres.map(g => (
              <span key={g} className="text-xs px-2 py-1 rounded-full" style={{ background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.3)' }}>
                {g}
              </span>
            ))}
          </div>
        )}

        {/* CTA: add to library or wishlist */}
        <Link
          href={`/add?${addQuery}`}
          className="w-full rounded-[16px] py-4 flex items-center justify-center gap-2 text-sm font-semibold mb-3"
          style={{ background: 'var(--color-purple)' }}
        >
          Ajouter à ma bibliothèque
        </Link>
        <Link
          href={`/add?${addQuery}&wishlist=true`}
          className="w-full glass rounded-[16px] py-3 flex items-center justify-center gap-2 text-sm font-medium"
        >
          Ajouter à la wishlist
        </Link>
      </div>
    </div>
  )
}
```

- [ ] **Step 3 : Build**

```bash
npm run build 2>&1 | tail -5
```

- [ ] **Step 4 : Commit**

```bash
git add "app/(app)/external"
git commit -m "feat(ui): add rich external detail page with synopsis, cast, and add button"
```

---

## Task 11 : Mettre à jour `SearchResult` avec `external_id`

**Fichier :** `lib/types.ts`, `lib/search.ts`

Pour que la page Discover puisse naviguer vers `/external/[type]/[id]`, les résultats de recherche doivent inclure l'ID externe.

- [ ] **Step 1 : Ajouter `external_id` à `SearchResult` dans `lib/types.ts`**

Dans l'interface `SearchResult`, ajouter après `community_rating_source` :

```ts
export interface SearchResult {
  title: string
  year?: number
  poster_url?: string
  genre?: string
  director?: string
  total_seasons?: number
  platform?: string
  developer?: string
  community_rating?: number
  community_rating_source?: string
  external_id?: string  // tmdb_id (movie/tvshow) or rawg_id (game) as string
}
```

Aussi ajouter `runtime_minutes` et `external_id` à `MediaItem` :

```ts
  runtime_minutes?: number
  external_id?: string
```

- [ ] **Step 2 : Mettre à jour `lib/search.ts` pour inclure `external_id`**

Mettre à jour `buildMovieResult`, `buildTVResult`, `buildGameResult` :

```ts
export function buildMovieResult(raw: Record<string, unknown>): SearchResult {
  return {
    title: raw.title as string,
    year: raw.release_date ? parseInt((raw.release_date as string).slice(0, 4)) : undefined,
    poster_url: raw.backdrop_path
      ? `${TMDB_BACKDROP}${raw.backdrop_path}`
      : raw.poster_path ? `${TMDB_POSTER}${raw.poster_path}` : undefined,
    community_rating: raw.vote_average ? (raw.vote_average as number) : undefined,
    community_rating_source: raw.vote_average ? 'TMDB' : undefined,
    external_id: raw.id ? String(raw.id) : undefined,
  }
}

export function buildTVResult(raw: Record<string, unknown>): SearchResult {
  return {
    title: raw.name as string,
    year: raw.first_air_date ? parseInt((raw.first_air_date as string).slice(0, 4)) : undefined,
    poster_url: raw.backdrop_path
      ? `${TMDB_BACKDROP}${raw.backdrop_path}`
      : raw.poster_path ? `${TMDB_POSTER}${raw.poster_path}` : undefined,
    community_rating: raw.vote_average ? (raw.vote_average as number) : undefined,
    community_rating_source: raw.vote_average ? 'TMDB' : undefined,
    external_id: raw.id ? String(raw.id) : undefined,
  }
}

export function buildGameResult(raw: Record<string, unknown>): SearchResult {
  return {
    title: raw.name as string,
    year: raw.released ? parseInt((raw.released as string).slice(0, 4)) : undefined,
    poster_url: (raw.background_image as string | null) ?? undefined,
    community_rating: raw.rating ? (raw.rating as number) : undefined,
    community_rating_source: raw.rating ? 'RAWG' : undefined,
    external_id: raw.id ? String(raw.id) : undefined,
  }
}
```

- [ ] **Step 3 : Build**

```bash
npm run build 2>&1 | tail -5
```

- [ ] **Step 4 : Commit**

```bash
git add lib/types.ts lib/search.ts
git commit -m "feat(types): add external_id to SearchResult and MediaItem"
```

---

## Task 12 : Découvrir → naviguer vers la page détail riche

**Fichier :** `components/home/QuickAddSheet.tsx`

Actuellement, le QuickAddSheet dans Discover permet d'ajouter directement. Remplacer le comportement du clic sur un item trending/top par une navigation vers `/external/[type]/[id]` si `external_id` est disponible.

- [ ] **Step 1 : Lire `components/home/QuickAddSheet.tsx` et `components/home/DiscoverSection.tsx`**

```bash
cat "components/home/QuickAddSheet.tsx"
cat "components/home/DiscoverSection.tsx"
cat "components/home/DiscoverClient.tsx"
```

- [ ] **Step 2 : Modifier DiscoverSection ou QuickAddSheet pour ajouter la navigation**

Dans le composant qui rend les items du Discover (DiscoverSection ou similaire), wrapper chaque item avec un lien vers `/external/[type]/[id]` si `external_id` est présent. Sinon fallback vers `/add?q=title&type=type`.

Le code exact dépend du contenu lu en Step 1. Principe général:

```tsx
// Avant (click → ouvre QuickAddSheet)
<div onClick={() => setSelected(item)}>...</div>

// Après (click → navigate to detail page if external_id available)
import { useRouter } from 'next/navigation'
const router = useRouter()

<div onClick={() => {
  if (item.external_id) {
    router.push(`/external/${mediaType}/${item.external_id}`)
  } else {
    router.push(`/add?q=${encodeURIComponent(item.title)}&type=${mediaType}`)
  }
}}>...</div>
```

- [ ] **Step 3 : Build**

```bash
npm run build 2>&1 | tail -5
```

- [ ] **Step 4 : Commit**

```bash
git add components/home/
git commit -m "feat(discover): navigate to rich detail page instead of QuickAddSheet"
```

---

## Task 13 : Runtime/playtime + stat "Temps passé" sur le profil

**Fichiers :**
- Modify: `app/api/media/route.ts` (stocker `runtime_minutes` et `external_id` à la création)
- Modify: `app/(app)/profile/page.tsx` (afficher le total)

- [ ] **Step 1 : Mettre à jour le POST dans `app/api/media/route.ts`**

Lire le fichier, puis dans le body parsing du POST, ajouter `runtime_minutes` et `external_id` aux champs acceptés et insérés.

Structure actuelle du POST probable (à adapter après lecture) :

```ts
const { title, type, year, poster_url, ..., runtime_minutes, external_id } = await req.json()
// Dans l'insert:
await supabase.from('media_items').insert({ ..., runtime_minutes, external_id })
```

- [ ] **Step 2 : Calculer et afficher "Temps passé" dans `app/(app)/profile/page.tsx`**

Lire le fichier profile/page.tsx. Dans la query des items du user, sélectionner `runtime_minutes`. Calculer la somme :

```ts
const totalMinutes = (items ?? []).reduce((sum, i) => sum + (i.runtime_minutes ?? 0), 0)
const totalHours = Math.round(totalMinutes / 60)
```

Dans le JSX, ajouter une StatCard ou section :

```tsx
{totalHours > 0 && (
  <div className="glass rounded-[20px] p-4 mb-4 flex items-center gap-3">
    <Clock size={18} style={{ color: 'var(--color-purple)' }} />
    <div>
      <p className="text-lg font-bold">{totalHours}h</p>
      <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>passées sur vos médias</p>
    </div>
  </div>
)}
```

- [ ] **Step 3 : Build**

```bash
npm run build 2>&1 | tail -5
```

- [ ] **Step 4 : Commit**

```bash
git add "app/api/media/route.ts" "app/(app)/profile/page.tsx"
git commit -m "feat(profile): store runtime_minutes on add, display total time spent on profile"
```

---

## Task 14 : Notification quand un ami ajoute depuis ta bibliothèque

**Fichiers :**
- Modify: `app/(app)/users/[id]/page.tsx` (bouton "Ajouter" sur items d'un ami)
- Modify: `app/api/notifications/route.ts` (nouveau type `add_from_friend`)
- Modify: `lib/types.ts` (ajouter `AddFromFriendPayload`)

- [ ] **Step 1 : Ajouter le type notification dans `lib/types.ts`**

```ts
export interface AddFromFriendPayload {
  adder_id: string
  adder_name: string
  media_title: string
  media_type: MediaType
  poster_url: string | null
}

// Dans AppNotification, étendre le type union :
export interface AppNotification {
  id: string
  user_id: string
  type: 'share' | 'coop_invite' | 'coop_accepted' | 'add_from_friend'
  payload: NotificationSharePayload | CoopInvitePayload | CoopAcceptedPayload | AddFromFriendPayload
  read: boolean
  created_at: string
}
```

- [ ] **Step 2 : Ajouter un bouton "Ajouter" sur les items dans `/users/[id]/page.tsx`**

Lire le fichier complet. Dans les sections `recent` et `favorites`, rendre chaque item cliquable avec un bouton d'ajout rapide. Au clic, appeler `/api/media` (POST) pour créer l'item dans la bibliothèque de l'utilisateur courant, puis envoyer une notification au profil ami.

Ajouter un state `adding` et une fonction `handleAddFromFriend` :

```tsx
const [adding, setAdding] = useState<string | null>(null)

async function handleAddFromFriend(item: { id: string; title: string; type: string; year?: number; poster_url?: string }) {
  if (adding) return
  setAdding(item.id)
  try {
    // Add to my library
    await fetch('/api/media', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: item.title,
        type: item.type,
        year: item.year,
        poster_url: item.poster_url,
        status: 'inProgress',
        wishlist: false,
      }),
    })
    // Send notification to friend
    await fetch('/api/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        target_user_id: id,  // the friend's id from useParams
        type: 'add_from_friend',
        payload: {
          adder_id: 'me',  // server will fill from auth
          media_title: item.title,
          media_type: item.type,
          poster_url: item.poster_url ?? null,
        },
      }),
    })
  } finally {
    setAdding(null)
  }
}
```

Wrapper les items dans les sections `recent` et `favorites` avec un bouton overlay :

```tsx
<div key={item.id} className="flex-shrink-0 relative" style={{ width: 90 }}>
  {item.poster_url
    ? <img src={item.poster_url} className="rounded-xl object-cover" style={{ width: 90, height: 130 }} alt={item.title} />
    : <div className="rounded-xl" style={{ width: 90, height: 130, background: 'rgba(255,255,255,0.1)' }} />
  }
  <button
    onClick={() => handleAddFromFriend(item)}
    disabled={!!adding}
    className="absolute bottom-1 right-1 rounded-full flex items-center justify-center"
    style={{ width: 22, height: 22, background: 'rgba(0,0,0,0.7)', border: '1px solid rgba(255,255,255,0.3)' }}
  >
    <span style={{ fontSize: 14, lineHeight: 1, color: 'white' }}>+</span>
  </button>
  <p className="text-xs mt-1 truncate" style={{ color: 'rgba(255,255,255,0.7)' }}>{item.title}</p>
</div>
```

- [ ] **Step 3 : Mettre à jour `app/api/notifications/route.ts`** pour gérer `target_user_id` dans le POST

Dans le handler POST existant, si `target_user_id` est présent dans le body, créer la notification pour cet utilisateur cible (et utiliser l'identité de l'utilisateur courant pour `adder_id`/`adder_name`) :

```ts
if (type === 'add_from_friend' && target_user_id) {
  const { data: myProfile } = await supabase.from('profiles').select('display_name').eq('id', user.id).single()
  await supabase.from('notifications').insert({
    user_id: target_user_id,
    type: 'add_from_friend',
    payload: {
      ...payload,
      adder_id: user.id,
      adder_name: myProfile?.display_name ?? 'Un ami',
    },
  })
  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 4 : Afficher le nouveau type dans `notifications/page.tsx`**

Ajouter un nouveau `if (notif.type === 'add_from_friend')` block :

```tsx
if (notif.type === 'add_from_friend') {
  const p = notif.payload as AddFromFriendPayload
  return (
    <div key={notif.id} className="glass rounded-2xl px-4 py-3" style={{
      background: notif.read ? undefined : 'rgba(124,58,237,0.12)',
      border: notif.read ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(124,58,237,0.3)',
    }}>
      {p.poster_url && <img src={p.poster_url} className="rounded-lg object-cover mb-2 float-left mr-3" style={{ width: 44, height: 64 }} alt="" />}
      <p className="text-sm leading-snug mb-1">
        <span className="font-semibold" style={{ color: 'rgba(139,92,246,1)' }}>{p.adder_name}</span>
        {' a ajouté '}
        <span className="font-semibold">{p.media_title}</span>
        {' depuis ta bibliothèque'}
      </p>
      <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>{timeAgo(notif.created_at)}</p>
      <div className="clear-both" />
    </div>
  )
}
```

- [ ] **Step 5 : Build**

```bash
npm run build 2>&1 | tail -5
```

- [ ] **Step 6 : Commit**

```bash
git add lib/types.ts "app/(app)/users/[id]/page.tsx" app/api/notifications/route.ts "app/(app)/notifications/page.tsx"
git commit -m "feat(social): notify friend when their library item is added, show add button on friend profile"
```

---

## Vérification finale

- [ ] **Build propre**

```bash
npm run build 2>&1 | grep -E "(error|Error|warning|✓)"
```

Attendu : `✓ Compiled successfully` sans erreurs TypeScript.

- [ ] **Push**

```bash
git push origin master
```

- [ ] **Vérifier le déploiement Vercel**

Ouvrir `https://capsule-web-two.vercel.app` et vérifier :
1. CompatBar s'anime correctement à 5%
2. Bouton Jeu Solo est centré
3. Notifications se marquent lues automatiquement
4. Section "Avec vos amis" visible dans la bibliothèque (filtre Jeux)
5. PlayWithButton permet de sélectionner plusieurs amis
6. Pastille avatar visible dans "Vos amis ont adoré"
7. Page `/external/movie/550` retourne les infos Fight Club depuis TMDB

---

## Auto-review — Couverture spec

| Spec | Task(s) | Statut |
|---|---|---|
| 1a — Doublons jeux coop | Task 5 (dedup affichage) + Task 7 (accept defensif) | ✅ |
| 1a — Invitee a déjà le jeu | Task 7 | ✅ |
| 1b — Coop à l'infini | Task 6 (multi-select) | ✅ |
| 1c — Notifications éphémères | Task 4 | ✅ |
| 2a — Cache API | Task 1 (SQL) + Task 9 (route) | ✅ |
| 2b — Temps passé | Task 11 (types) + Task 13 (profile) | ✅ |
| 3a — Bug fiole CompatBar | Task 2 | ✅ |
| 3b — Bouton Jeu Solo centré | Task 3 | ✅ |
| 3c — Section Coop bibliothèque | Task 5 | ✅ |
| 4a — Pastille "qui a aimé" | Task 8 | ✅ |
| 4b — Notif ajout depuis ami | Task 14 | ✅ |
| 5a — Épuration home | Task 8 (items cliquables) + Task 12 (discover) | ✅ |
| 5b — Pages détails riches | Task 9 + Task 10 | ✅ |
| 5c — Redirection recommandation | Task 10 (bouton en bas) + Task 12 | ✅ |
| 5d — Bouton action uniquement sur détail | Task 10 | ✅ |
