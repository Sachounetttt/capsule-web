# Speed Dial — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remplacer le lien `/add` du bouton `+` dans `BottomNav` par un speed dial vertical qui affiche 4 pills animées (Film, Série, Livre, Jeu) et redirige vers `/add?type=<type>`.

**Architecture:** Tout tient dans `components/nav/BottomNav.tsx` — ajout d'un état `open`, un backdrop, 4 pills Framer Motion animées, et remplacement du `<Link>` par un `<button>`. Aucun nouveau fichier.

**Tech Stack:** Next.js 16, React 19, TypeScript, Framer Motion, Lucide React

---

## File Map

| Fichier | Action |
|---------|--------|
| `components/nav/BottomNav.tsx` | Modifier — speed dial complet |

---

## Task 1 : Speed dial dans BottomNav

**Files:**
- Modify: `components/nav/BottomNav.tsx`

- [ ] **Étape 1 — Lire le fichier actuel**

```
Read: components/nav/BottomNav.tsx
```

Contenu actuel de référence :
```tsx
'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, BookOpen, Plus } from 'lucide-react'
import { motion } from 'framer-motion'

const tabs = [
  { href: '/', icon: Home, label: 'Accueil' },
  { href: '/library', icon: BookOpen, label: 'Bibliothèque' },
]

export default function BottomNav() {
  const pathname = usePathname()
  // ...
  <Link href="/add" ...>
    <div style={{ background: 'var(--color-purple)', ... }}>
      <Plus size={24} color="white" />
    </div>
  </Link>
}
```

- [ ] **Étape 2 — Remplacer `components/nav/BottomNav.tsx` entièrement par :**

```tsx
'use client'
import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Home, BookOpen, Plus, X, Clapperboard, Tv, Gamepad2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import type { MediaType } from '@/lib/types'

const tabs = [
  { href: '/', icon: Home, label: 'Accueil' },
  { href: '/library', icon: BookOpen, label: 'Bibliothèque' },
]

const mediaTypes: { type: MediaType; label: string; icon: React.ElementType }[] = [
  { type: 'movie', label: 'Film', icon: Clapperboard },
  { type: 'tvshow', label: 'Série', icon: Tv },
  { type: 'book', label: 'Livre', icon: BookOpen },
  { type: 'game', label: 'Jeu', icon: Gamepad2 },
]

export default function BottomNav() {
  const pathname = usePathname()
  const router = useRouter()
  const [open, setOpen] = useState(false)

  function handleSelect(type: MediaType) {
    setOpen(false)
    router.push(`/add?type=${type}`)
  }

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40"
            style={{ background: 'rgba(0,0,0,0.5)' }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {open && (
          <div className="fixed bottom-20 left-0 right-0 z-50 flex flex-col items-center gap-3 pb-2">
            {[...mediaTypes].reverse().map((item, i) => (
              <motion.button
                key={item.type}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 16 }}
                transition={{
                  delay: (mediaTypes.length - 1 - i) * 0.05,
                  type: 'spring',
                  stiffness: 300,
                  damping: 25,
                }}
                onClick={() => handleSelect(item.type)}
                className="flex items-center gap-3 px-5 py-2.5 rounded-full"
                style={{
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  color: 'white',
                }}
              >
                <item.icon size={16} />
                <span className="text-sm font-medium">{item.label}</span>
              </motion.button>
            ))}
          </div>
        )}
      </AnimatePresence>

      <nav
        className="fixed bottom-0 left-0 right-0 z-50 glass border-t"
        style={{ borderColor: 'rgba(255,255,255,0.1)', paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-4">
          {tabs.map(tab => {
            const active = pathname === tab.href
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className="relative flex flex-col items-center gap-1 px-6"
              >
                {active && (
                  <motion.div
                    layoutId="nav-indicator"
                    className="absolute -top-px left-1/2 -translate-x-1/2 w-8 rounded-full"
                    style={{ height: 2, background: 'var(--color-purple)' }}
                  />
                )}
                <tab.icon
                  size={22}
                  style={{ color: active ? 'var(--color-purple)' : 'rgba(255,255,255,0.4)' }}
                />
                <span
                  className="text-xs"
                  style={{ color: active ? 'var(--color-purple)' : 'rgba(255,255,255,0.4)' }}
                >
                  {tab.label}
                </span>
              </Link>
            )
          })}

          <button
            onClick={() => setOpen(o => !o)}
            className="flex flex-col items-center gap-1"
            aria-label={open ? 'Fermer' : 'Ajouter un média'}
          >
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center transition-colors duration-200"
              style={open
                ? { background: 'white', boxShadow: '0 4px 20px rgba(255,255,255,0.15)' }
                : { background: 'var(--color-purple)', boxShadow: '0 4px 20px rgba(124,58,237,0.4)' }
              }
            >
              {open
                ? <X size={22} color="black" />
                : <Plus size={24} color="white" />
              }
            </div>
          </button>
        </div>
      </nav>
    </>
  )
}
```

- [ ] **Étape 3 — Vérifier la compilation**

```bash
npm run build 2>&1 | grep -E "(error TS|✓ Compiled|Error:)" | head -10
```

Attendu : `✓ Compiled successfully`

- [ ] **Étape 4 — Vérifier que tous les tests passent**

```bash
npm test -- --no-coverage 2>&1 | tail -10
```

Attendu : tous les tests passent (les tests existants ne touchent pas BottomNav).

- [ ] **Étape 5 — Commit**

```bash
git add components/nav/BottomNav.tsx
git commit -m "feat: replace add link with speed dial type selector"
```
