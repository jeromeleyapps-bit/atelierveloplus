# Atelier Vélo – Monorepo

Monorepo pour l'application atelier/boutique vélo.

- Front: `apps/web` (Next.js + TypeScript, MUI, PWA light)
- API: `apps/api` (NestJS + TypeScript, Prisma, PostgreSQL)
- DB: PostgreSQL (local)
- Comms: HubSpot (emails) [optionnel]
- Paiements: Stripe/SumUp [à implémenter]
  
Note: le module "Métriques/Supabase" a été retiré.

## Pré-requis
- Node.js >= 18 (OK)
- npm (OK)
- Git (OK)
- Docker Desktop (OK)
- Compte Supabase (pour le stockage des métriques)

## Démarrage (dev)
1. Installer les dépendances:
   ```bash
   npm install
   ```
2. Configurer les variables d'environnement:
   - `apps/api/.env`
     ```
     DATABASE_URL=postgresql://postgres:postgres@localhost:5432/atelier
     PORT=3001
     API_PREFIX=/api
     ```
   - `apps/web/.env.local`
     ```
     NEXT_PUBLIC_API_BASE_URL=http://localhost:3001/api
     NEXT_PUBLIC_CALCOM_EMBED_URL=https://cal.com/your-link?embed=1
     ```
3. Base de données (Prisma):
   ```bash
   npx --workspace apps/api prisma migrate dev -n init
   npx --workspace apps/api prisma generate
   ```
4. Lancer:
   ```bash
   npm run -w apps/api start:dev   # API http://localhost:3001/api
   npm run -w apps/web dev         # Web http://localhost:3000
   ```

## Intégrations

### HubSpot
- Configuration des clés OAuth/Private App
- Scopes CRM + Automation
- Workflows pour les emails et SMS (via l'app SMS HubSpot Sakari)
- Notifications pour les réparations prêtes et les pièces arrivées

### Paiements
- **Stripe Terminal**: 
  - Configuration des secrets API
  - Appairage des terminaux
  - Mode test disponible
- **SumUp**: 
  - Configuration des identifiants API
  - Stockage des `transaction_id` pour réconciliation

## Authentification
- Inscription: `/auth/register` (email, prénom, nom, mot de passe, nom de magasin, auto-entrepreneur)
- Connexion: `/auth/login`
- Le front envoie `x-user-id`/`x-user-email` à l'API après login.

## Multi-tenancy
- `ownerId` sur `Customer`, `Bike`, `WorkOrder`, `Unavailability`, `Sale`.
- Middleware Nest lit les en-têtes côté API.
- Services/Contrôleurs filtrent et créent avec `ownerId`.

## Pages
- `/dashboard`, `/customers`, `/tickets`, `/tickets/[id]`, `/calendar`, `/calendar/client`, `/stats`, `/admin`, `/account`.

## POS
- `POST /api/pos/workorders/:id/sale` crée une `Sale` (scopée par `ownerId`).
- `GET /api/pos/workorders/:id/quote`, `GET /api/pos/sales/:id/invoice.pdf` (scopés owner).

## Sécurité & conformité
- Piste d'audit append-only pour les exigences anti-fraude TVA
- Attestation éditeur en cible MVP2; option NF525 à évaluer
- Collecte de données anonymisées pour le suivi des performances
- Conformité RGPD pour la collecte des données utilisateur

## Qualité & outils
```bash
npm run -w apps/web lint
npx prettier -w apps/web apps/api
```
