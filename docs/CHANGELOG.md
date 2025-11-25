# 📋 Changelog - Atelier Vélo+

Toutes les modifications notables du projet sont documentées dans ce fichier.

---

## [2.0.0] - 15 Octobre 2025

### 🎨 Harmonisation Complète Interface

**Redesign majeur de toutes les pages**:
- Page Ticket: Grid 8/4, couleur bleue, -58% code
- Page Devis: Grid 8/4, couleur violette, -64% code
- Page Factures: Grid 8/4, couleur verte, -64% code
- Page Avoirs: Grid 8/4, couleur orange, -64% code

**Système de couleurs thématiques**:
- 4 palettes pastels distinctes
- Détection automatique du type de page
- Hook React `usePageTheme`
- Fichier centralisé `theme-colors.ts`

**Composants réutilisables**:
- CustomerCard
- BikeCard
- FinancialSummaryCard
- LineItemsTable
- LineItemSelector
- AppointmentPicker

**Statistiques**:
- Réduction code: -63% (4244 → 1590 lignes)
- Composants réutilisés: 6
- Documentation: 9 fichiers MD
- Commits: 12

### 🔧 Corrections et Améliorations

**Tunnel Cloudflare**:
- Auto-start automatique au démarrage
- Permet aux clients de prendre RDV en ligne
- Logs améliorés

**Page RDV Clients**:
- Texte samedi modifié: "RDV à confirmer au 0768184875"

**Corrections bugs**:
- Erreur `documentColor` page facture
- Fichier `page.tsx` manquant
- Problèmes de renommage fichiers

### 📚 Documentation

**Nouveaux fichiers**:
- GUIDE_COMPLET.md - Guide utilisateur complet
- GUIDE_TECHNIQUE.md - Guide développeur
- CHANGELOG.md - Ce fichier
- HARMONISATION_COMPLETE.md - Résumé harmonisation
- THEME_COLORS_GUIDE.md - Guide couleurs
- SESSION_COMPLETE_15OCT2025.md - Résumé session

**Nettoyage**:
- Suppression fichiers obsolètes
- Organisation par thèmes
- Compilation documentation

---

## [1.5.0] - 14 Octobre 2025

### ✨ Intégration Prestations et Pièces

**Catalogue complet**:
- Prestations prédéfinies avec tarifs
- Pièces avec gestion stock
- Vélos neufs et occasions
- Catégories et recherche

**Gestion stock**:
- Mouvements de stock
- Alertes stock bas
- Prix d'achat et vente
- Calcul marges automatique

**Intégration tickets**:
- Ajout prestations/pièces depuis catalogue
- Calculs automatiques
- Historique complet

### 🔧 Corrections

**Build Electron**:
- Résolution erreurs compilation
- Optimisation taille bundle
- Configuration NSIS améliorée

**Base de données**:
- Migrations Prisma
- Seed data complet
- Relations optimisées

---

## [1.0.0] - Octobre 2024

### 🎉 Version Initiale

**Fonctionnalités de base**:
- Gestion clients
- Gestion vélos
- Tickets/Ordres de travail
- Devis (PDF)
- Factures (PDF)
- Avoirs (PDF)

**Interface**:
- Material-UI
- Pages CRUD complètes
- Recherche et filtres

**Technique**:
- Next.js 14
- Electron
- Prisma + SQLite
- TypeScript

---

## Types de Changements

- `Added` - Nouvelles fonctionnalités
- `Changed` - Modifications fonctionnalités existantes
- `Deprecated` - Fonctionnalités bientôt supprimées
- `Removed` - Fonctionnalités supprimées
- `Fixed` - Corrections de bugs
- `Security` - Corrections sécurité

---

**Format**: [Keep a Changelog](https://keepachangelog.com/)  
**Versioning**: [Semantic Versioning](https://semver.org/)

© 2024-2025 Jérôme Leyssard - Upgraded Bikes
