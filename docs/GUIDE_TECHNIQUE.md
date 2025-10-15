# 🔧 Guide Technique - Atelier Vélo+

**Version**: 2.0  
**Date**: 15 octobre 2025  
**Public**: Développeurs

---

## 📖 Table des Matières

1. [Architecture](#architecture)
2. [Stack Technique](#stack)
3. [Structure Projet](#structure)
4. [Build et Déploiement](#build)
5. [Système de Design](#design)
6. [API et Base de Données](#api)

---

## 🏗️ Architecture {#architecture}

### Vue d'Ensemble

```
Atelier-velo+/
├── apps/
│   ├── web/          # Application Next.js
│   └── desktop/      # Application Electron
├── packages/         # Packages partagés
└── docs/            # Documentation
```

### Monorepo Turborepo

**Avantages**:
- Partage de code entre web et desktop
- Build incrémental
- Cache partagé
- Gestion dépendances centralisée

**Configuration**:
- pnpm workspaces
- Turborepo pour orchestration
- TypeScript strict

---

## 💻 Stack Technique {#stack}

### Frontend

**Framework**: Next.js 14
- App Router
- Server Components
- API Routes
- Force Dynamic (pas de cache)

**UI Library**: Material-UI (MUI) v5
- Composants React
- Theming personnalisé
- Responsive design
- Icons

**State Management**: React Hooks
- useState
- useEffect
- useMemo
- Custom hooks (usePageTheme)

**Styling**: 
- MUI sx prop
- CSS-in-JS
- Thème personnalisé

### Backend

**API**: Next.js API Routes
- RESTful endpoints
- TypeScript
- Validation Zod
- Error handling

**Base de Données**: SQLite + Prisma
- ORM Prisma
- Migrations automatiques
- Type-safe queries
- Seed data

**PDF Generation**: PDFKit
- Génération côté serveur
- Templates personnalisés
- Logos et images

### Desktop

**Framework**: Electron
- Main process (Node.js)
- Renderer process (Next.js)
- IPC communication
- Native menus

**Build**: electron-builder
- NSIS installer (Windows)
- Auto-update (optionnel)
- Code signing (optionnel)

**Tunnel**: Cloudflare Tunnel
- Accès public sécurisé
- Démarrage automatique
- Logs intégrés

---

## 📁 Structure Projet {#structure}

### apps/web/

```
src/
├── app/                    # App Router Next.js
│   ├── tickets/           # Pages tickets
│   │   └── [id]/         # Détail ticket
│   ├── finance/          # Pages finance
│   │   ├── quotes/       # Devis
│   │   ├── invoices/     # Factures
│   │   └── credits/      # Avoirs
│   ├── components/       # Composants partagés
│   │   ├── CustomerCard.tsx
│   │   ├── BikeCard.tsx
│   │   └── FinancialSummaryCard.tsx
│   └── api/             # API Routes
│       └── pos/         # Endpoints POS
├── lib/                 # Utilitaires
│   ├── api.ts          # Client API
│   ├── theme-colors.ts # Système couleurs
│   └── catalog.ts      # Catalogue
├── hooks/              # Custom hooks
│   └── usePageTheme.ts
└── prisma/            # Prisma
    ├── schema.prisma  # Schéma DB
    └── migrations/    # Migrations
```

### apps/desktop/

```
├── main.js            # Main process Electron
├── preload.js         # Preload script
├── package.json       # Config Electron
└── electron-builder.json  # Config build
```

---

## 🏗️ Build et Déploiement {#build}

### Développement

```bash
# Web uniquement
cd apps/web
pnpm dev

# Desktop (Electron + Web)
pnpm desktop

# Tous les packages
pnpm dev
```

### Production

```bash
# Build web
cd apps/web
pnpm build

# Build desktop
pnpm build:desktop

# Output
apps/desktop/dist/Atelier-velo+ Setup 1.0.0.exe
```

### Configuration Build

**electron-builder.json**:
```json
{
  "appId": "com.ateliervelo.app",
  "productName": "Atelier-velo+",
  "directories": {
    "output": "dist"
  },
  "files": [
    "**/*",
    "!node_modules",
    "!src"
  ],
  "win": {
    "target": "nsis",
    "icon": "icon.ico"
  },
  "nsis": {
    "oneClick": false,
    "allowToChangeInstallationDirectory": true
  }
}
```

### Migrations Base de Données

```bash
# Créer migration
pnpm prisma:migrate dev --name nom_migration

# Appliquer migrations
pnpm prisma:migrate deploy

# Seed data
pnpm prisma:seed
```

---

## 🎨 Système de Design {#design}

### Couleurs Thématiques

**Fichier**: `src/lib/theme-colors.ts`

```typescript
export type PageTheme = 'ticket' | 'quote' | 'invoice' | 'credit';

export interface ThemeColors {
  primary: string;
  primaryLight: string;
  primaryDark: string;
  background: string;
  border: string;
  hover: string;
  text: string;
}

export const PAGE_THEMES: Record<PageTheme, ThemeColors> = {
  ticket: {
    primary: '#64B5F6',
    primaryLight: '#E3F2FD',
    primaryDark: '#42A5F5',
    background: '#F5FAFF',
    border: '#BBDEFB',
    hover: '#90CAF9',
    text: '#1976D2',
  },
  // ... autres thèmes
};

export function getPageTheme(theme: PageTheme): ThemeColors {
  return PAGE_THEMES[theme];
}

export function detectThemeFromPath(pathname: string): PageTheme {
  if (pathname.includes('/tickets')) return 'ticket';
  if (pathname.includes('/quotes')) return 'quote';
  if (pathname.includes('/invoices')) return 'invoice';
  if (pathname.includes('/credits')) return 'credit';
  return 'ticket';
}
```

### Hook usePageTheme

**Fichier**: `src/hooks/usePageTheme.ts`

```typescript
"use client";

import { usePathname } from "next/navigation";
import { useMemo } from "react";
import { detectThemeFromPath, getPageTheme, type PageTheme, type ThemeColors } from "@/lib/theme-colors";

export function usePageTheme(overrideTheme?: PageTheme): ThemeColors {
  const pathname = usePathname();

  const theme = useMemo(() => {
    if (overrideTheme) return overrideTheme;
    return detectThemeFromPath(pathname);
  }, [pathname, overrideTheme]);

  return getPageTheme(theme);
}
```

### Utilisation

```typescript
import { usePageTheme } from "@/hooks/usePageTheme";

export default function MyPage() {
  const theme = usePageTheme('ticket');

  return (
    <Box sx={{ 
      bgcolor: theme.background,
      borderColor: theme.border,
      border: 2
    }}>
      <Button sx={{
        bgcolor: theme.primary,
        '&:hover': {
          bgcolor: theme.primaryDark
        }
      }}>
        Action
      </Button>
    </Box>
  );
}
```

### Composants Réutilisables

**CustomerCard**:
```typescript
interface CustomerCardProps {
  customer: {
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
  };
  elevation?: number;
}
```

**BikeCard**:
```typescript
interface BikeCardProps {
  bike: {
    brand: string;
    model: string;
    serialNumber?: string;
  };
  elevation?: number;
}
```

**FinancialSummaryCard**:
```typescript
interface FinancialSummaryCardProps {
  totals: {
    totalHT: number;
    totalTVA: number;
    totalTTC: number;
  };
  isAutoEntrepreneur: boolean;
  elevation?: number;
  highlighted?: boolean;
}
```

---

## 🔌 API et Base de Données {#api}

### Schéma Prisma

**Principales entités**:

```prisma
model Customer {
  id        String   @id @default(cuid())
  firstName String
  lastName  String
  email     String?
  phone     String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  bikes       Bike[]
  workOrders  WorkOrder[]
}

model Bike {
  id           String   @id @default(cuid())
  brand        String
  model        String
  serialNumber String?
  customerId   String
  customer     Customer @relation(fields: [customerId], references: [id])
  
  workOrders WorkOrder[]
}

model WorkOrder {
  id          String   @id @default(cuid())
  number      String   @unique
  status      String   @default("draft")
  customerId  String
  bikeId      String?
  createdAt   DateTime @default(now())
  
  customer Customer @relation(fields: [customerId], references: [id])
  bike     Bike?    @relation(fields: [bikeId], references: [id])
  lines    WorkOrderLine[]
}

model Invoice {
  id          String   @id @default(cuid())
  number      String?  @unique
  type        String   // "quote", "invoice", "credit"
  status      String   @default("draft")
  issueDate   DateTime?
  dueDate     DateTime?
  totalHT     Float    @default(0)
  totalTTC    Float    @default(0)
  
  lines InvoiceLine[]
}
```

### Endpoints API

**Tickets**:
- `GET /api/pos/workorders` - Liste
- `GET /api/pos/workorders/:id` - Détail
- `POST /api/pos/workorders` - Créer
- `PUT /api/pos/workorders/:id` - Modifier
- `DELETE /api/pos/workorders/:id` - Supprimer

**Finance**:
- `GET /api/invoices` - Liste
- `GET /api/invoices/:id` - Détail
- `POST /api/invoices` - Créer
- `PUT /api/invoices/:id` - Modifier
- `GET /api/invoices/:id/pdf` - Générer PDF

**Catalogue**:
- `GET /api/catalog/services` - Prestations
- `GET /api/catalog/parts` - Pièces
- `GET /api/catalog/bikes` - Vélos

### Client API

**Fichier**: `src/lib/api.ts`

```typescript
export async function getWorkOrder(id: string): Promise<WorkOrder> {
  const res = await fetch(`/api/pos/workorders/${id}`);
  if (!res.ok) throw new Error('Failed to fetch');
  return res.json();
}

export async function updateWorkOrder(
  id: string, 
  data: Partial<WorkOrder>
): Promise<WorkOrder> {
  const res = await fetch(`/api/pos/workorders/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update');
  return res.json();
}
```

---

## 🧪 Tests

### Structure

```
apps/web/
└── __tests__/
    ├── components/
    ├── pages/
    └── api/
```

### Commandes

```bash
# Tests unitaires
pnpm test

# Tests E2E
pnpm test:e2e

# Coverage
pnpm test:coverage
```

---

## 📊 Performance

### Optimisations

**Code Splitting**:
- Dynamic imports
- Lazy loading composants
- Route-based splitting

**Bundle Size**:
- Tree shaking
- Minification
- Compression

**Caching**:
- SWR pour données
- Memoization composants
- Service Worker (optionnel)

### Métriques

- First Contentful Paint: <1s
- Time to Interactive: <2s
- Bundle size: <500KB (gzipped)

---

## 🔒 Sécurité

### Bonnes Pratiques

**Frontend**:
- Validation inputs
- Sanitization données
- CSRF protection
- XSS prevention

**Backend**:
- Validation Zod
- Rate limiting
- SQL injection prevention (Prisma)
- Error handling

**Electron**:
- Context isolation
- Node integration disabled
- Preload script sécurisé

---

## 📝 Contribution

### Workflow

1. Fork projet
2. Créer branche (`git checkout -b feature/nom`)
3. Commit (`git commit -m 'feat: description'`)
4. Push (`git push origin feature/nom`)
5. Pull Request

### Conventions

**Commits**: Conventional Commits
- `feat:` Nouvelle fonctionnalité
- `fix:` Correction bug
- `docs:` Documentation
- `style:` Formatage
- `refactor:` Refactoring
- `test:` Tests
- `chore:` Maintenance

**Code**:
- TypeScript strict
- ESLint + Prettier
- Commentaires JSDoc
- Tests unitaires

---

## 🎓 Ressources

### Documentation

- [Next.js](https://nextjs.org/docs)
- [Electron](https://www.electronjs.org/docs)
- [Prisma](https://www.prisma.io/docs)
- [MUI](https://mui.com/)
- [Turborepo](https://turbo.build/repo/docs)

### Outils

- [VS Code](https://code.visualstudio.com/)
- [Prisma Studio](https://www.prisma.io/studio)
- [React DevTools](https://react.dev/learn/react-developer-tools)
- [Electron DevTools](https://www.electronjs.org/docs/latest/tutorial/devtools-extension)

---

**Version**: 2.0  
**Dernière mise à jour**: 15 octobre 2025  
**Auteur**: Jérôme Leyssard - Upgraded Bikes

© 2024-2025 Tous droits réservés
