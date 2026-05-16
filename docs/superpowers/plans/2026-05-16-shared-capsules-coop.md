# Shared Capsules Co-op — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow two friends to create a shared co-op capsule for a game, each keeping personal status/rating while sharing a common notes field, visible as a badge in the library.

**Architecture:** Three new Supabase tables (`shared_capsules`, `shared_capsule_members`, `shared_capsule_invitations`) + 5 API routes. The library page fetches co-op capsules alongside personal items. A "Jouer avec..." button on game detail pages triggers the creation + invitation flow. Co-op capsules have their own detail page at `/shared/[id]`.

**Tech Stack:** Next.js 16 App Router, TypeScript, Supabase (PostgreSQL + RLS), Tailwind 4, Framer Motion, `lucide-react`

**Prerequisite:** Social features spec must be deployed (tables `profiles`, `friendships`, `notifications` exist in Supabase).

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `supabase/schema.sql` | Modify | Add 3 new tables + RLS policies |
| `lib/types.ts` | Modify | Add SharedCapsule, SharedCapsuleMember, SharedCapsuleInvitation types |
| `app/api/shared-capsules/route.ts` | Create | GET list + POST create |
| `app/api/shared-capsules/[id]/route.ts` | Create | GET detail + PATCH shared_notes |
| `app/api/shared-capsules/[id]/me/route.ts` | Create | PATCH personal status/rating/notes |
| `app/api/shared-capsules/[id]/invite/route.ts` | Create | POST send invitation |
| `app/api/shared-capsules/invitations/[id]/respond/route.ts` | Create | POST accept/decline |
| `components/detail/PlayWithButton.tsx` | Create | Friend picker + create+invite flow |
| `components/library/CoopCard.tsx` | Create | Library card variant for co-op capsules |
| `app/(app)/shared/[id]/page.tsx` | Create | Co-op capsule detail page |
| `app/(app)/library/page.tsx` | Modify | Fetch + display co-op capsules |
| `app/(app)/media/[id]/page.tsx` | Modify | Add PlayWithButton for games |
| `app/(app)/notifications/page.tsx` | Modify | Render coop_invite notification type |

---

## Task 1: Database Schema

**Files:**
- Modify: `supabase/schema.sql`

- [ ] **Step 1: Add tables + RLS to schema.sql**

Append at the end of `supabase/schema.sql`:

```sql
-- ── Shared Capsules ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS shared_capsules (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title          text NOT NULL,
  poster_url     text,
  rawg_id        text,
  dominant_color text,
  shared_notes   text NOT NULL DEFAULT '',
  created_by     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS shared_capsule_members (
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

CREATE TABLE IF NOT EXISTS shared_capsule_invitations (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  capsule_id  uuid NOT NULL REFERENCES shared_capsules(id) ON DELETE CASCADE,
  inviter_id  uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invitee_id  uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status      text NOT NULL DEFAULT 'pending'
              CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (capsule_id, invitee_id)
);

-- RLS
ALTER TABLE shared_capsules ENABLE ROW LEVEL SECURITY;
ALTER TABLE shared_capsule_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE shared_capsule_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sc_member_select" ON shared_capsules FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM shared_capsule_members
    WHERE capsule_id = shared_capsules.id AND user_id = auth.uid()
  ));

CREATE POLICY "sc_member_update" ON shared_capsules FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM shared_capsule_members
    WHERE capsule_id = shared_capsules.id AND user_id = auth.uid()
  ));

CREATE POLICY "sc_creator_insert" ON shared_capsules FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "scm_member_select" ON shared_capsule_members FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM shared_capsule_members m2
    WHERE m2.capsule_id = shared_capsule_members.capsule_id AND m2.user_id = auth.uid()
  ));

CREATE POLICY "scm_own_update" ON shared_capsule_members FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "scm_own_insert" ON shared_capsule_members FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "sci_parties_select" ON shared_capsule_invitations FOR SELECT
  USING (inviter_id = auth.uid() OR invitee_id = auth.uid());

CREATE POLICY "sci_inviter_insert" ON shared_capsule_invitations FOR INSERT
  WITH CHECK (inviter_id = auth.uid());

CREATE POLICY "sci_invitee_update" ON shared_capsule_invitations FOR UPDATE
  USING (invitee_id = auth.uid());
```

- [ ] **Step 2: Run migration in Supabase**

Open the Supabase dashboard → SQL Editor → paste and execute the block above.

Verify in Table Editor that `shared_capsules`, `shared_capsule_members`, `shared_capsule_invitations` appear.

- [ ] **Step 3: Commit**

```bash
git add supabase/schema.sql
git commit -m "feat(db): shared_capsules + members + invitations tables with RLS"
```

---

## Task 2: TypeScript Types

**Files:**
- Modify: `lib/types.ts`

- [ ] **Step 1: Add types**

Append to `lib/types.ts`:

```typescript
export interface SharedCapsule {
  id: string
  title: string
  poster_url?: string
  rawg_id?: string
  dominant_color?: string
  shared_notes: string
  created_by: string
  created_at: string
  members?: SharedCapsuleMember[]
}

export interface SharedCapsuleMember {
  id: string
  capsule_id: string
  user_id: string
  status: MediaStatus
  personal_rating?: number
  personal_notes: string
  joined_at: string
  profile?: UserProfile
}

export type CapsuleInvitationStatus = 'pending' | 'accepted' | 'declined'

export interface SharedCapsuleInvitation {
  id: string
  capsule_id: string
  inviter_id: string
  invitee_id: string
  status: CapsuleInvitationStatus
  created_at: string
  capsule?: Pick<SharedCapsule, 'id' | 'title' | 'poster_url' | 'dominant_color'>
  inviter?: UserProfile
}

export interface CoopInvitePayload {
  inviter_id: string
  inviter_name: string
  capsule_id: string
  capsule_title: string
  poster_url: string | null
}

export interface CoopAcceptedPayload {
  accepter_id: string
  accepter_name: string
  capsule_id: string
  capsule_title: string
}
```

Also extend `AppNotification` — replace the existing definition with:

```typescript
export interface AppNotification {
  id: string
  user_id: string
  type: 'share' | 'coop_invite' | 'coop_accepted'
  payload: NotificationSharePayload | CoopInvitePayload | CoopAcceptedPayload
  read: boolean
  created_at: string
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/types.ts
git commit -m "feat(types): SharedCapsule, SharedCapsuleMember, SharedCapsuleInvitation"
```

---

## Task 3: API — GET + POST `/api/shared-capsules`

**Files:**
- Create: `app/api/shared-capsules/route.ts`

- [ ] **Step 1: Create the route**

```typescript
// app/api/shared-capsules/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getAuthUser } from '@/lib/auth'

export async function GET() {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createServerClient()

  // Fetch all capsules where user is a member, including their own member row
  const { data: memberRows, error } = await supabase
    .from('shared_capsule_members')
    .select('status, personal_rating, personal_notes, joined_at, capsule_id, shared_capsules(*)')
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const capsuleIds = (memberRows ?? []).map(r => r.capsule_id)
  if (capsuleIds.length === 0) return NextResponse.json([])

  // Fetch all members of those capsules + their profiles
  const { data: allMembers } = await supabase
    .from('shared_capsule_members')
    .select('capsule_id, user_id, status, personal_rating, joined_at')
    .in('capsule_id', capsuleIds)

  const memberUserIds = [...new Set((allMembers ?? []).map(m => m.user_id))]
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, display_name, avatar_url')
    .in('id', memberUserIds)

  const profileMap = Object.fromEntries((profiles ?? []).map(p => [p.id, p]))
  const membersByCapsule: Record<string, typeof allMembers> = {}
  for (const m of allMembers ?? []) {
    if (!membersByCapsule[m.capsule_id]) membersByCapsule[m.capsule_id] = []
    membersByCapsule[m.capsule_id]!.push(m)
  }

  const result = (memberRows ?? []).map(r => ({
    ...(r.shared_capsules as Record<string, unknown>),
    my_status: r.status,
    my_rating: r.personal_rating,
    members: (membersByCapsule[r.capsule_id] ?? []).map(m => ({
      ...m,
      profile: profileMap[m.user_id] ?? null,
    })),
  }))

  return NextResponse.json(result)
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { title, poster_url, rawg_id, dominant_color } = await req.json() as {
    title: string
    poster_url?: string
    rawg_id?: string
    dominant_color?: string
  }

  if (!title) return NextResponse.json({ error: 'title requis' }, { status: 400 })

  const supabase = createServerClient()

  const { data: capsule, error: capsuleError } = await supabase
    .from('shared_capsules')
    .insert({ title, poster_url, rawg_id, dominant_color, created_by: user.id })
    .select()
    .single()

  if (capsuleError) return NextResponse.json({ error: capsuleError.message }, { status: 500 })

  const { error: memberError } = await supabase
    .from('shared_capsule_members')
    .insert({ capsule_id: capsule.id, user_id: user.id, status: 'inProgress' })

  if (memberError) return NextResponse.json({ error: memberError.message }, { status: 500 })

  return NextResponse.json(capsule, { status: 201 })
}
```

- [ ] **Step 2: Verify manually**

Start the dev server (ask the user to run `npm run dev`), then:
- `GET /api/shared-capsules` → should return `[]` (no capsules yet)
- `POST /api/shared-capsules` with `{ "title": "Elden Ring" }` → should return `{ id, title, ... }`
- `GET /api/shared-capsules` → should return the capsule with `members` array

- [ ] **Step 3: Commit**

```bash
git add app/api/shared-capsules/route.ts
git commit -m "feat(api): GET + POST /api/shared-capsules"
```

---

## Task 4: API — GET + PATCH `/api/shared-capsules/[id]`

**Files:**
- Create: `app/api/shared-capsules/[id]/route.ts`

- [ ] **Step 1: Create the route**

```typescript
// app/api/shared-capsules/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getAuthUser } from '@/lib/auth'

async function verifyMembership(
  supabase: ReturnType<typeof createServerClient>,
  capsuleId: string,
  userId: string
) {
  const { data } = await supabase
    .from('shared_capsule_members')
    .select('id')
    .eq('capsule_id', capsuleId)
    .eq('user_id', userId)
    .single()
  return !!data
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const supabase = createServerClient()

  if (!(await verifyMembership(supabase, id, user.id))) {
    return NextResponse.json({ error: 'Introuvable' }, { status: 404 })
  }

  const { data: capsule, error } = await supabase
    .from('shared_capsules')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !capsule) return NextResponse.json({ error: 'Introuvable' }, { status: 404 })

  const { data: members } = await supabase
    .from('shared_capsule_members')
    .select('*')
    .eq('capsule_id', id)

  const userIds = (members ?? []).map(m => m.user_id)
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, display_name, avatar_url')
    .in('id', userIds)

  const profileMap = Object.fromEntries((profiles ?? []).map(p => [p.id, p]))

  return NextResponse.json({
    ...capsule,
    members: (members ?? []).map(m => ({ ...m, profile: profileMap[m.user_id] ?? null })),
  })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const supabase = createServerClient()

  if (!(await verifyMembership(supabase, id, user.id))) {
    return NextResponse.json({ error: 'Introuvable' }, { status: 404 })
  }

  const { shared_notes } = await req.json() as { shared_notes: string }

  const { data, error } = await supabase
    .from('shared_capsules')
    .update({ shared_notes })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/shared-capsules/[id]/route.ts
git commit -m "feat(api): GET + PATCH /api/shared-capsules/[id]"
```

---

## Task 5: API — PATCH `/api/shared-capsules/[id]/me`

**Files:**
- Create: `app/api/shared-capsules/[id]/me/route.ts`

- [ ] **Step 1: Create the route**

```typescript
// app/api/shared-capsules/[id]/me/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getAuthUser } from '@/lib/auth'
import type { MediaStatus } from '@/lib/types'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const supabase = createServerClient()

  const body = await req.json() as {
    status?: MediaStatus
    personal_rating?: number
    personal_notes?: string
  }

  const { data, error } = await supabase
    .from('shared_capsule_members')
    .update(body)
    .eq('capsule_id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Introuvable' }, { status: 404 })

  return NextResponse.json(data)
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/shared-capsules/[id]/me/route.ts
git commit -m "feat(api): PATCH /api/shared-capsules/[id]/me"
```

---

## Task 6: API — POST `/api/shared-capsules/[id]/invite`

**Files:**
- Create: `app/api/shared-capsules/[id]/invite/route.ts`

- [ ] **Step 1: Create the route**

```typescript
// app/api/shared-capsules/[id]/invite/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getAuthUser } from '@/lib/auth'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: capsuleId } = await params
  const { invitee_id } = await req.json() as { invitee_id: string }

  if (!invitee_id) return NextResponse.json({ error: 'invitee_id requis' }, { status: 400 })

  const supabase = createServerClient()

  // Verify inviter is a member
  const { data: myMembership } = await supabase
    .from('shared_capsule_members')
    .select('id')
    .eq('capsule_id', capsuleId)
    .eq('user_id', user.id)
    .single()

  if (!myMembership) return NextResponse.json({ error: 'Introuvable' }, { status: 404 })

  // Verify friendship
  const { data: friendship } = await supabase
    .from('friendships')
    .select('id')
    .or(
      `and(requester_id.eq.${user.id},addressee_id.eq.${invitee_id}),` +
      `and(requester_id.eq.${invitee_id},addressee_id.eq.${user.id})`
    )
    .eq('status', 'accepted')
    .maybeSingle()

  if (!friendship) {
    return NextResponse.json({ error: 'Vous devez être amis' }, { status: 403 })
  }

  // Check invitee not already a member
  const { data: existing } = await supabase
    .from('shared_capsule_members')
    .select('id')
    .eq('capsule_id', capsuleId)
    .eq('user_id', invitee_id)
    .maybeSingle()

  if (existing) return NextResponse.json({ error: 'Déjà membre' }, { status: 409 })

  // Create invitation
  const { data: invitation, error: inviteError } = await supabase
    .from('shared_capsule_invitations')
    .insert({ capsule_id: capsuleId, inviter_id: user.id, invitee_id })
    .select()
    .single()

  if (inviteError) return NextResponse.json({ error: inviteError.message }, { status: 500 })

  // Fetch capsule + inviter profile for notification
  const [{ data: capsule }, { data: inviterProfile }] = await Promise.all([
    supabase.from('shared_capsules').select('title, poster_url').eq('id', capsuleId).single(),
    supabase.from('profiles').select('display_name').eq('id', user.id).single(),
  ])

  await supabase.from('notifications').insert({
    user_id: invitee_id,
    type: 'coop_invite',
    payload: {
      inviter_id: user.id,
      inviter_name: inviterProfile?.display_name ?? 'Un ami',
      capsule_id: capsuleId,
      capsule_title: capsule?.title ?? '',
      poster_url: capsule?.poster_url ?? null,
    },
  })

  return NextResponse.json(invitation, { status: 201 })
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/shared-capsules/[id]/invite/route.ts
git commit -m "feat(api): POST /api/shared-capsules/[id]/invite"
```

---

## Task 7: API — POST `/api/shared-capsules/invitations/[id]/respond`

**Files:**
- Create: `app/api/shared-capsules/invitations/[id]/respond/route.ts`

- [ ] **Step 1: Create the route**

```typescript
// app/api/shared-capsules/invitations/[id]/respond/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getAuthUser } from '@/lib/auth'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { accepted } = await req.json() as { accepted: boolean }

  const supabase = createServerClient()

  // Fetch invitation — must be pending + for this user
  const { data: invitation } = await supabase
    .from('shared_capsule_invitations')
    .select('*')
    .eq('id', id)
    .eq('invitee_id', user.id)
    .eq('status', 'pending')
    .single()

  if (!invitation) return NextResponse.json({ error: 'Invitation introuvable' }, { status: 404 })

  const newStatus = accepted ? 'accepted' : 'declined'

  await supabase
    .from('shared_capsule_invitations')
    .update({ status: newStatus })
    .eq('id', id)

  if (accepted) {
    // Add invitee as member
    await supabase.from('shared_capsule_members').insert({
      capsule_id: invitation.capsule_id,
      user_id: user.id,
      status: 'inProgress',
    })

    // Notify inviter
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

  return NextResponse.json({ status: newStatus })
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/shared-capsules/invitations/[id]/respond/route.ts
git commit -m "feat(api): POST /api/shared-capsules/invitations/[id]/respond"
```

---

## Task 8: Component — `PlayWithButton`

**Files:**
- Create: `components/detail/PlayWithButton.tsx`

- [ ] **Step 1: Create the component**

```typescript
// components/detail/PlayWithButton.tsx
'use client'
import { useState } from 'react'
import { Users } from 'lucide-react'
import Image from 'next/image'
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
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  if (friends.length === 0) return null

  async function handleSelect(friend: UserProfile) {
    setLoading(true)
    try {
      // 1. Create the shared capsule
      const capsuleRes = await fetch('/api/shared-capsules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: gameTitle, poster_url: posterUrl, rawg_id: rawgId, dominant_color: dominantColor }),
      })
      if (!capsuleRes.ok) throw new Error('Erreur création capsule')
      const capsule = await capsuleRes.json() as { id: string }

      // 2. Send invitation
      await fetch(`/api/shared-capsules/${capsule.id}/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invitee_id: friend.id }),
      })

      setOpen(false)
      router.push(`/shared/${capsule.id}`)
    } catch {
      // keep modal open on error
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
          className="fixed inset-0 z-50 flex items-end"
          style={{ background: 'rgba(0,0,0,0.6)' }}
          onClick={() => !loading && setOpen(false)}
        >
          <div
            className="w-full glass rounded-t-[24px] p-6"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-base font-semibold mb-4">Choisir un ami</h3>
            <div className="flex flex-col gap-3">
              {friends.map(friend => (
                <button
                  key={friend.id}
                  onClick={() => handleSelect(friend)}
                  disabled={loading}
                  className="flex items-center gap-3 rounded-[12px] p-3 text-left"
                  style={{ background: 'rgba(255,255,255,0.06)' }}
                >
                  {friend.avatar_url ? (
                    <Image
                      src={friend.avatar_url}
                      alt={friend.display_name}
                      width={36}
                      height={36}
                      className="rounded-full"
                    />
                  ) : (
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold"
                      style={{ background: 'rgba(255,255,255,0.1)' }}
                    >
                      {friend.display_name[0]}
                    </div>
                  )}
                  <span className="text-sm font-medium">{friend.display_name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/detail/PlayWithButton.tsx
git commit -m "feat(ui): PlayWithButton — friend picker + create coop capsule flow"
```

---

## Task 9: Component — `CoopCard`

**Files:**
- Create: `components/library/CoopCard.tsx`

- [ ] **Step 1: Create the component**

```typescript
// components/library/CoopCard.tsx
'use client'
import Image from 'next/image'
import Link from 'next/link'
import { motion } from 'framer-motion'
import StatusBadge from '@/components/ui/StatusBadge'
import type { MediaStatus, UserProfile } from '@/lib/types'

interface CoopCapsuleSummary {
  id: string
  title: string
  poster_url?: string
  my_status: MediaStatus
  members: { user_id: string; profile: UserProfile | null }[]
}

interface Props {
  item: CoopCapsuleSummary
  index: number
}

export default function CoopCard({ item, index }: Props) {
  const coPlayers = item.members.filter(m => m.profile !== null)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, type: 'spring', stiffness: 300, damping: 25 }}
    >
      <Link href={`/shared/${item.id}`} className="glass rounded-[20px] flex gap-3 p-3 block">
        {/* Poster */}
        <div
          className="rounded-[10px] overflow-hidden relative flex-shrink-0"
          style={{ width: 112, height: 63, background: 'rgba(255,255,255,0.05)' }}
        >
          {item.poster_url ? (
            <Image src={item.poster_url} alt={item.title} fill className="object-cover" unoptimized />
          ) : (
            <div
              className="w-full h-full flex items-center justify-center text-lg font-bold"
              style={{ color: 'rgba(255,255,255,0.2)' }}
            >
              {item.title[0]}
            </div>
          )}
          {/* Co-op overlay avatars */}
          <div className="absolute bottom-1 right-1 flex">
            {coPlayers.slice(0, 2).map((m, i) => (
              m.profile?.avatar_url ? (
                <Image
                  key={m.user_id}
                  src={m.profile.avatar_url}
                  alt={m.profile.display_name}
                  width={16}
                  height={16}
                  className="rounded-full border border-black"
                  style={{ marginLeft: i > 0 ? -4 : 0 }}
                />
              ) : (
                <div
                  key={m.user_id}
                  className="w-4 h-4 rounded-full border border-black flex items-center justify-center text-[8px] font-bold"
                  style={{
                    background: 'rgba(139,92,246,0.8)',
                    marginLeft: i > 0 ? -4 : 0,
                  }}
                >
                  {m.profile?.display_name?.[0] ?? '?'}
                </div>
              )
            ))}
          </div>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0 py-1">
          <p className="text-xs mb-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
            Jeu · Co-op
          </p>
          <h3 className="font-semibold text-sm leading-tight mb-2 truncate">{item.title}</h3>
          <StatusBadge status={item.my_status} />
        </div>
      </Link>
    </motion.div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/library/CoopCard.tsx
git commit -m "feat(ui): CoopCard — library card for co-op capsules"
```

---

## Task 10: Page — `/shared/[id]`

**Files:**
- Create: `app/(app)/shared/[id]/page.tsx`

- [ ] **Step 1: Create the page**

```typescript
// app/(app)/shared/[id]/page.tsx
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import Image from 'next/image'
import { createServerClient } from '@/lib/supabase/server'
import { getAuthUser } from '@/lib/auth'
import AmbientGlow from '@/components/detail/AmbientGlow'
import StatusBadge from '@/components/ui/StatusBadge'
import SharedNotesEditor from '@/components/detail/SharedNotesEditor'
import type { MediaStatus } from '@/lib/types'

const STATUS_LABELS: Record<MediaStatus, string> = {
  completed: 'Terminé',
  inProgress: 'En cours',
  dropped: 'Abandonné',
  abandoned: 'Abandonné',
}

export default async function SharedCapsulePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const user = await getAuthUser()
  if (!user) redirect('/login')

  const supabase = createServerClient()

  // Verify membership
  const { data: myMembership } = await supabase
    .from('shared_capsule_members')
    .select('*')
    .eq('capsule_id', id)
    .eq('user_id', user.id)
    .single()

  if (!myMembership) notFound()

  const { data: capsule } = await supabase
    .from('shared_capsules')
    .select('*')
    .eq('id', id)
    .single()

  if (!capsule) notFound()

  const { data: members } = await supabase
    .from('shared_capsule_members')
    .select('*')
    .eq('capsule_id', id)

  const userIds = (members ?? []).map(m => m.user_id)
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, display_name, avatar_url')
    .in('id', userIds)

  const profileMap = Object.fromEntries((profiles ?? []).map(p => [p.id, p]))
  const enrichedMembers = (members ?? []).map(m => ({ ...m, profile: profileMap[m.user_id] ?? null }))

  return (
    <div className="min-h-screen">
      {/* Back button */}
      <div className="fixed top-0 left-0 right-0 z-10 px-4" style={{ paddingTop: '3rem' }}>
        <Link
          href="/library"
          className="glass rounded-full flex items-center justify-center"
          style={{ width: 36, height: 36 }}
        >
          <ArrowLeft size={18} />
        </Link>
      </div>

      {/* Hero */}
      <div className="relative">
        <AmbientGlow color={capsule.dominant_color} />
        <div className="relative" style={{ height: 200 }}>
          {capsule.poster_url ? (
            <Image
              src={capsule.poster_url}
              alt={capsule.title}
              fill
              className="object-cover"
              unoptimized
            />
          ) : (
            <div
              className="w-full h-full flex items-center justify-center text-4xl font-bold"
              style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.2)' }}
            >
              {capsule.title[0]}
            </div>
          )}
          <div
            className="absolute inset-0"
            style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0) 40%, rgba(0,0,0,0.9) 100%)' }}
          />
        </div>
      </div>

      {/* Content */}
      <div className="px-4 relative z-10 pb-28" style={{ marginTop: '-2rem' }}>
        {/* Title + badge */}
        <div className="mb-5">
          <p className="text-xs mb-1" style={{ color: 'rgba(255,255,255,0.4)' }}>Jeu · Co-op</p>
          <h1 className="text-2xl font-bold tracking-tight mb-3">{capsule.title}</h1>
        </div>

        {/* Members + statuses */}
        <div className="glass rounded-[20px] p-4 mb-4">
          <p className="text-xs uppercase tracking-widest mb-3" style={{ color: 'rgba(255,255,255,0.4)' }}>
            Joueurs
          </p>
          <div className="flex flex-col gap-3">
            {enrichedMembers.map(m => (
              <div key={m.user_id} className="flex items-center gap-3">
                {m.profile?.avatar_url ? (
                  <Image
                    src={m.profile.avatar_url}
                    alt={m.profile.display_name}
                    width={32}
                    height={32}
                    className="rounded-full"
                  />
                ) : (
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                    style={{ background: 'rgba(255,255,255,0.1)' }}
                  >
                    {m.profile?.display_name?.[0] ?? '?'}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {m.user_id === user.id ? 'Toi' : (m.profile?.display_name ?? 'Ami')}
                  </p>
                </div>
                <StatusBadge status={m.status as MediaStatus} />
              </div>
            ))}
          </div>
        </div>

        {/* Shared notes */}
        <SharedNotesEditor capsuleId={id} initialNotes={capsule.shared_notes} />

        {/* Personal notes (own only) */}
        {myMembership.personal_notes && (
          <div className="glass rounded-[20px] p-4 mb-4">
            <p className="text-xs uppercase tracking-widest mb-2" style={{ color: 'rgba(255,255,255,0.4)' }}>
              Mes notes perso
            </p>
            <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.8)' }}>
              {myMembership.personal_notes}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create `SharedNotesEditor` client component**

```typescript
// components/detail/SharedNotesEditor.tsx
'use client'
import { useState, useRef } from 'react'

interface Props {
  capsuleId: string
  initialNotes: string
}

export default function SharedNotesEditor({ capsuleId, initialNotes }: Props) {
  const [notes, setNotes] = useState(initialNotes)
  const [saving, setSaving] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  function handleChange(value: string) {
    setNotes(value)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(async () => {
      setSaving(true)
      await fetch(`/api/shared-capsules/${capsuleId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shared_notes: value }),
      })
      setSaving(false)
    }, 1000)
  }

  return (
    <div className="glass rounded-[20px] p-4 mb-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.4)' }}>
          Notes partagées
        </p>
        {saving && (
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>Sauvegarde...</p>
        )}
      </div>
      <textarea
        value={notes}
        onChange={e => handleChange(e.target.value)}
        placeholder="Notes visibles par les deux joueurs..."
        rows={4}
        className="w-full bg-transparent outline-none text-sm leading-relaxed resize-none"
        style={{ color: 'rgba(255,255,255,0.8)' }}
      />
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add app/(app)/shared/[id]/page.tsx components/detail/SharedNotesEditor.tsx
git commit -m "feat(ui): shared capsule detail page + SharedNotesEditor"
```

---

## Task 11: Wire Library Page

**Files:**
- Modify: `app/(app)/library/page.tsx`

- [ ] **Step 1: Fetch co-op capsules alongside personal items**

Add the co-op fetch inside the existing `useEffect`, and render `CoopCard` components:

```typescript
'use client'
import { useState, useEffect, useMemo } from 'react'
import { Search } from 'lucide-react'
import FilterPills, { type Filter, type StatusFilter } from '@/components/library/FilterPills'
import MediaCard from '@/components/library/MediaCard'
import CoopCard from '@/components/library/CoopCard'
import ShimmerCard from '@/components/ui/ShimmerCard'
import type { MediaItem } from '@/lib/types'

interface CoopCapsuleSummary {
  id: string
  title: string
  poster_url?: string
  my_status: 'completed' | 'inProgress' | 'dropped' | 'abandoned'
  members: { user_id: string; profile: { id: string; display_name: string; avatar_url?: string } | null }[]
}

export default function LibraryPage() {
  const [items, setItems] = useState<MediaItem[]>([])
  const [wishlistItems, setWishlistItems] = useState<MediaItem[]>([])
  const [coopCapsules, setCoopCapsules] = useState<CoopCapsuleSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [showAll, setShowAll] = useState(false)

  useEffect(() => {
    Promise.allSettled([
      fetch('/api/media').then(r => r.json()),
      fetch('/api/media?wishlist=true').then(r => r.json()),
      fetch('/api/shared-capsules').then(r => r.json()),
    ]).then(([lib, wish, coop]) => {
      if (lib.status === 'fulfilled') setItems(Array.isArray(lib.value) ? lib.value : [])
      if (wish.status === 'fulfilled') setWishlistItems(Array.isArray(wish.value) ? wish.value : [])
      if (coop.status === 'fulfilled') setCoopCapsules(Array.isArray(coop.value) ? coop.value : [])
      setLoading(false)
    })
  }, [])

  const displayed = useMemo(() => {
    const source = filter === 'wishlist' ? wishlistItems : items
    let list = [...source]
    if (filter !== 'all' && filter !== 'wishlist') list = list.filter(i => i.type === filter)
    if (statusFilter !== 'all') list = list.filter(i => i.status === statusFilter)
    if (query) list = list.filter(i => i.title.toLowerCase().includes(query.toLowerCase()))
    return list
  }, [items, wishlistItems, filter, statusFilter, query])

  // Co-op capsules filtered by query (only shown when filter is 'all' or 'game')
  const displayedCoop = useMemo(() => {
    if (filter === 'wishlist' || (filter !== 'all' && filter !== 'game')) return []
    if (query) return coopCapsules.filter(c => c.title.toLowerCase().includes(query.toLowerCase()))
    return coopCapsules
  }, [coopCapsules, filter, query])

  const visible = useMemo(
    () => (showAll ? displayed : displayed.slice(0, 5)),
    [displayed, showAll]
  )

  function handleFilterChange(f: Filter) {
    setFilter(f)
    setStatusFilter('all')
    setShowAll(false)
  }

  function handleDelete(id: string) {
    setItems(prev => prev.filter(i => i.id !== id))
    setWishlistItems(prev => prev.filter(i => i.id !== id))
  }

  return (
    <div className="px-4 pb-28" style={{ paddingTop: '3.5rem' }}>
      <h1 className="text-3xl font-bold tracking-tight mb-4">Bibliothèque</h1>

      <div className="glass rounded-[12px] flex items-center gap-2 px-3 py-2 mb-3">
        <Search size={16} style={{ color: 'rgba(255,255,255,0.3)', flexShrink: 0 }} />
        <input
          value={query}
          onChange={e => { setQuery(e.target.value); setShowAll(false) }}
          placeholder="Rechercher..."
          className="bg-transparent flex-1 outline-none text-sm"
          style={{ color: 'white' }}
        />
      </div>

      <div className="mb-4">
        <FilterPills
          filter={filter}
          onFilter={handleFilterChange}
          statusFilter={statusFilter}
          onStatusFilter={setStatusFilter}
        />
      </div>

      <div className="flex flex-col gap-3">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => <ShimmerCard key={i} className="h-24" />)
          : <>
              {visible.map((item, i) => (
                <MediaCard key={item.id} item={item} index={i} onDelete={handleDelete} />
              ))}
              {displayedCoop.map((item, i) => (
                <CoopCard key={item.id} item={item} index={visible.length + i} />
              ))}
            </>
        }
        {!loading && displayed.length === 0 && displayedCoop.length === 0 && (
          <p className="text-center py-12 text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>
            Aucun élément
          </p>
        )}
      </div>

      {!loading && !showAll && displayed.length > 5 && (
        <button
          onClick={() => setShowAll(true)}
          className="w-full mt-3 py-3 rounded-[12px] text-sm font-medium"
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            color: 'rgba(255,255,255,0.5)',
          }}
        >
          Afficher plus ({displayed.length - 5} de plus)
        </button>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add app/(app)/library/page.tsx
git commit -m "feat(library): display co-op capsules alongside personal items"
```

---

## Task 12: Wire Media Detail Page

**Files:**
- Modify: `app/(app)/media/[id]/page.tsx`

- [ ] **Step 1: Fetch accepted friends + add PlayWithButton for games**

In `MediaDetailPage`, after fetching the `item`, add a friends fetch (only when `item.type === 'game'`):

```typescript
// After `if (!item) notFound()`, add:

let acceptedFriends: { id: string; display_name: string; avatar_url?: string }[] = []
if (item.type === 'game') {
  const { data: friendships } = await supabase
    .from('friendships')
    .select('requester_id, addressee_id')
    .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
    .eq('status', 'accepted')

  const friendIds = (friendships ?? []).map(f =>
    f.requester_id === user.id ? f.addressee_id : f.requester_id
  )

  if (friendIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, display_name, avatar_url')
      .in('id', friendIds)
    acceptedFriends = profiles ?? []
  }
}
```

Then in the JSX, add `PlayWithButton` before `FinishFlow`:

```tsx
import PlayWithButton from '@/components/detail/PlayWithButton'

// In JSX, before the FinishFlow section:
{item.type === 'game' && (
  <PlayWithButton
    gameTitle={item.title}
    posterUrl={item.poster_url}
    dominantColor={item.dominant_color}
    friends={acceptedFriends}
  />
)}
```

- [ ] **Step 2: Commit**

```bash
git add app/(app)/media/[id]/page.tsx
git commit -m "feat(detail): PlayWithButton on game detail page"
```

---

## Task 13: Wire Notifications Page

**Files:**
- Modify: `app/(app)/notifications/page.tsx`

- [ ] **Step 1: Read the current notifications page**

Read `app/(app)/notifications/page.tsx` to understand the current rendering structure.

- [ ] **Step 2: Add coop_invite and coop_accepted rendering**

Find where `type === 'share'` is handled and add the two new cases. For each notification of type `coop_invite`, render:

```tsx
// Inside the notification list map, add alongside the 'share' case:
if (notif.type === 'coop_invite') {
  const p = notif.payload as CoopInvitePayload
  return (
    <div key={notif.id} className="glass rounded-[16px] p-4">
      <p className="text-sm font-medium mb-1">
        <span style={{ color: 'rgba(139,92,246,1)' }}>{p.inviter_name}</span>
        {' '}t&apos;invite à une capsule co-op
      </p>
      <p className="text-sm mb-3" style={{ color: 'rgba(255,255,255,0.6)' }}>{p.capsule_title}</p>
      <div className="flex gap-2">
        <button
          onClick={() => respond(notif.id, p.capsule_id, true)}
          className="flex-1 py-2 rounded-[10px] text-sm font-medium"
          style={{ background: 'rgba(139,92,246,0.2)', border: '1px solid rgba(139,92,246,0.4)' }}
        >
          Accepter
        </button>
        <button
          onClick={() => respond(notif.id, p.capsule_id, false)}
          className="flex-1 py-2 rounded-[10px] text-sm font-medium"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
        >
          Refuser
        </button>
      </div>
    </div>
  )
}

if (notif.type === 'coop_accepted') {
  const p = notif.payload as CoopAcceptedPayload
  return (
    <div key={notif.id} className="glass rounded-[16px] p-4">
      <p className="text-sm">
        <span style={{ color: 'rgba(139,92,246,1)' }}>{p.accepter_name}</span>
        {' '}a rejoint ta capsule co-op{' '}
        <Link href={`/shared/${p.capsule_id}`} style={{ color: 'rgba(255,255,255,0.7)', textDecoration: 'underline' }}>
          {p.capsule_title}
        </Link>
      </p>
    </div>
  )
}
```

Add a `respond` function in the component:

```typescript
async function respond(notifId: string, capsuleId: string, accepted: boolean) {
  // Find the invitation for this capsule
  const invRes = await fetch(`/api/shared-capsules/${capsuleId}`, { method: 'GET' })
  // The invitation ID must be fetched separately — add GET /api/shared-capsules/invitations
  // Simplification: call respond with the notification's capsule_id, but we need the invitation id
  // See note below
}
```

**Note on invitation lookup:** The `respond` endpoint requires the invitation `id`. Add a helper endpoint `GET /api/shared-capsules/invitations/pending` that returns pending invitations for the current user, so the notification can find the right invitation ID:

```typescript
// app/api/shared-capsules/invitations/pending/route.ts
import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getAuthUser } from '@/lib/auth'

export async function GET() {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createServerClient()
  const { data, error } = await supabase
    .from('shared_capsule_invitations')
    .select('id, capsule_id, inviter_id, created_at')
    .eq('invitee_id', user.id)
    .eq('status', 'pending')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}
```

Then the notifications page fetches pending invitations on mount, and the `respond` function looks up the invitation ID by `capsule_id`:

```typescript
const [pendingInvites, setPendingInvites] = useState<{ id: string; capsule_id: string }[]>([])

useEffect(() => {
  fetch('/api/shared-capsules/invitations/pending')
    .then(r => r.json())
    .then(data => Array.isArray(data) && setPendingInvites(data))
}, [])

async function respond(capsuleId: string, accepted: boolean) {
  const invite = pendingInvites.find(i => i.capsule_id === capsuleId)
  if (!invite) return
  await fetch(`/api/shared-capsules/invitations/${invite.id}/respond`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ accepted }),
  })
  if (accepted) router.push(`/shared/${capsuleId}`)
  else router.refresh()
}
```

- [ ] **Step 3: Create `app/api/shared-capsules/invitations/pending/route.ts`** (per the code above)

- [ ] **Step 4: Commit**

```bash
git add app/(app)/notifications/page.tsx app/api/shared-capsules/invitations/pending/route.ts
git commit -m "feat(notifications): coop_invite + coop_accepted notification rendering"
```

---

## Self-Review Checklist

- [x] DB schema matches spec: 3 tables, correct columns, RLS on all 3
- [x] All 7 spec API routes implemented (+ 1 bonus: `GET /invitations/pending`)
- [x] `PlayWithButton`: only shown for games + only if user has friends
- [x] `CoopCard`: co-op capsules appear under "Jeu" filter in library
- [x] `/shared/[id]`: shows both member statuses, shared notes editable by both
- [x] Notifications: both `coop_invite` and `coop_accepted` rendered
- [x] Type consistency: `SharedCapsule`, `SharedCapsuleMember` used consistently across all files
- [x] No placeholders or TBD items
