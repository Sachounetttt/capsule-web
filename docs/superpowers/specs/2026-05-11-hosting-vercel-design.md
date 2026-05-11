# Spec — Hébergement sur Vercel

**Date :** 2026-05-11
**Statut :** Approuvé

## Objectif

Déployer capsule-web sur Vercel (tier gratuit) pour le rendre accessible depuis internet à quelques proches, avec support PWA pour installation sur iPhone.

## Architecture

```
Vercel Hobby (gratuit)
  ├── Frontend Next.js (SSR + Static)
  └── API Routes (serverless, timeout 10s)
         ↓
Supabase Free (déjà hébergé)
  └── PostgreSQL — médias, users, friends
```

Pas de nouvelle infrastructure à créer. Supabase tourne déjà ; Vercel se connecte dessus via les variables d'environnement.

## Variables d'environnement

À configurer dans le dashboard Vercel (Settings → Environment Variables) :

| Variable | Source | Visibilité |
|---|---|---|
| `SUPABASE_URL` | Dashboard Supabase | Serveur uniquement |
| `SUPABASE_SERVICE_ROLE_KEY` | Dashboard Supabase | Serveur uniquement |
| `NEXT_PUBLIC_SUPABASE_URL` | Dashboard Supabase | Public (navigateur) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Dashboard Supabase | Public (navigateur) |
| `TMDB_API_KEY` | themoviedb.org | Serveur uniquement |
| `RAWG_API_KEY` | rawg.io | Serveur uniquement |
| `PIN_SALT` | `.env.local` actuel | Serveur uniquement |
| `CAPSULE_SESSION_SECRET` | `.env.local` actuel | Serveur uniquement |

## Étapes de déploiement

### 1. Préparer la branche
- Commiter les fichiers modifiés en cours (`api/top`, `api/trending`, `SearchResults`, `FinishFlow`, `.env.local` exclu)
- Merger `feat/social-friends` → `main`

### 2. Créer le projet Vercel
- Créer un compte sur vercel.com (GitHub login recommandé)
- "Add New Project" → importer le repo GitHub `capsule-web`
- Framework détecté automatiquement : Next.js
- Build command : `next build` (défaut)
- Output directory : `.next` (défaut)

### 3. Configurer les variables d'environnement
- Copier les 8 variables depuis `.env.local` dans le dashboard Vercel
- S'assurer que les variables `NEXT_PUBLIC_*` sont marquées comme "exposed to browser"

### 4. Configurer Supabase
- Dashboard Supabase → Authentication → URL Configuration
- Ajouter l'URL Vercel dans **Site URL** : `https://capsule-web-xxx.vercel.app`
- Ajouter la même URL dans **Redirect URLs**

### 5. Déployer et vérifier
- Premier déploiement automatique au push sur `main`
- Vérifier : page PIN, home, bibliothèque, amis
- Tester PWA sur iPhone : Safari → partager → "Sur l'écran d'accueil"

## Limitations tier gratuit

| Limite | Valeur | Impact |
|---|---|---|
| Bandwidth Vercel | 100 GB/mois | Négligeable pour usage perso |
| Timeout serverless | 10s | OK pour toutes les routes actuelles |
| Supabase DB | 500 MB | Très large |
| **Supabase pause** | Après 7j inactivité | Première visite lente (~30s) si app non utilisée 1 semaine |

## URL

Format : `https://capsule-web-[hash].vercel.app` — partageable directement avec les proches.
Domaine custom possible gratuitement plus tard si besoin.
