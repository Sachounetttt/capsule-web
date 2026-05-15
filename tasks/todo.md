# TODO — capsule-web

> Dernière mise à jour : 2026-05-10 (session 3)

## Contexte projet

**capsule-web** : PWA mobile-first de suivi de médias (films, séries, jeux).

- Stack : Next.js 16 + React 19 + TypeScript + Tailwind 4 + Supabase + Framer Motion
- Auth : PIN-based (`app/(auth)/pin/`) + cookie `capsule_session`
- Backend : Supabase (PostgreSQL hébergé)
- APIs : TMDB (films/séries) + RAWG (jeux)
- PWA : `@ducanh2912/next-pwa`
- Tests : Jest + Testing Library

## Routes existantes

| Route | Description |
|-------|-------------|
| `/` | Home : stats + récents + tendances |
| `/discover` | Découvrir : 5 sections tendances/top |
| `/library` | Bibliothèque filtrée (Film/Série/Jeu) |
| `/wishlist` | Liste de souhaits |
| `/add` | Ajout avec speed dial type (Film · Série · Jeu) |
| `/media/[id]` | Détail + FinishFlow + Delete |
| `/pin` | Auth PIN |

## APIs existantes

- `GET/POST /api/media` — liste et création
- `GET/PUT/DELETE /api/media/[id]` — détail
- `GET /api/search?type=movie|tvshow|game` — recherche externe
- `GET /api/color` — extraction couleur dominante
- `GET /api/export` — export des données
- `GET /api/trending?type=movie|tvshow|game` — tendances (12 items)
- `GET /api/top?type=movie|game` — mieux notés (12 items)
- `GET /api/similar` — suggestions basées sur biblio
- `POST /api/auth` — authentification PIN

## Tâches en cours

_Aucune — en attente des instructions de la session._

## Backlog

- [ ] Déployer sur **Vercel** + configurer les env vars
- [ ] Installer sur **iPhone** via Safari ("Ajouter à l'écran d'accueil")
- [ ] Logo/icône personnalisé (actuellement "C" violet générique)
