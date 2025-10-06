# Atelier Vélo+ 🚴

Application de gestion d'atelier vélo complète avec facturation, stock, et CRM.

## 🚀 Démarrage rapide

### Prérequis

- Node.js 18+ et pnpm (ou npm/yarn)
- PostgreSQL 14+ (ou SQLite pour dev local)

### Installation

```bash
# Installer les dépendances
pnpm install

# Copier le fichier d'environnement
cp .env.example .env

# Éditer .env et configurer DATABASE_URL

# Générer le client Prisma et migrer la DB
pnpm db:generate
pnpm db:migrate

# Créer le premier utilisateur admin
npx ts-node scripts/create-admin.ts

# Lancer l'application
pnpm dev
```

L'application sera disponible sur [http://localhost:3000](http://localhost:3000)

## 📚 Documentation

- **[Guide de migration PostgreSQL](./MIGRATION_GUIDE.md)** : Passer de SQLite à PostgreSQL
- **[Variables d'environnement](./.env.example)** : Configuration complète

## 🧪 Tests

```bash
# Lancer les tests
pnpm test

# Tests avec interface UI
pnpm test:ui

# Coverage
pnpm test:coverage
```

## 🗄️ Base de données

```bash
# Créer une nouvelle migration
pnpm db:migrate

# Générer le client Prisma
pnpm db:generate

# Ouvrir Prisma Studio (UI pour explorer la DB)
pnpm db:studio

# Vérifier la connexion DB
npx ts-node scripts/check-db.ts
```

## 🔐 Authentification

L'application utilise **NextAuth.js v5** avec support de :
- Email + mot de passe (credentials)
- OAuth Google (optionnel)
- Gestion des rôles : `admin`, `technician`, `accountant`, `user`

### Créer un utilisateur

```bash
npx ts-node scripts/create-admin.ts
```

### Rôles et permissions

- **admin** : Accès complet à toutes les fonctionnalités
- **technician** : Gestion des tickets, pièces, main d'œuvre
- **accountant** : Gestion des factures, devis, paiements
- **user** : Accès en lecture seule

## 📦 Structure du projet

```
apps/web/
├── src/
│   ├── app/                 # Pages Next.js (App Router)
│   │   ├── api/            # API routes
│   │   ├── tickets/        # Gestion des tickets
│   │   ├── finance/        # Factures et devis
│   │   ├── catalog/        # Catalogue et stock
│   │   └── customers/      # Clients
│   ├── components/         # Composants React réutilisables
│   ├── hooks/              # Custom hooks
│   ├── lib/                # Utilitaires et helpers
│   │   ├── api.ts         # Client API
│   │   ├── auth.ts        # Configuration NextAuth
│   │   ├── db.ts          # Client Prisma
│   │   └── validations.ts # Schémas Zod
│   └── theme/              # Configuration MUI
├── prisma/
│   └── schema.prisma       # Schéma de base de données
├── scripts/                # Scripts utilitaires
└── tests/                  # Tests Vitest
```

## 🛠️ Stack technique

- **Framework** : Next.js 14 (App Router)
- **UI** : Material-UI (MUI) v5
- **Base de données** : PostgreSQL + Prisma ORM
- **Authentification** : NextAuth.js v5
- **Validation** : Zod
- **Tests** : Vitest
- **Email** : Nodemailer (+ Resend pour production)
- **PDF** : pdf-lib

## 📋 Fonctionnalités

### ✅ Implémenté (Sprint 1)

- [x] Gestion des tickets (work orders)
  - [x] Types : révision, réparation, entretien, upgrade
  - [x] Workflow : créé → en cours → prêt → livré
  - [x] Gestion des pièces avec recherche catalogue
  - [x] Édition inline des pièces
- [x] Authentification sécurisée avec rôles
- [x] Validation des entrées (Zod)
- [x] Migration PostgreSQL
- [x] Tests unitaires

### 🚧 En cours (Sprint 2)

- [ ] Numérotation automatique des factures
- [ ] Génération PDF factures conformes
- [ ] Envoi email factures
- [ ] Gestion des avoirs

### 📅 Roadmap

**Sprint 3** : Vélos & Planning
- Gestion complète des vélos clients
- Calendrier de planning
- Intégration HubSpot bidirectionnelle

**Sprint 4** : Stock & Fournisseurs
- Alertes de réapprovisionnement
- Commandes fournisseurs
- Inventaire

**Sprint 5** : CRM & Reporting
- Fiche client enrichie
- Dashboard KPIs
- Exports Excel

**Sprint 6** : Production
- Déploiement
- Monitoring (Sentry)
- Documentation utilisateur

## 🔧 Scripts disponibles

```bash
pnpm dev              # Lancer en mode développement
pnpm build            # Build pour production
pnpm start            # Lancer en production
pnpm lint             # Linter
pnpm test             # Tests
pnpm db:migrate       # Migrer la base de données
pnpm db:generate      # Générer le client Prisma
pnpm db:studio        # Ouvrir Prisma Studio
```

## 🌍 Déploiement

### Vercel (recommandé)

1. Pusher le code sur GitHub
2. Importer le projet sur [vercel.com](https://vercel.com)
3. Configurer les variables d'environnement
4. Déployer

### Autres plateformes

- **Railway** : Support PostgreSQL intégré
- **Render** : Free tier disponible
- **AWS / GCP / Azure** : Via Docker

## 📝 Licence

ISC

## 🤝 Contribution

Les contributions sont les bienvenues ! Merci de :
1. Fork le projet
2. Créer une branche (`git checkout -b feature/AmazingFeature`)
3. Commit vos changements (`git commit -m 'Add AmazingFeature'`)
4. Push (`git push origin feature/AmazingFeature`)
5. Ouvrir une Pull Request

## 📧 Support

Pour toute question : ouvrir une issue GitHub

---

**Fait avec ❤️ pour les ateliers vélo**
