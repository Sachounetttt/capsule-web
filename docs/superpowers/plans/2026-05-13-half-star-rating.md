# Half-Star Rating Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Support 0,5-increment star ratings in input and display, and show exact averages as `X,X/5` in the "Vos amis ont adoré" section.

**Architecture:** `StarRating.tsx` is rewritten to split each star into two invisible click zones (left = +0,5 / right = entier) and render half-filled stars via CSS `clipPath`. The home page replaces star-emoji repetition with `toFixed(1)` text. No schema or type changes needed — `number` already supports decimals.

**Tech Stack:** React 19, framer-motion, lucide-react (`Star` icon), Tailwind CSS, Next.js 16

---

## Files

| Action | File |
|--------|------|
| Modify | `components/ui/StarRating.tsx` |
| Modify | `app/(app)/page.tsx` |

---

## Task 1: Rewrite `StarRating.tsx` with half-star support

**Files:**
- Modify: `components/ui/StarRating.tsx`

- [ ] **Step 1: Replace the file content**

```tsx
'use client'
import { motion } from 'framer-motion'
import { Star } from 'lucide-react'

interface Props {
  value: number
  onChange?: (v: number) => void
  readonly?: boolean
}

export default function StarRating({ value, onChange, readonly }: Props) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(star => {
        const isFull = star <= value
        const isHalf = !isFull && star - 0.5 === value

        return (
          <motion.div
            key={star}
            className="relative"
            style={{ width: 20, height: 20 }}
            whileTap={readonly ? undefined : { scale: 1.4 }}
          >
            {/* Empty star (background) */}
            <Star
              size={20}
              style={{
                fill: 'none',
                color: 'rgba(255,255,255,0.2)',
                position: 'absolute',
                top: 0,
                left: 0,
                pointerEvents: 'none',
              }}
            />
            {/* Filled overlay — full or half via clipPath */}
            {(isFull || isHalf) && (
              <Star
                size={20}
                style={{
                  fill: 'var(--color-purple)',
                  color: 'var(--color-purple)',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  clipPath: isHalf ? 'inset(0 50% 0 0)' : undefined,
                  pointerEvents: 'none',
                }}
              />
            )}
            {/* Click zones — only when interactive */}
            {!readonly && (
              <>
                <button
                  type="button"
                  onClick={() => onChange?.(star - 0.5)}
                  aria-label={`${star - 0.5} étoiles`}
                  className="absolute inset-y-0 left-0"
                  style={{ width: '50%', background: 'transparent' }}
                />
                <button
                  type="button"
                  onClick={() => onChange?.(star)}
                  aria-label={`${star} étoiles`}
                  className="absolute inset-y-0 right-0"
                  style={{ width: '50%', background: 'transparent' }}
                />
              </>
            )}
          </motion.div>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npm run build
```

Expected: `✓ Compiled successfully` with no TypeScript errors. The `clipPath` prop is a valid React inline style string.

- [ ] **Step 3: Commit**

```bash
git add components/ui/StarRating.tsx
git commit -m "feat: half-star rating — split click zones + clipPath half-fill"
```

---

## Task 2: Show `X,X/5` dans "Vos amis ont adoré"

**Files:**
- Modify: `app/(app)/page.tsx` (ligne ~131)

- [ ] **Step 1: Remplacer l'affichage étoiles par le texte**

Trouver ce bloc dans `app/(app)/page.tsx` :

```tsx
                  <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
                    {'⭐'.repeat(Math.round(item.avgRating))}
                  </p>
```

Le remplacer par :

```tsx
                  <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
                    {item.avgRating.toFixed(1).replace('.', ',')}/5
                  </p>
```

- [ ] **Step 2: Vérifier TypeScript**

```bash
npm run build
```

Expected: `✓ Compiled successfully`, 23 routes générées sans erreur.

- [ ] **Step 3: Commit**

```bash
git add "app/(app)/page.tsx"
git commit -m "feat: show X,X/5 average in friends loved section"
```

---

## Task 3: Push et vérification finale

- [ ] **Step 1: Push vers GitHub (déclenche Vercel)**

```bash
git push origin master
```

- [ ] **Step 2: Vérifier sur l'app**

1. Aller sur `/add` → ajouter un film avec statut "Terminé"
2. Cliquer sur la moitié gauche d'une étoile → valeur doit passer à X,5
3. Cliquer sur la moitié droite → valeur entière
4. Vérifier l'affichage en lecture seule dans `/library` (MediaCard) et `/media/[id]`
5. Vérifier la section "Vos amis ont adoré" sur la home → doit afficher `4,2/5` etc. (si des amis ont des items notés ≥ 4)
