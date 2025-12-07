#!/bin/bash
# ============================================================================
# Script de build macOS pour Atelier Vélo+
# ============================================================================
# Usage: ./scripts/build-macos.sh [x64|arm64|both]
# 
# Prérequis:
# - macOS 10.15+ (Catalina ou supérieur)
# - Node.js 18+ et npm
# - Xcode Command Line Tools: xcode-select --install
# ============================================================================

set -e  # Arrêter en cas d'erreur

# Couleurs pour les messages
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}============================================${NC}"
echo -e "${CYAN}  BUILD macOS - Atelier Vélo+${NC}"
echo -e "${CYAN}============================================${NC}"

# Vérifier qu'on est sur macOS
if [[ "$OSTYPE" != "darwin"* ]]; then
    echo -e "${RED}ERREUR: Ce script doit être exécuté sur macOS${NC}"
    exit 1
fi

# Architecture cible
ARCH=${1:-"both"}
echo -e "${YELLOW}Architecture cible: ${ARCH}${NC}"

# Vérifier Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}ERREUR: Node.js n'est pas installé${NC}"
    echo "Installer avec: brew install node"
    exit 1
fi

NODE_VERSION=$(node -v)
echo -e "${GREEN}Node.js: ${NODE_VERSION}${NC}"

# Vérifier npm
NPM_VERSION=$(npm -v)
echo -e "${GREEN}npm: ${NPM_VERSION}${NC}"

# Vérifier Xcode Command Line Tools
if ! xcode-select -p &> /dev/null; then
    echo -e "${YELLOW}Installation de Xcode Command Line Tools...${NC}"
    xcode-select --install
    echo -e "${YELLOW}Relancez ce script après l'installation${NC}"
    exit 1
fi

echo -e "${CYAN}============================================${NC}"
echo -e "${CYAN}  ÉTAPE 1: Installation des dépendances${NC}"
echo -e "${CYAN}============================================${NC}"

# Installer les dépendances
npm ci

echo -e "${CYAN}============================================${NC}"
echo -e "${CYAN}  ÉTAPE 2: Rebuild des binaires natifs${NC}"
echo -e "${CYAN}============================================${NC}"

# Rebuild Prisma et autres binaires natifs pour macOS
echo -e "${YELLOW}Rebuild pour l'architecture actuelle...${NC}"
npm rebuild

# Générer le client Prisma
echo -e "${YELLOW}Génération du client Prisma...${NC}"
npx prisma generate

echo -e "${CYAN}============================================${NC}"
echo -e "${CYAN}  ÉTAPE 3: Build Next.js${NC}"
echo -e "${CYAN}============================================${NC}"

# Build Next.js
npm run build

echo -e "${CYAN}============================================${NC}"
echo -e "${CYAN}  ÉTAPE 4: Préparation Electron${NC}"
echo -e "${CYAN}============================================${NC}"

# Préparer les ressources Electron
if [ -f "prepare-electron-resources.js" ]; then
    node prepare-electron-resources.js
fi

echo -e "${CYAN}============================================${NC}"
echo -e "${CYAN}  ÉTAPE 5: Build Electron pour macOS${NC}"
echo -e "${CYAN}============================================${NC}"

# Build selon l'architecture demandée
case $ARCH in
    "x64")
        echo -e "${YELLOW}Build pour Intel (x64)...${NC}"
        npx electron-builder --mac --x64 -c electron-builder.macos.yml
        ;;
    "arm64")
        echo -e "${YELLOW}Build pour Apple Silicon (arm64)...${NC}"
        npx electron-builder --mac --arm64 -c electron-builder.macos.yml
        ;;
    "both"|*)
        echo -e "${YELLOW}Build pour Intel (x64) ET Apple Silicon (arm64)...${NC}"
        npx electron-builder --mac --x64 --arm64 -c electron-builder.macos.yml
        ;;
esac

echo -e "${CYAN}============================================${NC}"
echo -e "${GREEN}  BUILD TERMINÉ !${NC}"
echo -e "${CYAN}============================================${NC}"

# Afficher les fichiers générés
echo -e "${YELLOW}Fichiers générés:${NC}"
ls -lh dist-electron/*.dmg 2>/dev/null || echo "Pas de DMG trouvé"
ls -lh dist-electron/*.zip 2>/dev/null || echo "Pas de ZIP trouvé"

echo ""
echo -e "${CYAN}============================================${NC}"
echo -e "${CYAN}  INSTRUCTIONS POUR L'UTILISATEUR${NC}"
echo -e "${CYAN}============================================${NC}"
echo ""
echo -e "${YELLOW}Sans signature de code (développement):${NC}"
echo "1. Double-cliquer sur le fichier .dmg"
echo "2. Glisser l'application vers Applications"
echo "3. Au premier lancement, macOS bloquera l'app"
echo "4. Aller dans Préférences Système > Sécurité"
echo "5. Cliquer 'Ouvrir quand même'"
echo ""
echo -e "${GREEN}Fichiers prêts pour distribution !${NC}"
