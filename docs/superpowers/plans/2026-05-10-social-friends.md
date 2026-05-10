# Social Friends Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transformer Capsule Web en app multi-utilisateurs hébergée sur Vercel, avec auth Google, bibliothèques privées par utilisateur, et profils amis.

**Architecture:** Supabase Auth (Google OAuth) remplace le PIN. Toutes les routes API existantes filtrent désormais par `user_id` extrait de la session. La logique d'accès aux données amis vit dans les API routes Next.js (pas de RLS). Les nouvelles pages (`/profile`, `/friends`, `/users/[id]`) s'ajoutent à l'app sans toucher à la bottom nav.

**Tech Stack:** Next.js 16 · Supabase Auth + `@supabase/ssr` · Google OAuth · TypeScript · Tailwind 4 · Framer Motion

---

## Fichiers touchés

| Fichier | Action |
|---|---|
| `scripts/migrate-social.sql` | Créer |
| `lib/types.ts` | Modifier |
| `lib/supabase/server.ts` | Modifier |
| `lib/supabase/browser.ts` | Créer |
| `lib/auth.ts` | Créer |
| `lib/__tests__/auth.test.ts` | Créer |
| `app/auth/callback/route.ts` | Créer |
| `app/(auth)/login/page.tsx` | Créer |
| `app/(auth)/pin/page.tsx` | Modifier (redirect) |
| `proxy.ts` | Modifier |
| `app/api/auth/route.ts` | Modifier (signOut uniquement) |
| `app/api/media/route.ts` | Modifier |
| `app/api/media/[id]/route.ts` | Modifier |
| `app/api/export/route.ts` | Modifier |
| `app/api/similar/route.ts` | Modifier |
| `app/api/friends/route.ts` | Créer |
| `app/api/friends/[id]/route.ts` | Créer |
| `app/api/users/search/route.ts` | Créer |
| `app/api/users/[id]/profile/route.ts` | Créer |
| `components/home/SettingsSheet.tsx` | Modifier |
| `app/(app)/layout.tsx` | Modifier |
| `app/(app)/profile/page.tsx` | Créer |
| `app/(app)/friends/page.tsx` | Créer |
| `app/(app)/users/[id]/page.tsx` | Créer |
| `.env.local` | Modifier |
| `.env.local.example` | Modifier |

---

## Task 1 — SQL : migration schema

**Files:**
- Create: `scripts/migrate-social.sql`

- [ ] **Step 1 : Créer le fichier SQL**

```sql
-- scripts/migrate-social.sql

-- 1. user_id sur media_items
ALTER TABLE media_items ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);

-- 2. Table profiles (créée automatiquement via trigger à chaque signup Google)
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL,
  avatar_url text,
  created_at timestamptz DEFAULT now()
);

-- 3. Table friendships
CREATE TABLE IF NOT EXISTS friendships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  addressee_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted')),
  created_at timestamptz DEFAULT now(),
  UNIQUE (requester_id, addressee_id)
);

-- 4. Trigger : crée le profil automatiquement à chaque inscription Google
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

- [ ] **Step 2 : Exécuter dans le dashboard Supabase**

Aller dans **Supabase Dashboard → SQL Editor**, coller le contenu de `scripts/migrate-social.sql`, cliquer **Run**.

Vérifier dans **Table Editor** que les tables `profiles` et `friendships` existent, et que `media_items` a bien la colonne `user_id`.

- [ ] **Step 3 : Activer Google Provider dans Supabase**

Dans **Supabase Dashboard → Authentication → Providers → Google** :
1. Activer Google
2. Créer des credentials OAuth sur [console.cloud.google.com](https://console.cloud.google.com) (type : Web application)
3. Authorized redirect URIs : `https://<project-ref>.supabase.co/auth/v1/callback`
4. Copier Client ID et Client Secret → les coller dans Supabase

- [ ] **Step 4 : Commit**

```bash
git add scripts/migrate-social.sql
git commit -m "chore: add social schema migration SQL"
```

---

## Task 2 — Types : UserProfile, Friendship, FriendProfileSummary

**Files:**
- Modify: `lib/types.ts`

- [ ] **Step 1 : Ajouter les types en bas de `lib/types.ts`**

```typescript
export interface UserProfile {
  id: string
  display_name: string
  avatar_url?: string
  created_at: string
}

export type FriendshipStatus = 'pending' | 'accepted'

export interface Friendship {
  id: string
  requester_id: string
  addressee_id: string
  status: FriendshipStatus
  created_at: string
  profile?: UserProfile
}

export interface FriendProfileSummary {
  profile: UserProfile
  stats: { movies: number; tvshows: number; games: number }
  recent: Pick<MediaItem, 'id' | 'title' | 'type' | 'year' | 'poster_url' | 'date_added'>[]
  favorites: Pick<MediaItem, 'id' | 'title' | 'type' | 'year' | 'poster_url'>[]
}
```

- [ ] **Step 2 : Vérifier la compilation TypeScript**

```bash
npx tsc --noEmit
```

Expected : aucune erreur.

- [ ] **Step 3 : Commit**

```bash
git add lib/types.ts
git commit -m "feat: add UserProfile, Friendship, FriendProfileSummary types"
```

---

## Task 3 — Supabase Auth : installer `@supabase/ssr`, créer les clients

**Files:**
- Create: `lib/supabase/browser.ts`
- Modify: `lib/supabase/server.ts`

- [ ] **Step 1 : Installer `@supabase/ssr`**

```bash
npm install @supabase/ssr
```

Expected : `@supabase/ssr` apparaît dans `package.json`.

- [ ] **Step 2 : Créer `lib/supabase/browser.ts`**

Ce client tourne côté navigateur pour le sign-in Google.

```typescript
// lib/supabase/browser.ts
import { createBrowserClient } from '@supabase/ssr'

let instance: ReturnType<typeof createBrowserClient> | null = null

export function createClient() {
  if (!instance) {
    instance = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  }
  return instance
}
```

- [ ] **Step 3 : Mettre à jour `lib/supabase/server.ts`**

On ajoute `createSessionClient` (auth-aware, lit les cookies) sans casser `createServerClient` (admin, service_role) utilisé partout.

```typescript
// lib/supabase/server.ts
import { createServerClient as createSSRServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

// Client admin existant — service_role, inchangé
export function createServerClient() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

// Nouveau client auth-aware — lit la session depuis les cookies
export async function createSessionClient() {
  const cookieStore = await cookies()
  return createSSRServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet: { name: string; value: string; options: Record<string, unknown> }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options as Parameters<typeof cookieStore.set>[2])
            )
          } catch {
            // Ignoré si appelé depuis un Server Component (lecture seule)
          }
        }
      }
    }
  )
}
```

- [ ] **Step 4 : Ajouter les variables d'environnement**

Dans `.env.local`, ajouter :
```
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-public-key>
```

La `NEXT_PUBLIC_SUPABASE_URL` est probablement déjà sous `SUPABASE_URL` — vérifier et ajouter l'alias public.

Mettre à jour `.env.local.example` avec les deux nouvelles clés.

- [ ] **Step 5 : Vérifier la compilation**

```bash
npx tsc --noEmit
```

- [ ] **Step 6 : Commit**

```bash
git add lib/supabase/browser.ts lib/supabase/server.ts .env.local.example package.json package-lock.json
git commit -m "feat: add Supabase SSR clients (browser + session-aware server)"
```

---

## Task 4 — `lib/auth.ts` : helper `getAuthUser`

**Files:**
- Create: `lib/auth.ts`
- Create: `lib/__tests__/auth.test.ts`

- [ ] **Step 1 : Écrire le test en premier**

```typescript
// lib/__tests__/auth.test.ts
import { getAuthUser } from '../auth'

jest.mock('../supabase/server', () => ({
  createServerClient: jest.fn(),
  createSessionClient: jest.fn(),
}))

import { createSessionClient } from '../supabase/server'

describe('getAuthUser', () => {
  it('returns user when session is valid', async () => {
    const mockUser = { id: 'user-1', email: 'test@example.com' }
    ;(createSessionClient as jest.Mock).mockResolvedValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({ data: { user: mockUser } })
      }
    })

    const user = await getAuthUser()
    expect(user).toEqual(mockUser)
  })

  it('returns null when no session exists', async () => {
    ;(createSessionClient as jest.Mock).mockResolvedValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({ data: { user: null } })
      }
    })

    const user = await getAuthUser()
    expect(user).toBeNull()
  })
})
```

- [ ] **Step 2 : Lancer le test — vérifier qu'il échoue**

```bash
npx jest lib/__tests__/auth.test.ts --no-coverage
```

Expected : `FAIL` — `Cannot find module '../auth'`

- [ ] **Step 3 : Implémenter `lib/auth.ts`**

```typescript
// lib/auth.ts
import { createSessionClient } from './supabase/server'

export async function getAuthUser() {
  const supabase = await createSessionClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}
```

- [ ] **Step 4 : Relancer le test — vérifier qu'il passe**

```bash
npx jest lib/__tests__/auth.test.ts --no-coverage
```

Expected : `PASS` — 2 tests passing.

- [ ] **Step 5 : Commit**

```bash
git add lib/auth.ts lib/__tests__/auth.test.ts
git commit -m "feat: add getAuthUser helper with session client"
```

---

## Task 5 — Route OAuth callback

**Files:**
- Create: `app/auth/callback/route.ts`

- [ ] **Step 1 : Créer la route**

Supabase redirige ici après le sign-in Google avec un `code` en query param. On échange ce code contre une session et on stocke les cookies.

```typescript
// app/auth/callback/route.ts
import { createSessionClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=no_code`)
  }

  const supabase = await createSessionClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    return NextResponse.redirect(`${origin}/login?error=exchange_failed`)
  }

  return NextResponse.redirect(`${origin}/`)
}
```

- [ ] **Step 2 : Ajouter l'URL de callback dans Supabase**

Dans **Supabase Dashboard → Authentication → URL Configuration** :
- Site URL : `http://localhost:3000` (dev) / `https://ton-app.vercel.app` (prod)
- Redirect URLs : ajouter `http://localhost:3000/auth/callback` et `https://ton-app.vercel.app/auth/callback`

- [ ] **Step 3 : Commit**

```bash
git add app/auth/callback/route.ts
git commit -m "feat: add Google OAuth callback route"
```

---

## Task 6 — Page de login

**Files:**
- Create: `app/(auth)/login/page.tsx`
- Modify: `app/(auth)/pin/page.tsx` (redirect)

- [ ] **Step 1 : Créer `app/(auth)/login/page.tsx`**

```typescript
// app/(auth)/login/page.tsx
'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/browser'

export default function LoginPage() {
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  async function handleGoogleSignIn() {
    setLoading(true)
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` }
    })
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#000' }}>
      <div className="flex flex-col items-center gap-8 px-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-white mb-2">Capsule</h1>
          <p style={{ color: 'rgba(255,255,255,0.5)' }}>Ton tracker de médias</p>
        </div>

        <button
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="flex items-center gap-3 bg-white text-black font-semibold px-6 py-3 rounded-2xl disabled:opacity-50"
          style={{ minWidth: 240 }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          {loading ? 'Connexion...' : 'Continuer avec Google'}
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2 : Remplacer `app/(auth)/pin/page.tsx` par un redirect**

```typescript
// app/(auth)/pin/page.tsx
import { redirect } from 'next/navigation'

export default function PinPage() {
  redirect('/login')
}
```

- [ ] **Step 3 : Commit**

```bash
git add app/(auth)/login/page.tsx "app/(auth)/pin/page.tsx"
git commit -m "feat: add Google login page, redirect /pin to /login"
```

---

## Task 7 — Remplacer le check PIN dans `proxy.ts`

**Files:**
- Modify: `proxy.ts`

- [ ] **Step 1 : Réécrire `proxy.ts`**

```typescript
// proxy.ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        }
      }
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const { pathname } = request.nextUrl

  const isPublic = pathname.startsWith('/login') ||
                   pathname.startsWith('/auth') ||
                   pathname.startsWith('/pin')

  if (!user && !isPublic) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (user && (pathname === '/login' || pathname === '/pin')) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return response
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|manifest.json|icons|sw.js|workbox).*)'],
}
```

Note : on retire `api` du matcher car les API routes gèrent leur propre auth via `getAuthUser()`.

- [ ] **Step 2 : Vérifier la compilation**

```bash
npx tsc --noEmit
```

- [ ] **Step 3 : Commit**

```bash
git add proxy.ts
git commit -m "feat: replace PIN check with Supabase Auth session in proxy"
```

---

## Task 8 — Nettoyer l'ancien système PIN

**Files:**
- Modify: `app/api/auth/route.ts`
- Modify: `components/home/SettingsSheet.tsx`

- [ ] **Step 1 : Simplifier `app/api/auth/route.ts`** (ne garder que le signOut)

```typescript
// app/api/auth/route.ts
import { NextResponse } from 'next/server'
import { createSessionClient } from '@/lib/supabase/server'

export async function DELETE() {
  const supabase = await createSessionClient()
  await supabase.auth.signOut()
  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 2 : Mettre à jour `SettingsSheet.tsx`** (logout via Supabase + redirect vers /login)

Remplacer la fonction `handleLogout` :

```typescript
async function handleLogout() {
  await fetch('/api/auth', { method: 'DELETE' })
  router.replace('/login')
}
```

Aussi renommer le bouton de "Verrouiller l'app" à "Se déconnecter" et changer l'icône de `Lock` à `LogOut` (Lucide) :

```typescript
import { Settings, X, Download, LogOut } from 'lucide-react'
// ...
<button
  onClick={handleLogout}
  className="glass rounded-[12px] px-4 py-3 flex items-center gap-3 text-sm font-medium"
  style={{ color: '#F87171' }}
>
  <LogOut size={18} />
  Se déconnecter
</button>
```

- [ ] **Step 3 : Commit**

```bash
git add app/api/auth/route.ts components/home/SettingsSheet.tsx
git commit -m "feat: update auth to Supabase signOut, remove PIN system"
```

---

## Task 9 — Filtrer les API routes existantes par `user_id`

**Files:**
- Modify: `app/api/media/route.ts`
- Modify: `app/api/media/[id]/route.ts`
- Modify: `app/api/export/route.ts`
- Modify: `app/api/similar/route.ts`

- [ ] **Step 1 : Mettre à jour `app/api/media/route.ts`**

```typescript
// app/api/media/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getAuthUser } from '@/lib/auth'
import type { MediaItem } from '@/lib/types'

export async function GET(req: NextRequest) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createServerClient()
  const { searchParams } = new URL(req.url)
  const type = searchParams.get('type')
  const wishlistParam = searchParams.get('wishlist')

  const wishlistFilter = wishlistParam === 'true' ? true
    : wishlistParam === 'all' ? null
    : false

  let query = supabase
    .from('media_items')
    .select('*')
    .eq('user_id', user.id)
    .order('date_added', { ascending: false })

  if (wishlistFilter !== null) query = query.eq('wishlist', wishlistFilter)
  if (type) query = query.eq('type', type)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createServerClient()
  const body = await req.json() as Omit<MediaItem, 'id' | 'date_added'>

  if (!body.title || !body.type || !body.status) {
    return NextResponse.json({ error: 'title, type et status sont requis' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('media_items')
    .insert({ ...body, notes: body.notes ?? '', wishlist: body.wishlist ?? false, user_id: user.id })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
```

- [ ] **Step 2 : Mettre à jour `app/api/media/[id]/route.ts`**

```typescript
// app/api/media/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getAuthUser } from '@/lib/auth'
import type { MediaItem } from '@/lib/types'

async function verifyOwnership(supabase: ReturnType<typeof createServerClient>, id: string, userId: string) {
  const { data } = await supabase
    .from('media_items')
    .select('id')
    .eq('id', id)
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

  const { data, error } = await supabase
    .from('media_items')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (error || !data) return NextResponse.json({ error: 'Introuvable' }, { status: 404 })
  return NextResponse.json(data)
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const supabase = createServerClient()

  if (!(await verifyOwnership(supabase, id, user.id))) {
    return NextResponse.json({ error: 'Introuvable' }, { status: 404 })
  }

  const body = await req.json() as Partial<MediaItem>
  const updates = { ...body } as Record<string, unknown>
  delete updates.id
  delete updates.date_added
  delete updates.user_id

  const { data, error } = await supabase
    .from('media_items')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const supabase = createServerClient()

  if (!(await verifyOwnership(supabase, id, user.id))) {
    return NextResponse.json({ error: 'Introuvable' }, { status: 404 })
  }

  const { error } = await supabase
    .from('media_items')
    .delete()
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return new NextResponse(null, { status: 204 })
}
```

- [ ] **Step 3 : Mettre à jour `app/api/export/route.ts`**

```typescript
// app/api/export/route.ts
import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getAuthUser } from '@/lib/auth'

export async function GET() {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createServerClient()
  const { data, error } = await supabase
    .from('media_items')
    .select('*')
    .eq('user_id', user.id)
    .order('date_added', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const json = JSON.stringify(data, null, 2)
  const date = new Date().toISOString().slice(0, 10)

  return new NextResponse(json, {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="capsule-export-${date}.json"`,
    },
  })
}
```

- [ ] **Step 4 : Mettre à jour `app/api/similar/route.ts`** (filtrer par user_id pour la requête DB)

Ajouter `.eq('user_id', user.id)` à la requête Supabase :

```typescript
// app/api/similar/route.ts
import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getAuthUser } from '@/lib/auth'
import type { SearchResult } from '@/lib/types'

const TMDB_BASE = 'https://api.themoviedb.org/3'
const TMDB_IMG = 'https://image.tmdb.org/t/p/w500'

export async function GET() {
  try {
    const user = await getAuthUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const supabase = createServerClient()

    const { data: topItem } = await supabase
      .from('media_items')
      .select('title, type')
      .eq('user_id', user.id)
      .eq('rating', 5)
      .eq('wishlist', false)
      .in('type', ['movie', 'tvshow'])
      .order('date_added', { ascending: false })
      .limit(1)
      .single()

    if (!topItem) return NextResponse.json([])

    const endpoint = topItem.type === 'tvshow' ? 'tv' : 'movie'

    const searchRes = await fetch(
      `${TMDB_BASE}/search/${endpoint}?query=${encodeURIComponent(topItem.title)}&api_key=${process.env.TMDB_API_KEY}`
    )
    if (!searchRes.ok) return NextResponse.json([])

    const searchData = await searchRes.json()
    const tmdbId = searchData.results?.[0]?.id
    if (!tmdbId) return NextResponse.json([])

    const similarRes = await fetch(
      `${TMDB_BASE}/${endpoint}/${tmdbId}/similar?api_key=${process.env.TMDB_API_KEY}`
    )
    if (!similarRes.ok) return NextResponse.json([])

    const similarData = await similarRes.json()
    const results: SearchResult[] = (similarData.results ?? []).slice(0, 6).map((r: Record<string, unknown>) => ({
      title: (r.title ?? r.name) as string,
      year: r.release_date
        ? parseInt((r.release_date as string).slice(0, 4))
        : r.first_air_date
          ? parseInt((r.first_air_date as string).slice(0, 4))
          : undefined,
      poster_url: r.poster_path ? `${TMDB_IMG}${r.poster_path}` : undefined,
    }))

    return NextResponse.json(results)
  } catch {
    return NextResponse.json([])
  }
}
```

- [ ] **Step 5 : Vérifier la compilation**

```bash
npx tsc --noEmit
```

- [ ] **Step 6 : Commit**

```bash
git add app/api/media/route.ts "app/api/media/[id]/route.ts" app/api/export/route.ts app/api/similar/route.ts
git commit -m "feat: filter all media API routes by authenticated user_id"
```

---

## Task 10 — Migration des données existantes (one-shot)

**Files:** aucun fichier code — action manuelle dans Supabase.

- [ ] **Step 1 : Se connecter avec Google pour la première fois**

Ouvrir l'app en dev (`npm run dev`), aller sur `/login`, se connecter avec Google. Cela crée ton compte dans `auth.users` et ton profil dans `profiles`.

- [ ] **Step 2 : Récupérer ton user_id**

Dans **Supabase Dashboard → Authentication → Users**, copier le UUID de ton compte Google.

- [ ] **Step 3 : Rattacher les médias existants à ton compte**

Dans **Supabase Dashboard → SQL Editor** :

```sql
UPDATE media_items
SET user_id = '<ton-user-id-ici>'
WHERE user_id IS NULL;
```

Vérifier que tous les items ont un `user_id` :

```sql
SELECT COUNT(*) FROM media_items WHERE user_id IS NULL;
-- Doit retourner 0
```

- [ ] **Step 4 : Vérifier que l'app fonctionne**

Ouvrir la home → vérifier que tous tes médias apparaissent toujours.

---

## Task 11 — API amis : liste, envoi, acceptation, suppression

**Files:**
- Create: `app/api/friends/route.ts`
- Create: `app/api/friends/[id]/route.ts`

- [ ] **Step 1 : Créer `app/api/friends/route.ts`**

```typescript
// app/api/friends/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getAuthUser } from '@/lib/auth'

export async function GET() {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createServerClient()

  const { data: accepted } = await supabase
    .from('friendships')
    .select(`
      id, requester_id, addressee_id, status, created_at,
      requester:profiles!friendships_requester_id_fkey(id, display_name, avatar_url),
      addressee:profiles!friendships_addressee_id_fkey(id, display_name, avatar_url)
    `)
    .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
    .eq('status', 'accepted')

  const { data: pending } = await supabase
    .from('friendships')
    .select(`
      id, requester_id, addressee_id, status, created_at,
      requester:profiles!friendships_requester_id_fkey(id, display_name, avatar_url)
    `)
    .eq('addressee_id', user.id)
    .eq('status', 'pending')

  // Normalise: expose toujours le profil de "l'autre personne" sous la clé `profile`
  const friends = (accepted ?? []).map(f => ({
    id: f.id,
    status: f.status,
    created_at: f.created_at,
    profile: f.requester_id === user.id ? f.addressee : f.requester
  }))

  const normalizedPending = (pending ?? []).map(f => ({
    id: f.id,
    requester_id: f.requester_id,
    addressee_id: f.addressee_id,
    status: f.status,
    created_at: f.created_at,
    profile: f.requester
  }))

  return NextResponse.json({ friends, pending: normalizedPending })
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { addressee_id } = await req.json()

  if (!addressee_id || addressee_id === user.id) {
    return NextResponse.json({ error: 'Invalid addressee_id' }, { status: 400 })
  }

  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('friendships')
    .insert({ requester_id: user.id, addressee_id, status: 'pending' })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: 'Demande déjà envoyée ou utilisateur introuvable' }, { status: 409 })
  }

  return NextResponse.json(data, { status: 201 })
}
```

- [ ] **Step 2 : Créer `app/api/friends/[id]/route.ts`**

```typescript
// app/api/friends/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getAuthUser } from '@/lib/auth'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { action } = await req.json() as { action: 'accept' | 'reject' }

  if (!['accept', 'reject'].includes(action)) {
    return NextResponse.json({ error: 'action doit être accept ou reject' }, { status: 400 })
  }

  const supabase = createServerClient()

  const { data: friendship } = await supabase
    .from('friendships')
    .select('*')
    .eq('id', id)
    .eq('addressee_id', user.id)
    .eq('status', 'pending')
    .single()

  if (!friendship) {
    return NextResponse.json({ error: 'Demande introuvable' }, { status: 404 })
  }

  if (action === 'reject') {
    await supabase.from('friendships').delete().eq('id', id)
    return NextResponse.json({ ok: true })
  }

  const { data } = await supabase
    .from('friendships')
    .update({ status: 'accepted' })
    .eq('id', id)
    .select()
    .single()

  return NextResponse.json(data)
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const supabase = createServerClient()

  const { data: friendship } = await supabase
    .from('friendships')
    .select('id')
    .eq('id', id)
    .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
    .single()

  if (!friendship) {
    return NextResponse.json({ error: 'Introuvable' }, { status: 404 })
  }

  await supabase.from('friendships').delete().eq('id', id)
  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 3 : Vérifier la compilation**

```bash
npx tsc --noEmit
```

- [ ] **Step 4 : Commit**

```bash
git add app/api/friends/route.ts "app/api/friends/[id]/route.ts"
git commit -m "feat: add friends API (list, send request, accept/reject, delete)"
```

---

## Task 12 — API utilisateurs : recherche + profil ami

**Files:**
- Create: `app/api/users/search/route.ts`
- Create: `app/api/users/[id]/profile/route.ts`

- [ ] **Step 1 : Créer `app/api/users/search/route.ts`**

```typescript
// app/api/users/search/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getAuthUser } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const q = new URL(req.url).searchParams.get('q')?.trim() ?? ''

  if (q.length < 2) return NextResponse.json([])

  const supabase = createServerClient()

  const { data } = await supabase
    .from('profiles')
    .select('id, display_name, avatar_url')
    .ilike('display_name', `%${q}%`)
    .neq('id', user.id)
    .limit(10)

  return NextResponse.json(data ?? [])
}
```

- [ ] **Step 2 : Créer `app/api/users/[id]/profile/route.ts`**

```typescript
// app/api/users/[id]/profile/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getAuthUser } from '@/lib/auth'
import type { FriendProfileSummary } from '@/lib/types'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const supabase = createServerClient()

  // Vérifier que la friendship est acceptée (dans les deux sens)
  const { data: friendship } = await supabase
    .from('friendships')
    .select('status')
    .or(
      `and(requester_id.eq.${user.id},addressee_id.eq.${id}),` +
      `and(requester_id.eq.${id},addressee_id.eq.${user.id})`
    )
    .eq('status', 'accepted')
    .single()

  if (!friendship) {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, display_name, avatar_url, created_at')
    .eq('id', id)
    .single()

  if (!profile) return NextResponse.json({ error: 'Introuvable' }, { status: 404 })

  const { data: items } = await supabase
    .from('media_items')
    .select('id, type, title, year, poster_url, date_added, rating, status')
    .eq('user_id', id)
    .eq('wishlist', false)

  const all = items ?? []

  const stats = {
    movies: all.filter(i => i.type === 'movie').length,
    tvshows: all.filter(i => i.type === 'tvshow').length,
    games: all.filter(i => i.type === 'game').length,
  }

  const recent = [...all]
    .sort((a, b) => new Date(b.date_added).getTime() - new Date(a.date_added).getTime())
    .slice(0, 5)

  const favorites = all.filter(i => i.rating === 5).slice(0, 6)

  const result: FriendProfileSummary = { profile, stats, recent, favorites }
  return NextResponse.json(result)
}
```

- [ ] **Step 3 : Vérifier la compilation**

```bash
npx tsc --noEmit
```

- [ ] **Step 4 : Commit**

```bash
git add app/api/users/search/route.ts "app/api/users/[id]/profile/route.ts"
git commit -m "feat: add users search and friend profile summary API"
```

---

## Task 13 — Layout : avatar profil en haut à droite

**Files:**
- Modify: `app/(app)/layout.tsx`

- [ ] **Step 1 : Mettre à jour le layout**

```typescript
// app/(app)/layout.tsx
import BottomNav from '@/components/nav/BottomNav'
import ProfileAvatar from '@/components/nav/ProfileAvatar'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen" style={{ paddingBottom: '6rem' }}>
      <ProfileAvatar />
      {children}
      <BottomNav />
    </div>
  )
}
```

- [ ] **Step 2 : Créer `components/nav/ProfileAvatar.tsx`**

Ce composant client affiche l'avatar Google de l'utilisateur connecté (coin haut droit) et un badge rouge si des demandes d'ami sont en attente.

```typescript
// components/nav/ProfileAvatar.tsx
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/browser'

export default function ProfileAvatar() {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [pendingCount, setPendingCount] = useState(0)

  useEffect(() => {
    const supabase = createClient()

    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const meta = user.user_metadata
      setAvatarUrl(meta?.avatar_url ?? null)

      const res = await fetch('/api/friends')
      if (res.ok) {
        const json = await res.json()
        setPendingCount(json.pending?.length ?? 0)
      }
    }

    load()
  }, [])

  return (
    <Link
      href="/profile"
      className="fixed top-4 right-4 z-30"
      style={{ width: 36, height: 36 }}
    >
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
            className="rounded-full flex items-center justify-center"
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
  )
}
```

- [ ] **Step 3 : Commit**

```bash
git add "app/(app)/layout.tsx" components/nav/ProfileAvatar.tsx
git commit -m "feat: add profile avatar with pending badge in app layout"
```

---

## Task 14 — Page `/profile`

**Files:**
- Create: `app/(app)/profile/page.tsx`

- [ ] **Step 1 : Créer la page**

```typescript
// app/(app)/profile/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/browser'
import { Users, LogOut, Download } from 'lucide-react'
import type { User } from '@supabase/supabase-js'

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null)
  const [stats, setStats] = useState({ movies: 0, tvshows: 0, games: 0 })
  const [friendCount, setFriendCount] = useState(0)
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()

    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/login'); return }
      setUser(user)

      const [mediaRes, friendsRes] = await Promise.all([
        fetch('/api/media?wishlist=false'),
        fetch('/api/friends'),
      ])

      if (mediaRes.ok) {
        const items = await mediaRes.json()
        setStats({
          movies: items.filter((i: { type: string }) => i.type === 'movie').length,
          tvshows: items.filter((i: { type: string }) => i.type === 'tvshow').length,
          games: items.filter((i: { type: string }) => i.type === 'game').length,
        })
      }

      if (friendsRes.ok) {
        const { friends } = await friendsRes.json()
        setFriendCount(friends?.length ?? 0)
      }
    }

    load()
  }, [router])

  async function handleLogout() {
    await fetch('/api/auth', { method: 'DELETE' })
    router.replace('/login')
  }

  function handleExport() {
    const a = document.createElement('a')
    a.href = '/api/export'
    a.download = ''
    a.click()
  }

  if (!user) return null

  const avatar = user.user_metadata?.avatar_url
  const name = user.user_metadata?.full_name ?? user.email

  return (
    <div className="px-4 pt-16 pb-8 flex flex-col gap-6 max-w-lg mx-auto">
      {/* Header */}
      <div className="flex flex-col items-center gap-3 pt-4">
        {avatar
          ? <img src={avatar} alt="avatar" className="rounded-full" style={{ width: 72, height: 72 }} />
          : <div className="rounded-full" style={{ width: 72, height: 72, background: 'rgba(255,255,255,0.15)' }} />
        }
        <p className="text-xl font-bold">{name}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {([
          { label: 'Films', value: stats.movies },
          { label: 'Séries', value: stats.tvshows },
          { label: 'Jeux', value: stats.games },
        ] as const).map(({ label, value }) => (
          <div key={label} className="glass rounded-2xl p-3 flex flex-col items-center gap-1">
            <span className="text-2xl font-bold">{value}</span>
            <span className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>{label}</span>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-3">
        <Link
          href="/friends"
          className="glass rounded-2xl px-4 py-3 flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <Users size={18} style={{ color: 'var(--color-purple)' }} />
            <span className="font-medium">Mes amis</span>
          </div>
          <span style={{ color: 'rgba(255,255,255,0.4)' }}>{friendCount} →</span>
        </Link>

        <button
          onClick={handleExport}
          className="glass rounded-2xl px-4 py-3 flex items-center gap-3 text-sm font-medium"
        >
          <Download size={18} style={{ color: 'var(--color-purple)' }} />
          Exporter en JSON
        </button>

        <button
          onClick={handleLogout}
          className="glass rounded-2xl px-4 py-3 flex items-center gap-3 text-sm font-medium"
          style={{ color: '#F87171' }}
        >
          <LogOut size={18} />
          Se déconnecter
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2 : Commit**

```bash
git add "app/(app)/profile/page.tsx"
git commit -m "feat: add /profile page with stats and friend count"
```

---

## Task 15 — Page `/friends`

**Files:**
- Create: `app/(app)/friends/page.tsx`

- [ ] **Step 1 : Créer la page**

```typescript
// app/(app)/friends/page.tsx
'use client'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { Search, UserPlus, Check, X } from 'lucide-react'
import type { Friendship, UserProfile } from '@/lib/types'

export default function FriendsPage() {
  const [friends, setFriends] = useState<Friendship[]>([])
  const [pending, setPending] = useState<Friendship[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<UserProfile[]>([])
  const [sentIds, setSentIds] = useState<Set<string>>(new Set())
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    fetch('/api/friends')
      .then(r => r.json())
      .then(({ friends, pending }) => {
        setFriends(friends ?? [])
        setPending(pending ?? [])
      })
  }, [])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (searchQuery.length < 2) { setSearchResults([]); return }
    debounceRef.current = setTimeout(() => {
      fetch(`/api/users/search?q=${encodeURIComponent(searchQuery)}`)
        .then(r => r.json())
        .then(setSearchResults)
    }, 300)
  }, [searchQuery])

  async function sendRequest(addresseeId: string) {
    const res = await fetch('/api/friends', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ addressee_id: addresseeId }),
    })
    if (res.ok) setSentIds(prev => new Set(prev).add(addresseeId))
  }

  async function respondToRequest(id: string, action: 'accept' | 'reject') {
    const res = await fetch(`/api/friends/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    })
    if (res.ok) {
      setPending(prev => prev.filter(p => p.id !== id))
      if (action === 'accept') {
        const updated = await fetch('/api/friends').then(r => r.json())
        setFriends(updated.friends ?? [])
      }
    }
  }

  return (
    <div className="px-4 pt-16 pb-8 flex flex-col gap-6 max-w-lg mx-auto">
      <h1 className="text-2xl font-bold pt-2">Amis</h1>

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'rgba(255,255,255,0.4)' }} />
        <input
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Chercher un ami par nom..."
          className="w-full glass rounded-2xl pl-9 pr-4 py-3 text-sm bg-transparent outline-none"
        />
      </div>

      {/* Search results */}
      {searchResults.length > 0 && (
        <div className="flex flex-col gap-2">
          {searchResults.map(u => (
            <div key={u.id} className="glass rounded-2xl px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {u.avatar_url
                  ? <img src={u.avatar_url} className="rounded-full" style={{ width: 36, height: 36 }} alt="" />
                  : <div className="rounded-full" style={{ width: 36, height: 36, background: 'rgba(255,255,255,0.15)' }} />
                }
                <span className="font-medium">{u.display_name}</span>
              </div>
              <button
                onClick={() => sendRequest(u.id)}
                disabled={sentIds.has(u.id)}
                className="flex items-center gap-2 text-sm font-medium disabled:opacity-40"
                style={{ color: sentIds.has(u.id) ? 'rgba(255,255,255,0.4)' : 'var(--color-purple)' }}
              >
                <UserPlus size={16} />
                {sentIds.has(u.id) ? 'Envoyé' : 'Ajouter'}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Pending requests */}
      {pending.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'rgba(255,255,255,0.5)' }}>
            Demandes reçues
          </p>
          {pending.map(p => (
            <div key={p.id} className="glass rounded-2xl px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {p.profile?.avatar_url
                  ? <img src={p.profile.avatar_url} className="rounded-full" style={{ width: 36, height: 36 }} alt="" />
                  : <div className="rounded-full" style={{ width: 36, height: 36, background: 'rgba(255,255,255,0.15)' }} />
                }
                <span className="font-medium">{p.profile?.display_name}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => respondToRequest(p.id, 'accept')}
                  className="glass rounded-full flex items-center justify-center"
                  style={{ width: 32, height: 32, color: '#4ADE80' }}
                >
                  <Check size={16} />
                </button>
                <button
                  onClick={() => respondToRequest(p.id, 'reject')}
                  className="glass rounded-full flex items-center justify-center"
                  style={{ width: 32, height: 32, color: '#F87171' }}
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Friends list */}
      <div className="flex flex-col gap-2">
        <p className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'rgba(255,255,255,0.5)' }}>
          Mes amis {friends.length > 0 && `· ${friends.length}`}
        </p>
        {friends.length === 0 && (
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
            Cherche des amis ci-dessus pour les ajouter.
          </p>
        )}
        {friends.map(f => (
          <Link
            key={f.id}
            href={`/users/${f.profile?.id}`}
            className="glass rounded-2xl px-4 py-3 flex items-center gap-3"
          >
            {f.profile?.avatar_url
              ? <img src={f.profile.avatar_url} className="rounded-full" style={{ width: 36, height: 36 }} alt="" />
              : <div className="rounded-full" style={{ width: 36, height: 36, background: 'rgba(255,255,255,0.15)' }} />
            }
            <span className="font-medium">{f.profile?.display_name}</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2 : Commit**

```bash
git add "app/(app)/friends/page.tsx"
git commit -m "feat: add /friends page with search, pending requests, and friend list"
```

---

## Task 16 — Page `/users/[id]` : profil ami

**Files:**
- Create: `app/(app)/users/[id]/page.tsx`

- [ ] **Step 1 : Créer la page**

```typescript
// app/(app)/users/[id]/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import type { FriendProfileSummary } from '@/lib/types'

export default function UserProfilePage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [data, setData] = useState<FriendProfileSummary | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    fetch(`/api/users/${id}/profile`)
      .then(r => { if (!r.ok) throw new Error(); return r.json() })
      .then(setData)
      .catch(() => setError(true))
  }, [id])

  if (error) {
    return (
      <div className="px-4 pt-20 text-center">
        <p style={{ color: 'rgba(255,255,255,0.5)' }}>Profil inaccessible.</p>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="px-4 pt-20 text-center">
        <p style={{ color: 'rgba(255,255,255,0.3)' }}>Chargement...</p>
      </div>
    )
  }

  const { profile, stats, recent, favorites } = data

  return (
    <div className="px-4 pt-16 pb-8 flex flex-col gap-6 max-w-lg mx-auto">
      {/* Back button */}
      <button onClick={() => router.back()} className="flex items-center gap-2 pt-2" style={{ color: 'rgba(255,255,255,0.6)' }}>
        <ArrowLeft size={18} />
        <span className="text-sm">Retour</span>
      </button>

      {/* Header */}
      <div className="flex flex-col items-center gap-3">
        {profile.avatar_url
          ? <img src={profile.avatar_url} className="rounded-full" style={{ width: 72, height: 72 }} alt="" />
          : <div className="rounded-full" style={{ width: 72, height: 72, background: 'rgba(255,255,255,0.15)' }} />
        }
        <p className="text-xl font-bold">{profile.display_name}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {([
          { label: 'Films', value: stats.movies },
          { label: 'Séries', value: stats.tvshows },
          { label: 'Jeux', value: stats.games },
        ] as const).map(({ label, value }) => (
          <div key={label} className="glass rounded-2xl p-3 flex flex-col items-center gap-1">
            <span className="text-2xl font-bold">{value}</span>
            <span className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>{label}</span>
          </div>
        ))}
      </div>

      {/* Recent */}
      {recent.length > 0 && (
        <div className="flex flex-col gap-3">
          <p className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'rgba(255,255,255,0.5)' }}>
            Derniers ajouts
          </p>
          <div className="flex gap-3 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
            {recent.map(item => (
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

      {/* Favorites */}
      {favorites.length > 0 && (
        <div className="flex flex-col gap-3">
          <p className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'rgba(255,255,255,0.5)' }}>
            Coups de cœur ★
          </p>
          <div className="flex gap-3 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
            {favorites.map(item => (
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
    </div>
  )
}
```

- [ ] **Step 2 : Commit**

```bash
git add "app/(app)/users/[id]/page.tsx"
git commit -m "feat: add /users/[id] friend profile page"
```

---

## Task 17 — Déploiement Vercel

- [ ] **Step 1 : Créer un compte Vercel et importer le projet**

1. Aller sur [vercel.com](https://vercel.com) → "Add New Project"
2. Importer le repo GitHub de `capsule-web` (pousser d'abord le code sur GitHub si pas encore fait)
3. Framework : Next.js (détecté automatiquement)

- [ ] **Step 2 : Configurer les variables d'environnement dans Vercel**

Dans **Vercel Dashboard → Settings → Environment Variables**, ajouter toutes les variables de `.env.local` :

```
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
TMDB_API_KEY
RAWG_API_KEY
PIN_SALT              # peut être supprimé si l'ancien système PIN est entièrement retiré
CAPSULE_SESSION_SECRET  # peut être supprimé
```

- [ ] **Step 3 : Ajouter l'URL de production dans Supabase**

Dans **Supabase Dashboard → Authentication → URL Configuration** :
- Site URL : `https://ton-app.vercel.app`
- Redirect URLs : ajouter `https://ton-app.vercel.app/auth/callback`

Dans **Google Cloud Console → OAuth credentials** :
- Authorized redirect URIs : ajouter `https://<project-ref>.supabase.co/auth/v1/callback` (déjà fait en Task 1) et `https://ton-app.vercel.app/auth/callback`

- [ ] **Step 4 : Déployer**

```bash
git push origin master
```

Vercel déploie automatiquement depuis la branche principale.

- [ ] **Step 5 : Vérifier le déploiement**

1. Ouvrir l'URL Vercel → page `/login` s'affiche
2. Cliquer "Continuer avec Google" → connexion fonctionne
3. Vérifier que les médias existants apparaissent
4. Partager l'URL à un ami → il s'inscrit, tu le cherches dans `/friends`, tu l'acceptes, tu vois son profil

- [ ] **Step 6 : Installer la PWA sur iPhone**

Ouvrir l'URL dans Safari → icône Partager → "Sur l'écran d'accueil" → confirmer.

---

## Checklist de validation finale

- [ ] Auth Google fonctionne (sign in, sign out, redirection)
- [ ] Les médias existants sont toujours visibles après migration `user_id`
- [ ] Un nouvel utilisateur qui crée un compte ne voit pas les données des autres
- [ ] La recherche d'amis fonctionne
- [ ] Demande d'ami → badge rouge → accepter → profil accessible
- [ ] Profil ami affiche stats + derniers ajouts + coups de cœur
- [ ] L'app est installable sur iPhone via Safari
- [ ] Build de production sans erreur (`npm run build`)
