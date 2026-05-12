# Reactions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permettre aux utilisateurs de réagir avec un emoji (🔥👀✅😴) aux médias de leurs amis — interactif sur le profil ami, lecture seule sur la home.

**Architecture:** Table `reactions (item_id, from_user_id, emoji)` avec contrainte UNIQUE pour un seul emoji par user par item. Trois endpoints API (GET filtré aux amis, POST upsert, DELETE). UI optimiste : update local immédiat, requête en arrière-plan.

**Tech Stack:** Next.js 15, TypeScript, Supabase (service role + session client), Tailwind + inline styles.

---

## Fichiers

| Fichier | Action |
|---------|--------|
| `app/api/reactions/route.ts` | Créer — GET + POST |
| `app/api/reactions/[item_id]/route.ts` | Créer — DELETE |
| `app/(app)/users/[id]/page.tsx` | Modifier — emoji interactif sous posters "Derniers ajouts" |
| `components/home/RecentScroll.tsx` | Modifier — réactions amis en lecture seule |

---

### Task 1 : Table Supabase + API POST + DELETE

**Files:**
- Create: `app/api/reactions/route.ts`
- Create: `app/api/reactions/[item_id]/route.ts`

- [ ] **Step 1 : Créer la table reactions sur Supabase**

Exécuter dans Supabase SQL Editor :

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

- [ ] **Step 2 : Créer `app/api/reactions/route.ts` avec POST**

```ts
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getAuthUser } from '@/lib/auth'

const VALID_EMOJIS = ['🔥', '👀', '✅', '😴']

export async function POST(req: NextRequest) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { item_id, emoji } = await req.json()
  if (!item_id || !VALID_EMOJIS.includes(emoji)) {
    return NextResponse.json({ error: 'Invalid' }, { status: 400 })
  }

  const supabase = createServerClient()
  const { error } = await supabase
    .from('reactions')
    .upsert({ item_id, from_user_id: user.id, emoji }, { onConflict: 'item_id,from_user_id' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 3 : Créer `app/api/reactions/[item_id]/route.ts` avec DELETE**

```ts
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getAuthUser } from '@/lib/auth'

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ item_id: string }> }
) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { item_id } = await params
  const supabase = createServerClient()

  await supabase
    .from('reactions')
    .delete()
    .eq('item_id', item_id)
    .eq('from_user_id', user.id)

  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 4 : Commit**

```bash
git add app/api/reactions/route.ts "app/api/reactions/[item_id]/route.ts"
git commit -m "feat(api): add POST and DELETE reactions endpoints"
```

---

### Task 2 : GET /api/reactions

**Files:**
- Modify: `app/api/reactions/route.ts`

- [ ] **Step 1 : Ajouter le handler GET dans `app/api/reactions/route.ts`**

Ajouter après le handler POST :

```ts
export async function GET(req: NextRequest) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const itemIds = new URL(req.url).searchParams
    .get('item_ids')?.split(',').filter(Boolean) ?? []
  if (itemIds.length === 0) return NextResponse.json({})

  const supabase = createServerClient()

  // Récupérer les amis acceptés
  const { data: friendships } = await supabase
    .from('friendships')
    .select('requester_id, addressee_id')
    .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
    .eq('status', 'accepted')

  const friendIds = (friendships ?? []).map(f =>
    f.requester_id === user.id ? f.addressee_id : f.requester_id
  )
  const allowedIds = [user.id, ...friendIds]

  // Réactions filtrées aux amis + soi
  const { data: reactions } = await supabase
    .from('reactions')
    .select('item_id, from_user_id, emoji')
    .in('item_id', itemIds)
    .in('from_user_id', allowedIds)

  // Profils pour les display_name
  const { data: profiles } = allowedIds.length > 0
    ? await supabase.from('profiles').select('id, display_name').in('id', allowedIds)
    : { data: [] }

  const profileMap = Object.fromEntries((profiles ?? []).map(p => [p.id, p.display_name]))

  // Grouper par item_id
  const result: Record<string, { from_user_id: string; emoji: string; display_name: string; is_mine: boolean }[]> = {}
  for (const id of itemIds) result[id] = []
  for (const r of reactions ?? []) {
    result[r.item_id]?.push({
      from_user_id: r.from_user_id,
      emoji: r.emoji,
      display_name: profileMap[r.from_user_id] ?? '?',
      is_mine: r.from_user_id === user.id,
    })
  }

  return NextResponse.json(result)
}
```

- [ ] **Step 2 : Commit**

```bash
git add app/api/reactions/route.ts
git commit -m "feat(api): add GET reactions endpoint filtered to friends"
```

---

### Task 3 : Emoji interactif sur le profil ami

**Files:**
- Modify: `app/(app)/users/[id]/page.tsx`

Le fichier actuel est un composant client qui affiche `data.recent` (5 items) dans un scroll horizontal. On ajoute un état `reactions`, un fetch au montage (quand `data` est chargé), et une fonction `handleReact`.

- [ ] **Step 1 : Ajouter les imports et types nécessaires**

En haut du fichier, ajouter `useState` s'il n'est pas déjà importé (il l'est) et ajouter le type local :

```ts
type ReactionEntry = { from_user_id: string; emoji: string; display_name: string; is_mine: boolean }
type ReactionsMap = Record<string, ReactionEntry[]>
```

- [ ] **Step 2 : Ajouter l'état et le fetch reactions**

Dans le composant, après les états existants (`data`, `error`), ajouter :

```ts
const [reactions, setReactions] = useState<ReactionsMap>({})

useEffect(() => {
  if (!data) return
  const ids = data.recent.map(i => i.id).join(',')
  if (!ids) return
  fetch(`/api/reactions?item_ids=${ids}`)
    .then(r => r.json())
    .then(setReactions)
}, [data])
```

- [ ] **Step 3 : Ajouter la fonction handleReact**

```ts
async function handleReact(itemId: string, emoji: string) {
  const current = (reactions[itemId] ?? []).find(r => r.is_mine)
  const isSame = current?.emoji === emoji

  // Mise à jour optimiste
  setReactions(prev => {
    const updated = (prev[itemId] ?? []).filter(r => !r.is_mine)
    if (!isSame) updated.push({ from_user_id: '', emoji, display_name: 'Moi', is_mine: true })
    return { ...prev, [itemId]: updated }
  })

  if (isSame) {
    await fetch(`/api/reactions/${itemId}`, { method: 'DELETE' })
  } else {
    await fetch('/api/reactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ item_id: itemId, emoji }),
    })
  }
}
```

- [ ] **Step 4 : Ajouter les emojis sous chaque poster dans "Derniers ajouts"**

Trouver le bloc qui rend les items dans "Derniers ajouts" :

```tsx
{recent.map(item => (
  <div key={item.id} className="flex-shrink-0" style={{ width: 90 }}>
    {item.poster_url
      ? <img src={item.poster_url} className="rounded-xl object-cover" style={{ width: 90, height: 130 }} alt={item.title} />
      : <div className="rounded-xl" style={{ width: 90, height: 130, background: 'rgba(255,255,255,0.1)' }} />
    }
    <p className="text-xs mt-1 truncate" style={{ color: 'rgba(255,255,255,0.7)' }}>{item.title}</p>
  </div>
))}
```

Remplacer par :

```tsx
{recent.map(item => (
  <div key={item.id} className="flex-shrink-0" style={{ width: 90 }}>
    {item.poster_url
      ? <img src={item.poster_url} className="rounded-xl object-cover" style={{ width: 90, height: 130 }} alt={item.title} />
      : <div className="rounded-xl" style={{ width: 90, height: 130, background: 'rgba(255,255,255,0.1)' }} />
    }
    <p className="text-xs mt-1 truncate" style={{ color: 'rgba(255,255,255,0.7)' }}>{item.title}</p>
    <div className="flex gap-0.5 mt-1 justify-center">
      {['🔥', '👀', '✅', '😴'].map(e => {
        const isActive = (reactions[item.id] ?? []).some(r => r.is_mine && r.emoji === e)
        return (
          <button
            key={e}
            onClick={() => handleReact(item.id, e)}
            className="text-sm rounded-md px-0.5"
            style={{ background: isActive ? 'rgba(255,255,255,0.15)' : 'transparent' }}
          >
            {e}
          </button>
        )
      })}
    </div>
  </div>
))}
```

- [ ] **Step 5 : Commit**

```bash
git add "app/(app)/users/[id]/page.tsx"
git commit -m "feat(ui): add interactive emoji reactions to friend profile recent items"
```

---

### Task 4 : Réactions amis en lecture seule sur la home

**Files:**
- Modify: `components/home/RecentScroll.tsx`

Le composant reçoit `items: MediaItem[]` et est déjà `'use client'`. On ajoute un fetch des réactions au montage et on affiche les réactions des amis (non les miennes) sous chaque poster.

- [ ] **Step 1 : Ajouter l'import useState et useEffect**

```ts
'use client'
import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { motion } from 'framer-motion'
import type { MediaItem } from '@/lib/types'
```

- [ ] **Step 2 : Ajouter le type et l'état reactions**

Dans le composant, avant le return :

```ts
type FriendReaction = { emoji: string; display_name: string }

const [reactions, setReactions] = useState<Record<string, FriendReaction[]>>({})

useEffect(() => {
  const ids = items.map(i => i.id).join(',')
  if (!ids) return
  fetch(`/api/reactions?item_ids=${ids}`)
    .then(r => r.json())
    .then((data: Record<string, { emoji: string; display_name: string; is_mine: boolean }[]>) => {
      const filtered: Record<string, FriendReaction[]> = {}
      for (const [id, rs] of Object.entries(data)) {
        filtered[id] = rs.filter(r => !r.is_mine)
      }
      setReactions(filtered)
    })
}, [items])
```

- [ ] **Step 3 : Afficher les réactions sous chaque poster**

Trouver le bloc `<motion.div>` et ajouter sous le `</Link>` :

```tsx
{(reactions[item.id] ?? []).length > 0 && (
  <div className="flex flex-wrap gap-x-2 gap-y-0.5 mt-1" style={{ width: 112 }}>
    {(reactions[item.id] ?? []).map((r, i) => (
      <span key={i} className="text-xs" style={{ color: 'rgba(255,255,255,0.6)' }}>
        {r.emoji} {r.display_name.split(' ')[0]}
      </span>
    ))}
  </div>
)}
```

- [ ] **Step 4 : Commit et push**

```bash
git add components/home/RecentScroll.tsx
git commit -m "feat(ui): show friend reactions on home recent scroll"
git push
```

---

## Test manuel post-déploiement

1. Toi et ton pote êtes amis (friendship acceptée)
2. Va sur le profil de ton pote `/users/[id]`
3. Clique 🔥 sous un de ses films → s'active (fond clair)
4. Reclique 🔥 → se désactive
5. Clique 👀 → remplace 🔥
6. Ton pote va sur sa home → voit "🔥 [ton prénom]" sous le film
