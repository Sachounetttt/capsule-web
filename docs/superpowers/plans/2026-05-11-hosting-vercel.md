# Hébergement Vercel — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Déployer capsule-web sur Vercel (tier gratuit) et le rendre accessible depuis internet.

**Architecture:** Next.js hébergé sur Vercel (serverless), Supabase déjà hébergé en Free tier. Les variables d'environnement sont copiées depuis `.env.local` vers le dashboard Vercel. Aucune modification de code nécessaire.

**Tech Stack:** Next.js 16, Vercel CLI (optionnel), Supabase, GitHub

---

### Task 1 : Sécuriser les secrets — créer .gitignore et retirer .env.local du tracking

> ⚠️ `.env.local` est actuellement tracké par git. Il contient des clés API et des secrets. À corriger AVANT tout push.

**Files:**
- Create: `.gitignore`
- Remove from tracking: `.env.local`

- [ ] **Step 1 : Créer `.gitignore`**

Créer le fichier `.gitignore` à la racine du projet avec ce contenu :

```gitignore
# Dépendances
node_modules/

# Build Next.js
.next/
out/

# Secrets et variables locales
.env.local
.env.*.local
.env

# Logs
*.log
npm-debug.log*

# OS
.DS_Store
Thumbs.db

# IDE
.idea/
.vscode/

# TypeScript
tsconfig.tsbuildinfo
```

- [ ] **Step 2 : Retirer `.env.local` du tracking git**

```bash
git rm --cached .env.local
```

Résultat attendu :
```
rm '.env.local'
```

- [ ] **Step 3 : Vérifier que `.env.local` n'apparaît plus comme tracké**

```bash
git status
```

Résultat attendu : `.env.local` apparaît dans "Untracked files" (ou n'apparaît pas du tout), PAS dans "Changes to be committed".

- [ ] **Step 4 : Commiter**

```bash
git add .gitignore
git commit -m "chore: add .gitignore and untrack .env.local"
```

---

### Task 2 : Commiter les fichiers modifiés en cours

**Files:**
- Modify: `app/api/top/route.ts`, `app/api/trending/route.ts`, `components/add/SearchResults.tsx`, `components/detail/FinishFlow.tsx`

- [ ] **Step 1 : Vérifier les modifications en cours**

```bash
git diff --stat
```

Note : `.env.local` ne doit PAS apparaître ici (retiré en Task 1).

- [ ] **Step 2 : Commiter les 4 fichiers modifiés**

```bash
git add app/api/top/route.ts app/api/trending/route.ts components/add/SearchResults.tsx components/detail/FinishFlow.tsx
git commit -m "feat: update api routes and components"
```

- [ ] **Step 3 : Vérifier que le working tree est propre**

```bash
git status
```

Résultat attendu : `nothing to commit, working tree clean` (hors fichiers non-trackés comme `.next/`, `node_modules/`)

---

### Task 3 : Vérifier que le build passe

- [ ] **Step 1 : Lancer le build**

```bash
npm run build
```

Résultat attendu : build termine sans erreur. Les warnings sont OK. Les erreurs TypeScript ou d'import font échouer le déploiement.

- [ ] **Step 2 : Si le build échoue, corriger les erreurs**

Lire les messages d'erreur, corriger les fichiers concernés, relancer `npm run build` jusqu'à succès.

---

### Task 4 : Merger feat/social-friends → main

- [ ] **Step 1 : Basculer sur main**

```bash
git checkout main
```

- [ ] **Step 2 : Merger la branche feature**

```bash
git merge feat/social-friends
```

Résultat attendu : merge réussi sans conflit (les deux branches n'ont pas divergé).

- [ ] **Step 3 : Vérifier l'état**

```bash
git log --oneline -5
```

Les commits de `feat/social-friends` doivent apparaître sur `main`.

- [ ] **Step 4 : Pousser sur GitHub**

```bash
git push origin main
```

Vercel détecte le push et déclenche un déploiement automatique.

---

### Task 5 : Créer le projet sur Vercel et connecter le repo (manuel)

> Cette tâche se fait dans le navigateur.

- [ ] **Step 1 : Créer un compte Vercel**

Aller sur [vercel.com](https://vercel.com) → "Sign Up" → choisir "Continue with GitHub"

- [ ] **Step 2 : Importer le projet**

Dashboard Vercel → "Add New..." → "Project" → sélectionner le repo `capsule-web`

- [ ] **Step 3 : Vérifier la config de build détectée**

Vercel devrait détecter automatiquement :
- Framework Preset : **Next.js**
- Build Command : `next build`
- Output Directory : `.next`
- Install Command : `npm install`

Ne rien changer. Cliquer "Deploy" — le premier déploiement **va échouer** (variables d'env manquantes), c'est normal.

---

### Task 6 : Configurer les variables d'environnement sur Vercel (manuel)

> Dashboard Vercel → ton projet → Settings → Environment Variables

- [ ] **Step 1 : Ajouter les 8 variables**

Copier les valeurs depuis ton `.env.local` local :

| Nom | Environnements |
|-----|----------------|
| `SUPABASE_URL` | Production, Preview, Development |
| `SUPABASE_SERVICE_ROLE_KEY` | Production, Preview, Development |
| `NEXT_PUBLIC_SUPABASE_URL` | Production, Preview, Development |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Production, Preview, Development |
| `TMDB_API_KEY` | Production, Preview, Development |
| `RAWG_API_KEY` | Production, Preview, Development |
| `PIN_SALT` | Production, Preview, Development |
| `CAPSULE_SESSION_SECRET` | Production, Preview, Development |

- [ ] **Step 2 : Redéployer**

Dashboard Vercel → ton projet → Deployments → "..." sur le dernier déploiement → "Redeploy"

Ou pousser un commit vide :
```bash
git commit --allow-empty -m "chore: trigger redeploy"
git push origin main
```

- [ ] **Step 3 : Vérifier que le déploiement réussit**

Dans l'onglet "Deployments", le statut doit passer à ✅ "Ready". En cas d'erreur, lire les logs de build.

- [ ] **Step 4 : Récupérer l'URL de production**

L'URL ressemble à `https://capsule-web-xxx.vercel.app`. La noter — elle est nécessaire pour la Task 7.

---

### Task 7 : Configurer Supabase pour autoriser l'URL Vercel (manuel)

> Dashboard Supabase → ton projet → Authentication → URL Configuration

- [ ] **Step 1 : Mettre à jour Site URL**

Remplacer la valeur actuelle par l'URL Vercel :
```
https://capsule-web-xxx.vercel.app
```

- [ ] **Step 2 : Ajouter aux Redirect URLs**

Dans la liste "Redirect URLs", ajouter :
```
https://capsule-web-xxx.vercel.app/**
```

- [ ] **Step 3 : Sauvegarder**

Cliquer "Save".

---

### Task 8 : Vérifier l'application déployée

- [ ] **Step 1 : Ouvrir l'URL Vercel dans le navigateur**

Ouvrir `https://capsule-web-xxx.vercel.app`

- [ ] **Step 2 : Tester le PIN**

La page `/pin` doit s'afficher. Entrer le PIN → doit rediriger vers la home.

- [ ] **Step 3 : Tester les pages principales**

Vérifier que ces routes répondent sans erreur :
- `/` — Home (stats, récents, tendances)
- `/library` — Bibliothèque
- `/wishlist` — Liste de souhaits
- `/discover` — Découvrir
- `/friends` — Amis (feature de la branche)
- `/profile` — Profil

- [ ] **Step 4 : Tester l'ajout d'un média**

`/add` → rechercher un film → l'ajouter → vérifier qu'il apparaît dans `/library`

---

### Task 9 : Installer la PWA sur iPhone (manuel)

- [ ] **Step 1 : Ouvrir l'URL dans Safari sur iPhone**

Safari est obligatoire pour l'installation PWA sur iOS.

- [ ] **Step 2 : Installer**

Icône de partage (rectangle avec flèche) → "Sur l'écran d'accueil" → "Ajouter"

- [ ] **Step 3 : Vérifier**

L'icône capsule-web doit apparaître sur l'écran d'accueil. L'ouvrir — doit se lancer en mode plein écran (sans barre Safari).

---

### Task 10 : Partager l'URL avec les proches

- [ ] **Step 1 : Envoyer l'URL**

Partager `https://capsule-web-xxx.vercel.app` avec les proches concernés.

- [ ] **Step 2 : Leur communiquer le PIN**

L'app est protégée par PIN — leur envoyer le PIN séparément (pas dans le même message que l'URL).

- [ ] **Step 3 : Mettre à jour todo.md**

Dans `tasks/todo.md`, déplacer "Déployer sur Vercel" du Backlog vers ✅ Terminé.
