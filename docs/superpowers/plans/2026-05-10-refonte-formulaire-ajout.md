# Refonte formulaire d'ajout — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Simplifier le formulaire d'ajout : masquer le sélecteur de type si déjà choisi, réduire les statuts, cacher le statut en wishlist, et remplacer la note unique par des critères spécifiques par type avec avis texte.

**Architecture:** 4 tâches séquentielles — fondations types/DB → nouveau composant CriteriaRating → refonte MediaForm → mise à jour add/page. Chaque tâche compile et passe les tests indépendamment.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind 4, Framer Motion

---

## File Map

| Fichier | Action |
|---------|--------|
| `lib/types.ts` | Modifier — ajouter `CriterionValue` et `ratings_json` |
| `supabase/schema.sql` | Modifier — `ALTER TABLE ratings_json jsonb` |
| `components/ui/CriteriaRating.tsx` | Créer — critères étoiles + avis texte |
| `components/add/MediaForm.tsx` | Modifier — statuts réduits, wishlist prop, CriteriaRating |
| `app/(app)/add/page.tsx` | Modifier — masquer sélecteur si typeFromUrl, passer wishlist |

---

## Task 1 : Types & DB

**Files:**
- Modify: `lib/types.ts`
- Modify: `supabase/schema.sql`

- [ ] **Étape 1 — Ajouter `CriterionValue` et `ratings_json` dans `lib/types.ts`**

Lis d'abord le fichier. Ensuite :

1. Ajouter après la ligne `export type MediaStatus = ...` :
```ts
export type CriterionValue = { rating: number; review?: string }
```

2. Ajouter dans `MediaItem` après `developer?: string` :
```ts
  ratings_json?: Record<string, CriterionValue>
```

- [ ] **Étape 2 — Ajouter la colonne dans `supabase/schema.sql`**

Ajouter à la fin du fichier (après les ALTER TABLE existants) :
```sql
ALTER TABLE media_items ADD COLUMN IF NOT EXISTS ratings_json jsonb;
```

- [ ] **Étape 3 — Appliquer en base**

Dans Supabase Dashboard → **SQL Editor**, exécuter :
```sql
ALTER TABLE media_items ADD COLUMN IF NOT EXISTS ratings_json jsonb;
```

- [ ] **Étape 4 — Vérifier la compilation**

```bash
npm run build 2>&1 | grep -E "(error TS|✓ Compiled)" | head -5
```
Attendu : `✓ Compiled successfully`

- [ ] **Étape 5 — Commit**

```bash
git add lib/types.ts supabase/schema.sql
git commit -m "feat: add CriterionValue type and ratings_json column"
```

---

## Task 2 : Composant CriteriaRating

**Files:**
- Create: `components/ui/CriteriaRating.tsx`

- [ ] **Étape 1 — Créer `components/ui/CriteriaRating.tsx`**

```tsx
'use client'
import StarRating from './StarRating'
import type { CriterionValue } from '@/lib/types'

interface CriterionDef {
  label: string
  key: string
}

interface Props {
  criteria: CriterionDef[]
  values: Record<string, CriterionValue>
  onChange: (values: Record<string, CriterionValue>) => void
}

const inputStyle = {
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 8,
  padding: '8px 12px',
  outline: 'none',
  fontSize: '0.8125rem',
  color: 'white',
  width: '100%',
}

export default function CriteriaRating({ criteria, values, onChange }: Props) {
  function updateRating(key: string, rating: number) {
    onChange({ ...values, [key]: { ...(values[key] ?? {}), rating } })
  }

  function updateReview(key: string, review: string) {
    onChange({ ...values, [key]: { ...(values[key] ?? { rating: 0 }), review: review || undefined } })
  }

  return (
    <div className="flex flex-col gap-4">
      {criteria.map(({ label, key }) => (
        <div key={key}>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.7)' }}>
              {label}
            </span>
            <StarRating
              value={values[key]?.rating ?? 0}
              onChange={v => updateRating(key, v)}
            />
          </div>
          <input
            value={values[key]?.review ?? ''}
            onChange={e => updateReview(key, e.target.value)}
            placeholder={`Ton avis sur ${label.toLowerCase()}... (optionnel)`}
            style={inputStyle}
          />
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Étape 2 — Vérifier la compilation**

```bash
npm run build 2>&1 | grep -E "(error TS|✓ Compiled)" | head -5
```
Attendu : `✓ Compiled successfully`

- [ ] **Étape 3 — Commit**

```bash
git add components/ui/CriteriaRating.tsx
git commit -m "feat: add CriteriaRating component with star + text review per criterion"
```

---

## Task 3 : MediaForm refactor

**Files:**
- Modify: `components/add/MediaForm.tsx`

- [ ] **Étape 1 — Remplacer `components/add/MediaForm.tsx` entièrement par :**

```tsx
'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check } from 'lucide-react'
import CriteriaRating from '@/components/ui/CriteriaRating'
import type { MediaItem, MediaStatus, CriterionValue } from '@/lib/types'

type FormData = Omit<MediaItem, 'id' | 'date_added'>

interface Props {
  initial: Partial<FormData>
  onSubmit: (data: FormData) => Promise<void>
  submitLabel?: string
  wishlist?: boolean
}

const statusOptions: { value: MediaStatus; label: string }[] = [
  { value: 'completed', label: 'Terminé' },
  { value: 'inProgress', label: 'En cours' },
]

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

const inputStyle = {
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 12,
  padding: '12px 16px',
  outline: 'none',
  fontSize: '0.875rem',
  color: 'white',
  width: '100%',
}

export default function MediaForm({ initial, onSubmit, submitLabel = 'Ajouter', wishlist = false }: Props) {
  const [form, setForm] = useState<Partial<FormData>>(initial)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  function update(key: keyof FormData, value: unknown) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title || !form.type) return
    if (!wishlist && !form.status) return
    setLoading(true)
    await onSubmit(form as FormData)
    setDone(true)
    setLoading(false)
  }

  const criteria = form.type ? (CRITERIA[form.type] ?? []) : []

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <input
        value={form.title ?? ''}
        onChange={e => update('title', e.target.value)}
        placeholder="Titre"
        style={inputStyle}
        required
      />

      {criteria.length > 0 && (
        <div>
          <p className="text-xs mb-3" style={{ color: 'rgba(255,255,255,0.4)' }}>Notes</p>
          <CriteriaRating
            criteria={criteria}
            values={(form.ratings_json ?? {}) as Record<string, CriterionValue>}
            onChange={v => update('ratings_json', v)}
          />
        </div>
      )}

      {!wishlist && (
        <div>
          <p className="text-xs mb-2" style={{ color: 'rgba(255,255,255,0.4)' }}>Statut</p>
          <div className="flex flex-wrap gap-2">
            {statusOptions.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => update('status', opt.value)}
                className="px-3 py-1.5 rounded-full text-xs font-medium"
                style={{
                  background: form.status === opt.value ? '#7C3AED' : 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: 'white',
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {form.type === 'movie' && (
        <input
          value={form.director ?? ''}
          onChange={e => update('director', e.target.value || undefined)}
          placeholder="Réalisateur (optionnel)"
          style={inputStyle}
        />
      )}
      {form.type === 'tvshow' && (
        <div className="flex gap-3">
          <input
            type="number"
            value={form.seasons_watched ?? ''}
            onChange={e => update('seasons_watched', parseInt(e.target.value) || undefined)}
            placeholder="Saisons vues"
            style={{ ...inputStyle, flex: 1 }}
          />
          <input
            type="number"
            value={form.total_seasons ?? ''}
            onChange={e => update('total_seasons', parseInt(e.target.value) || undefined)}
            placeholder="Total saisons"
            style={{ ...inputStyle, flex: 1 }}
          />
        </div>
      )}
      {form.type === 'book' && (
        <input
          type="number"
          value={form.pages ?? ''}
          onChange={e => update('pages', parseInt(e.target.value) || undefined)}
          placeholder="Nombre de pages (optionnel)"
          style={inputStyle}
        />
      )}
      {form.type === 'game' && (
        <>
          <input
            value={form.platform ?? ''}
            onChange={e => update('platform', e.target.value || undefined)}
            placeholder="Plateforme (PS5, PC, Switch…)"
            style={inputStyle}
          />
          <input
            value={form.developer ?? ''}
            onChange={e => update('developer', e.target.value || undefined)}
            placeholder="Développeur (optionnel)"
            style={inputStyle}
          />
        </>
      )}

      <textarea
        value={form.notes ?? ''}
        onChange={e => update('notes', e.target.value)}
        placeholder="Notes (optionnel)"
        rows={3}
        style={{ ...inputStyle, resize: 'none' }}
      />

      <motion.button
        type="submit"
        disabled={loading || !form.title || (!wishlist && !form.status)}
        className="py-3 rounded-[12px] font-semibold relative overflow-hidden"
        style={{
          background: '#7C3AED',
          color: 'white',
          opacity: loading || !form.title || (!wishlist && !form.status) ? 0.4 : 1,
        }}
        whileTap={{ scale: 0.97 }}
      >
        <AnimatePresence mode="wait">
          {done ? (
            <motion.span
              key="done"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="flex items-center justify-center gap-2"
            >
              <Check size={18} /> Ajouté !
            </motion.span>
          ) : (
            <motion.span key="label" exit={{ opacity: 0 }}>
              {loading ? '...' : submitLabel}
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>
    </form>
  )
}
```

- [ ] **Étape 2 — Vérifier la compilation**

```bash
npm run build 2>&1 | grep -E "(error TS|✓ Compiled)" | head -5
```
Attendu : `✓ Compiled successfully`

- [ ] **Étape 3 — Lancer les tests**

```bash
npm test -- --no-coverage 2>&1 | tail -10
```
Attendu : tous les tests passent.

- [ ] **Étape 4 — Commit**

```bash
git add components/add/MediaForm.tsx
git commit -m "feat: refactor MediaForm with criteria ratings, reduced statuses, wishlist mode"
```

---

## Task 4 : add/page.tsx — masquer sélecteur + prop wishlist

**Files:**
- Modify: `app/(app)/add/page.tsx`

- [ ] **Étape 1 — Lis le fichier actuel**

```
Read: app/(app)/add/page.tsx
```

- [ ] **Étape 2 — Ajouter l'état `typeFromUrl`**

Après `const [selected, setSelected] = useState<SearchResult | null>(null)` (ligne ~25), ajouter :
```ts
const [typeFromUrl, setTypeFromUrl] = useState(false)
```

- [ ] **Étape 3 — Mettre à jour le `useEffect` de lecture des params**

Localiser le `useEffect` qui lit `searchParams` et modifier la partie `type` :
```ts
const type = searchParams.get('type') as MediaType | null
if (type) {
  setMediaType(type)
  setTypeFromUrl(true)
}
```

- [ ] **Étape 4 — Conditionner le rendu du sélecteur de type**

Localiser le bloc `{/* Type selector */}` et encadrer le `<div className="flex gap-2 mb-4">` avec :
```tsx
{!typeFromUrl && (
  <div className="flex gap-2 mb-4">
    {types.map(t => (
      <button
        key={t.value}
        onClick={() => { setMediaType(t.value); setSelected(null); setResults([]); setQuery('') }}
        className="flex-1 py-2 rounded-[12px] text-sm font-medium"
        style={{
          background: mediaType === t.value ? 'rgba(124,58,237,0.3)' : 'rgba(255,255,255,0.05)',
          border: `1px solid ${mediaType === t.value ? 'rgba(124,58,237,0.5)' : 'rgba(255,255,255,0.1)'}`,
          color: 'white',
        }}
      >
        {t.label}
      </button>
    ))}
  </div>
)}
```

- [ ] **Étape 5 — Passer la prop `wishlist` à `MediaForm`**

Localiser `<MediaForm` dans le rendu et ajouter la prop :
```tsx
<MediaForm
  wishlist={destination === 'wishlist'}
  initial={
    selected
      ? {
          type: mediaType,
          title: selected.title,
          year: selected.year,
          poster_url: selected.poster_url,
          director: selected.director,
          author: selected.author,
          pages: selected.pages,
          total_seasons: selected.total_seasons,
          platform: selected.platform,
          developer: selected.developer,
          status: 'inProgress',
          notes: '',
        }
      : { type: mediaType, status: 'inProgress', notes: '' }
  }
  onSubmit={handleSubmit}
  submitLabel="Ajouter à la bibliothèque"
/>
```

- [ ] **Étape 6 — Vérifier la compilation**

```bash
npm run build 2>&1 | grep -E "(error TS|✓ Compiled)" | head -5
```
Attendu : `✓ Compiled successfully`

- [ ] **Étape 7 — Lancer tous les tests**

```bash
npm test -- --no-coverage 2>&1 | tail -10
```
Attendu : tous les tests passent.

- [ ] **Étape 8 — Commit**

```bash
git add "app/(app)/add/page.tsx"
git commit -m "feat: hide type selector when pre-selected, pass wishlist prop to MediaForm"
```
