# Flow notation conditionnel — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Masquer les critères de notation quand le statut est "En cours" dans le formulaire d'ajout, et ajouter un bouton "J'ai terminé !" sur la page détail qui révèle la notation et passe le statut à "Terminé".

**Architecture:** Deux changements indépendants — une condition dans `MediaForm` (une ligne), et un nouveau composant client `FinishFlow` monté conditionnellement dans la page détail. Le PATCH utilise la route `/api/media/[id]` existante.

**Tech Stack:** Next.js 16, React 19, TypeScript, Framer Motion absent (pas nécessaire ici)

---

## File Map

| Fichier | Action |
|---------|--------|
| `components/add/MediaForm.tsx` | Modifier — condition `form.status === 'completed'` sur le bloc Notes |
| `components/detail/FinishFlow.tsx` | Créer — bouton + formulaire de notation inline |
| `app/(app)/media/[id]/page.tsx` | Modifier — monter FinishFlow si status inProgress |

---

## Task 1 : MediaForm — masquer les notes si "En cours"

**Files:**
- Modify: `components/add/MediaForm.tsx`

- [ ] **Étape 1 — Lire `components/add/MediaForm.tsx`**

Repère le bloc :
```tsx
{criteria.length > 0 && (
  <div>
    <p className="text-xs mb-3" style={{ color: 'rgba(255,255,255,0.4)' }}>Notes</p>
    <CriteriaRating ...
```

- [ ] **Étape 2 — Ajouter la condition `form.status === 'completed'`**

Remplacer :
```tsx
{criteria.length > 0 && (
```
par :
```tsx
{criteria.length > 0 && form.status === 'completed' && (
```

- [ ] **Étape 3 — Vérifier la compilation**

```bash
npm run build 2>&1 | grep -E "(error TS|✓ Compiled)" | head -5
```
Attendu : `✓ Compiled successfully`

- [ ] **Étape 4 — Commit**

```bash
git add components/add/MediaForm.tsx
git commit -m "feat: hide criteria rating when status is inProgress in MediaForm"
```

---

## Task 2 : FinishFlow — composant + intégration page détail

**Files:**
- Create: `components/detail/FinishFlow.tsx`
- Modify: `app/(app)/media/[id]/page.tsx`

- [ ] **Étape 1 — Créer `components/detail/FinishFlow.tsx`**

```tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import CriteriaRating from '@/components/ui/CriteriaRating'
import type { MediaType, CriterionValue } from '@/lib/types'

const CRITERIA: Record<string, { label: string; key: string }[]> = {
  movie: [
    { label: 'Histoire', key: 'histoire' },
    { label: 'Réalisation', key: 'realisation' },
    { label: 'Acteurs', key: 'acteurs' },
    { label: 'Musique', key: 'musique' },
  ],
  tvshow: [
    { label: 'Histoire', key: 'histoire' },
    { label: 'Acteurs', key: 'acteurs' },
    { label: 'Réalisation', key: 'realisation' },
    { label: 'Rythme', key: 'rythme' },
  ],
  book: [
    { label: 'Histoire', key: 'histoire' },
    { label: 'Écriture', key: 'ecriture' },
    { label: 'Personnages', key: 'personnages' },
    { label: 'Univers', key: 'univers' },
  ],
  game: [
    { label: 'Graphisme', key: 'graphisme' },
    { label: 'Histoire', key: 'histoire' },
    { label: 'Gameplay', key: 'gameplay' },
    { label: 'Level Design', key: 'leveldesign' },
  ],
}

interface Props {
  itemId: string
  mediaType: MediaType
}

export default function FinishFlow({ itemId, mediaType }: Props) {
  const router = useRouter()
  const [step, setStep] = useState<'button' | 'form'>('button')
  const [ratings, setRatings] = useState<Record<string, CriterionValue>>({})
  const [loading, setLoading] = useState(false)

  const criteria = CRITERIA[mediaType] ?? []

  async function handleConfirm() {
    setLoading(true)
    await fetch(`/api/media/${itemId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'completed', ratings_json: ratings }),
    })
    router.push('/library')
  }

  if (step === 'button') {
    return (
      <button
        onClick={() => setStep('form')}
        className="w-full py-3 rounded-[12px] font-semibold mb-4"
        style={{ background: '#7C3AED', color: 'white' }}
      >
        J'ai terminé !
      </button>
    )
  }

  return (
    <div className="glass rounded-[20px] p-4 mb-4 flex flex-col gap-4">
      <p className="text-xs uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.4)' }}>
        Comment c'était ?
      </p>
      {criteria.length > 0 && (
        <CriteriaRating
          criteria={criteria}
          values={ratings}
          onChange={setRatings}
        />
      )}
      <div className="flex gap-3">
        <button
          onClick={() => setStep('button')}
          className="flex-1 py-3 rounded-[12px] text-sm font-medium"
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            color: 'white',
          }}
        >
          Annuler
        </button>
        <button
          onClick={handleConfirm}
          disabled={loading}
          className="flex-1 py-3 rounded-[12px] text-sm font-semibold"
          style={{ background: '#7C3AED', color: 'white', opacity: loading ? 0.6 : 1 }}
        >
          {loading ? '...' : 'Confirmer'}
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Étape 2 — Modifier `app/(app)/media/[id]/page.tsx`**

**2a.** Lis le fichier. Ajouter `FinishFlow` et `MediaType` aux imports :

Remplacer :
```tsx
import DeleteButton from '@/components/detail/DeleteButton'
import type { MediaStatus, CriterionValue } from '@/lib/types'
```
par :
```tsx
import DeleteButton from '@/components/detail/DeleteButton'
import FinishFlow from '@/components/detail/FinishFlow'
import type { MediaStatus, CriterionValue, MediaType } from '@/lib/types'
```

**2b.** Localiser le bloc `{/* Back link */}` et `{/* Delete */}`. Ajouter `FinishFlow` entre les deux :

```tsx
        {/* Back link */}
        <Link
          href="/library"
          className="glass rounded-[12px] py-3 flex items-center justify-center gap-2 text-sm font-medium mb-4"
        >
          <ArrowLeft size={16} />
          Retour à la bibliothèque
        </Link>

        {/* Finish flow */}
        {item.status === 'inProgress' && (
          <FinishFlow itemId={item.id} mediaType={item.type as MediaType} />
        )}

        {/* Delete */}
        <DeleteButton itemId={item.id} />
```

- [ ] **Étape 3 — Vérifier la compilation**

```bash
npm run build 2>&1 | grep -E "(error TS|✓ Compiled)" | head -5
```
Attendu : `✓ Compiled successfully`

- [ ] **Étape 4 — Lancer les tests**

```bash
npm test -- --no-coverage 2>&1 | tail -8
```
Attendu : tous les tests passent.

- [ ] **Étape 5 — Commit**

```bash
git add components/detail/FinishFlow.tsx "app/(app)/media/[id]/page.tsx"
git commit -m "feat: add FinishFlow component to rate and complete media from detail page"
```
