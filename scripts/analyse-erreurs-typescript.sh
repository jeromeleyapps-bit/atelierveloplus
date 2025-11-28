#!/bin/bash

# Script d'analyse des erreurs TypeScript
# Analyse les erreurs par type et pattern pour identifier les corrections à faire

echo "🔍 Analyse des erreurs TypeScript..."
echo ""

# Compter le total d'erreurs
TOTAL=$(npm run typecheck 2>&1 | grep -c "error TS")
echo "📊 Total d'erreurs TypeScript: $TOTAL"
echo ""

# Analyser par code d'erreur
echo "📋 Répartition par code d'erreur:"
npm run typecheck 2>&1 | grep "error TS" | sed 's/.*error TS\([0-9]*\).*/\1/' | sort | uniq -c | sort -rn | head -10
echo ""

# Analyser les erreurs logger spécifiques
echo "📋 Erreurs liées aux appels logger:"
npm run typecheck 2>&1 | grep "error TS2345.*logger" | wc -l | xargs echo "  - TS2345 (logger signatures):"
npm run typecheck 2>&1 | grep "error TS" | grep -i "logger\." | wc -l | xargs echo "  - Total erreurs logger:"
echo ""

# Extraire les fichiers avec erreurs logger
echo "📁 Fichiers avec erreurs logger (top 10):"
npm run typecheck 2>&1 | grep "error TS.*logger" | sed 's/^src\/\([^:]*\).*/\1/' | sort | uniq -c | sort -rn | head -10
echo ""

# Analyser les patterns d'erreurs
echo "🔍 Patterns d'erreurs détectés:"
echo "  - logger.error/info/warn avec string au lieu de LogMeta:"
npm run typecheck 2>&1 | grep "error TS2345" | grep -E "logger\.(error|info|warn|debug)" | grep -c "string\|Error" | xargs echo "    Nombre:"

