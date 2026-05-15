# Share + Notifications Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow users to share a media item from `/media/[id]` to a friend, who receives an in-app notification visible on next login, with a bell icon badge in the nav.

**Architecture:** Generic `notifications` table in Supabase stores typed payloads (snapshotted at share time). Three new API routes handle CRUD. A client `ShareButton` component handles the modal UI on the detail page. `ProfileAvatar` gains a bell icon with unread badge. A new `/notifications` page lists all notifications.

**Tech Stack:** Next.js App Router, React 19, Supabase (PostgreSQL + RLS), TypeScript, Framer Motion, Tailwind 4, lucide-react

---

## File Map

| Action | File |
|--------|------|
| Modify | `lib/types.ts` |
| Create | `app/api/notifications/route.ts` |
| Create | `app/api/notifications/[id]/route.ts` |
| Create | `components/detail/ShareButton.tsx` |
| Modify | `app/(app)/media/[id]/page.tsx` |
| Modify | `components/nav/ProfileAvatar.tsx` |
| Create | `app/(app)/notifications/page.tsx` |

---

## Task 1: Create notifications table in Supabase

**Files:** SQL to run in Supabase Dashboard → SQL Editor

- [ ] **Step 1: Run the following SQL in Supabase Dashboard → SQL Editor**

```sql
create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null,
  payload jsonb not null default '{}',
  read boolean not null default false,
  created_at timestamptz not null default now()
);

alter table notifications enable row level security;

create policy "Users read own notifications"
  on notifications for select
  using (auth.uid() = user_id);

create policy "Users update own notifications"
  on notifications for update
  using (auth.uid() = user_id);

create policy "Authenticated users insert notifications"
  on notifications for insert
  with check (auth.uid() is not null);
```

- [ ] **Step 2: Verify table exists**

In Supabase Dashboard → Table Editor, confirm `notifications` appears with columns: `id`, `user_id`, `type`, `payload`, `read`, `created_at`.

---

## Task 2: Add AppNotification types

**Files:**
- Modify: `lib/types.ts`

- [ ] **Step 1: Add types at the end of `lib/types.ts`**

```typescript
export interface NotificationSharePayload {
  sender_id: string
  sender_name: string
  media_title: string
  media_type: MediaType
  poster_url: string | null
  rating: number | null
  message: string | null
}

export interface AppNotification {
  id: string
  user_id: string
  type: 'share'
  payload: NotificationSharePayload
  read: boolean
  created_at: string
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/types.ts
git commit -m "feat(types): add AppNotification and NotificationSharePayload"
```

---

## Task 3: Create GET + POST /api/notifications

**Files:**
- Create: `app/api/notifications/route.ts`

- [ ] **Step 1: Create the file**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getAuthUser } from '@/lib/auth'

export async function GET() {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createServerClient()
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const unread_count = (data ?? []).filter(n => !n.read).length
  return NextResponse.json({ notifications: data ?? [], unread_count })
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { recipient_id, media_item_id, message } = await req.json()

  if (!recipient_id || !media_item_id) {
    return NextResponse.json({ error: 'recipient_id et media_item_id sont requis' }, { status: 400 })
  }

  const supabase = createServerClient()

  // Verify friendship (accepted, in either direction)
  const { data: friendship } = await supabase
    .from('friendships')
    .select('id')
    .or(
      `and(requester_id.eq.${user.id},addressee_id.eq.${recipient_id}),` +
      `and(requester_id.eq.${recipient_id},addressee_id.eq.${user.id})`
    )
    .eq('status', 'accepted')
    .maybeSingle()

  if (!friendship) {
    return NextResponse.json({ error: 'Vous devez être amis pour partager' }, { status: 403 })
  }

  // Fetch media item (must belong to sender)
  const { data: item } = await supabase
    .from('media_items')
    .select('id, title, type, poster_url, rating, ratings_json')
    .eq('id', media_item_id)
    .eq('user_id', user.id)
    .single()

  if (!item) return NextResponse.json({ error: 'Média introuvable' }, { status: 404 })

  // Fetch sender display name
  const { data: senderProfile } = await supabase
    .from('profiles')
    .select('display_name')
    .eq('id', user.id)
    .single()

  // Compute average rating
  let rating: number | null = null
  if (item.ratings_json) {
    const vals = Object.values(item.ratings_json as Record<string, { rating: number }>)
      .map(v => v.rating)
      .filter(r => r > 0)
    if (vals.length > 0) rating = vals.reduce((a, b) => a + b, 0) / vals.length
  } else if (item.rating) {
    rating = item.rating
  }

  const payload = {
    sender_id: user.id,
    sender_name: senderProfile?.display_name ?? 'Un ami',
    media_title: item.title,
    media_type: item.type,
    poster_url: item.poster_url ?? null,
    rating,
    message: message ?? null,
  }

  const { data: notif, error } = await supabase
    .from('notifications')
    .insert({ user_id: recipient_id, type: 'share', payload })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(notif, { status: 201 })
}
```

- [ ] **Step 2: Verify the route compiles**

```bash
npx tsc --noEmit
```

Expected: no errors on this file.

- [ ] **Step 3: Commit**

```bash
git add app/api/notifications/route.ts
git commit -m "feat(api): GET + POST /api/notifications"
```

---

## Task 4: Create PATCH /api/notifications/[id]

**Files:**
- Create: `app/api/notifications/[id]/route.ts`

- [ ] **Step 1: Create the file**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getAuthUser } from '@/lib/auth'

export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const supabase = createServerClient()

  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 2: Commit**

```bash
git add "app/api/notifications/[id]/route.ts"
git commit -m "feat(api): PATCH /api/notifications/[id] — mark as read"
```

---

## Task 5: Create ShareButton component

**Files:**
- Create: `components/detail/ShareButton.tsx`

- [ ] **Step 1: Create the file**

```typescript
'use client'

import { useState } from 'react'
import { Share2, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import type { UserProfile } from '@/lib/types'

interface Props {
  mediaItemId: string
  mediaTitle: string
  mediaType: string
  posterUrl?: string
  rating?: number
}

export default function ShareButton({ mediaItemId, mediaTitle, mediaType, posterUrl, rating }: Props) {
  const [open, setOpen] = useState(false)
  const [friends, setFriends] = useState<UserProfile[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  async function openModal() {
    setOpen(true)
    setSent(false)
    setSelected(null)
    setMessage('')
    const res = await fetch('/api/friends')
    if (res.ok) {
      const json = await res.json()
      setFriends(
        (json.friends ?? [])
          .map((f: { profile?: UserProfile }) => f.profile)
          .filter(Boolean) as UserProfile[]
      )
    }
  }

  async function handleSend() {
    if (!selected) return
    setSending(true)
    await fetch('/api/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipient_id: selected,
        media_item_id: mediaItemId,
        message: message.trim() || undefined,
      }),
    })
    setSending(false)
    setSent(true)
    setTimeout(() => setOpen(false), 1200)
  }

  return (
    <>
      <button
        onClick={openModal}
        className="glass rounded-[12px] py-3 flex items-center justify-center gap-2 text-sm font-medium mb-4 w-full"
      >
        <Share2 size={16} />
        Partager à un ami
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-40"
              style={{ background: 'rgba(0,0,0,0.6)' }}
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="fixed bottom-0 left-0 right-0 z-50 glass rounded-t-[24px] p-6"
              style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 1.5rem)' }}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold">Partager</h2>
                <button onClick={() => setOpen(false)}>
                  <X size={20} style={{ color: 'rgba(255,255,255,0.5)' }} />
                </button>
              </div>

              {sent ? (
                <p className="text-center py-4 font-medium" style={{ color: '#4ADE80' }}>
                  Partagé !
                </p>
              ) : friends.length === 0 ? (
                <p className="text-sm text-center py-4" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  Ajoute des amis pour partager
                </p>
              ) : (
                <>
                  <div className="flex flex-col gap-2 mb-4 max-h-48 overflow-y-auto">
                    {friends.map(f => (
                      <button
                        key={f.id}
                        onClick={() => setSelected(f.id)}
                        className="flex items-center gap-3 px-4 py-3 rounded-2xl transition-colors text-left"
                        style={{
                          background: selected === f.id
                            ? 'rgba(124,58,237,0.3)'
                            : 'rgba(255,255,255,0.06)',
                          border: `1px solid ${selected === f.id ? 'var(--color-purple)' : 'rgba(255,255,255,0.1)'}`,
                        }}
                      >
                        {f.avatar_url ? (
                          <img
                            src={f.avatar_url}
                            className="rounded-full flex-shrink-0"
                            style={{ width: 32, height: 32 }}
                            alt=""
                          />
                        ) : (
                          <div
                            className="rounded-full flex-shrink-0"
                            style={{ width: 32, height: 32, background: 'rgba(255,255,255,0.15)' }}
                          />
                        )}
                        <span className="font-medium text-sm">{f.display_name}</span>
                      </button>
                    ))}
                  </div>

                  <input
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    placeholder="Ajouter un message... (optionnel)"
                    className="w-full glass rounded-2xl px-4 py-3 text-sm bg-transparent outline-none mb-4"
                    maxLength={200}
                  />

                  <button
                    onClick={handleSend}
                    disabled={!selected || sending}
                    className="w-full py-3 rounded-2xl font-semibold text-sm disabled:opacity-40"
                    style={{ background: 'var(--color-purple)', color: 'white' }}
                  >
                    {sending ? 'Envoi...' : 'Envoyer'}
                  </button>
                </>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
```

- [ ] **Step 2: Check TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/detail/ShareButton.tsx
git commit -m "feat(ui): ShareButton component with friend selector modal"
```

---

## Task 6: Add ShareButton to /media/[id]

**Files:**
- Modify: `app/(app)/media/[id]/page.tsx`

- [ ] **Step 1: Add import at top of file** (after existing imports)

```typescript
import ShareButton from '@/components/detail/ShareButton'
```

- [ ] **Step 2: Compute avgRating** — add after the `filledCriteria` const (line ~59)

```typescript
let avgRating: number | undefined
if (ratingsJson) {
  const vals = Object.values(ratingsJson).map(v => v.rating).filter(r => r > 0)
  if (vals.length > 0) avgRating = vals.reduce((a, b) => a + b, 0) / vals.length
} else if (item.rating) {
  avgRating = item.rating
}
```

- [ ] **Step 3: Add ShareButton in JSX** — add just before the `<DeleteButton>` line

```tsx
<ShareButton
  mediaItemId={item.id}
  mediaTitle={item.title}
  mediaType={item.type}
  posterUrl={item.poster_url}
  rating={avgRating}
/>
```

- [ ] **Step 4: Check TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add "app/(app)/media/[id]/page.tsx"
git commit -m "feat: add ShareButton to media detail page"
```

---

## Task 7: Update ProfileAvatar with bell icon

**Files:**
- Modify: `components/nav/ProfileAvatar.tsx`

- [ ] **Step 1: Replace the entire file content**

```typescript
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Bell } from 'lucide-react'
import { createClient } from '@/lib/supabase/browser'

export default function ProfileAvatar() {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [pendingCount, setPendingCount] = useState(0)
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    const supabase = createClient()

    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      setAvatarUrl(user.user_metadata?.avatar_url ?? null)

      const [friendsRes, notifsRes] = await Promise.all([
        fetch('/api/friends'),
        fetch('/api/notifications'),
      ])

      if (friendsRes.ok) {
        const json = await friendsRes.json()
        setPendingCount(json.pending?.length ?? 0)
      }

      if (notifsRes.ok) {
        const json = await notifsRes.json()
        setUnreadCount(json.unread_count ?? 0)
      }
    }

    load()
  }, [])

  return (
    <div className="fixed top-4 right-4 z-30 flex items-center gap-2">
      <Link
        href="/notifications"
        className="relative flex items-center justify-center"
        style={{ width: 36, height: 36 }}
      >
        <Bell size={20} style={{ color: 'rgba(255,255,255,0.7)' }} />
        {unreadCount > 0 && (
          <span
            className="absolute -top-1 -right-1 flex items-center justify-center rounded-full text-white font-bold"
            style={{ width: 16, height: 16, fontSize: 10, background: '#EF4444' }}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </Link>

      <Link href="/profile" style={{ width: 36, height: 36 }}>
        <div className="relative">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt="Profil"
              className="rounded-full object-cover"
              style={{ width: 36, height: 36 }}
            />
          ) : (
            <div
              className="rounded-full"
              style={{ width: 36, height: 36, background: 'rgba(255,255,255,0.15)' }}
            />
          )}
          {pendingCount > 0 && (
            <span
              className="absolute -top-1 -right-1 flex items-center justify-center rounded-full text-white font-bold"
              style={{ width: 16, height: 16, fontSize: 10, background: '#EF4444' }}
            >
              {pendingCount}
            </span>
          )}
        </div>
      </Link>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/nav/ProfileAvatar.tsx
git commit -m "feat(ui): add bell icon with unread badge to ProfileAvatar"
```

---

## Task 8: Create /notifications page

**Files:**
- Create: `app/(app)/notifications/page.tsx`

- [ ] **Step 1: Create the file**

```typescript
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import type { AppNotification } from '@/lib/types'
import Loader from '@/components/ui/Loader'

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "à l'instant"
  if (mins < 60) return `il y a ${mins}m`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `il y a ${hours}h`
  return `il y a ${Math.floor(hours / 24)}j`
}

export default function NotificationsPage() {
  const router = useRouter()
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/notifications')
      .then(r => r.json())
      .then(({ notifications }) => setNotifications(notifications ?? []))
      .finally(() => setLoading(false))
  }, [])

  async function handleTap(notif: AppNotification) {
    if (!notif.read) {
      await fetch(`/api/notifications/${notif.id}`, { method: 'PATCH' })
      setNotifications(prev =>
        prev.map(n => n.id === notif.id ? { ...n, read: true } : n)
      )
    }
    const query = new URLSearchParams({
      q: notif.payload.media_title,
      type: notif.payload.media_type,
    })
    router.push(`/add?${query}`)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center" style={{ minHeight: '60vh' }}>
        <Loader size={80} />
      </div>
    )
  }

  return (
    <div className="px-4 pt-16 pb-8 flex flex-col gap-3 max-w-lg mx-auto">
      <div className="flex items-center gap-3 pt-2 mb-2">
        <Link
          href="/"
          className="glass rounded-full flex items-center justify-center flex-shrink-0"
          style={{ width: 36, height: 36 }}
        >
          <ArrowLeft size={18} />
        </Link>
        <h1 className="text-2xl font-bold">Notifications</h1>
      </div>

      {notifications.length === 0 ? (
        <p
          className="text-sm text-center py-12"
          style={{ color: 'rgba(255,255,255,0.4)' }}
        >
          Aucune notification pour l&apos;instant
        </p>
      ) : (
        notifications.map(notif => (
          <button
            key={notif.id}
            onClick={() => handleTap(notif)}
            className="glass rounded-2xl px-4 py-3 flex items-center gap-3 text-left w-full"
            style={{
              background: notif.read ? undefined : 'rgba(124,58,237,0.12)',
              border: notif.read
                ? '1px solid rgba(255,255,255,0.08)'
                : '1px solid rgba(124,58,237,0.3)',
            }}
          >
            {notif.payload.poster_url && (
              <img
                src={notif.payload.poster_url}
                className="rounded-lg object-cover flex-shrink-0"
                style={{ width: 44, height: 64 }}
                alt=""
              />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm leading-snug">
                <span className="font-semibold">{notif.payload.sender_name}</span>
                {' t\'a recommandé '}
                <span className="font-semibold">{notif.payload.media_title}</span>
                {notif.payload.rating != null && (
                  <span> · ⭐ {notif.payload.rating.toFixed(1)}</span>
                )}
              </p>
              {notif.payload.message && (
                <p
                  className="text-xs mt-1 italic"
                  style={{ color: 'rgba(255,255,255,0.5)' }}
                >
                  &ldquo;{notif.payload.message}&rdquo;
                </p>
              )}
              <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.3)' }}>
                {timeAgo(notif.created_at)}
              </p>
            </div>
            {!notif.read && (
              <div
                className="rounded-full flex-shrink-0"
                style={{ width: 8, height: 8, background: 'var(--color-purple)' }}
              />
            )}
          </button>
        ))
      )}
    </div>
  )
}
```

- [ ] **Step 2: Check TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add "app/(app)/notifications/page.tsx"
git commit -m "feat: /notifications page with share notifications list"
```

---

## Task 9: Final push

- [ ] **Step 1: Push all commits**

```bash
git push origin master
```

- [ ] **Step 2: Manual test checklist**

1. Ouvre un film dans ta bibliothèque → vérifie le bouton "Partager à un ami"
2. Appuie sur "Partager" → la modale s'ouvre avec la liste d'amis
3. Sélectionne un ami, ajoute un message optionnel → appuie "Envoyer" → "Partagé !"
4. Connecte-toi avec le compte de l'ami → vérifie le badge rouge sur la clochette
5. Tape la clochette → page `/notifications` avec la notif
6. Tape la notif → redirige vers `/add?q=<titre>&type=<type>` + notif marquée lue
7. Badge clochette disparaît après lecture
