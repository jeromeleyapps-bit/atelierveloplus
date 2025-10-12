# Procédure de Build - Atelier Vélo+

## Prérequis

- **Node.js v20.18.0** (LTS recommandé)
- **pnpm** installé globalement
- **PowerShell** en mode administrateur

## Vérification de l'environnement

```powershell
# Vérifier la version de Node.js
node -v  # Doit afficher v20.18.0

# Si version différente, installer Node 20.18.0
nvm install 20.18.0
nvm use 20.18.0
```

## Procédure de Build Manuelle

### 1. Préparation de l'environnement

```powershell
# Se placer dans le répertoire web
cd C:\Users\j_ley\Atelier-velo+\apps\web

# Vérifier la version de Node
node -v
```

### 2. Nettoyage

```powershell
# Supprimer les anciens fichiers
Remove-Item node_modules -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item nm_old -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item package-lock.json -Force -ErrorAction SilentlyContinue
```

### 3. Installation des dépendances

```powershell
# Installer les dépendances
pnpm install --force
```

### 4. Génération du client Prisma

```powershell
# Générer le client Prisma
pnpm prisma generate
```

### 5. Build Next.js

```powershell
# Builder l'application Next.js
pnpm build
```

### 6. Build Electron

```powershell
# Se placer dans le répertoire desktop
cd C:\Users\j_ley\Atelier-velo+\apps\desktop

# Builder l'application Electron
npm run build
```

## Procédure Automatisée

Utilisez le script PowerShell `build-app.ps1` pour automatiser toutes ces étapes :

```powershell
# Exécuter le script de build automatique
.\build-app.ps1
```

## Résolution des problèmes courants

### Erreur "Cannot find module 'next'"

**Cause :** Les dépendances ne sont pas correctement installées.

**Solution :**
```powershell
cd C:\Users\j_ley\Atelier-velo+\apps\web
Remove-Item node_modules -Recurse -Force
pnpm install --force
pnpm build
```

### Erreur "ELIFECYCLE"

**Cause :** Mauvaise version de Node.js ou processus en cours d'exécution.

**Solution :**
```powershell
# Vérifier la version de Node
node -v

# Si différent de v20.18.0
nvm use 20.18.0

# Arrêter tous les processus Node/Electron
Get-Process | Where-Object {$_.ProcessName -like "*Atelier*"} | Stop-Process -Force
Get-Process | Where-Object {$_.ProcessName -eq "node"} | Stop-Process -Force
```

### Erreur "workOrderId must not be null"

**Cause :** Le schéma Prisma n'a pas été régénéré après modification.

**Solution :**
```powershell
cd C:\Users\j_ley\Atelier-velo+\apps\web
pnpm prisma generate
pnpm build
```

### Erreur "mode: insensitive not supported"

**Cause :** SQLite ne supporte pas le mode insensitive pour les recherches.

**Solution :** Cette erreur a été corrigée dans le code. Assurez-vous d'avoir la dernière version.

### Chemins trop longs (Windows)

**Cause :** Limitation Windows de 260 caractères.

**Solution :**
```powershell
# Renommer au lieu de supprimer
Rename-Item node_modules nm_old -ErrorAction SilentlyContinue
```

## Modifications récentes appliquées

### Corrections de bugs
1. ✅ `workOrderId` optionnel dans le schéma Prisma
2. ✅ Stats CA corrigées (utilise la période sélectionnée)
3. ✅ Session effacée au démarrage (force le login)
4. ✅ Fix recherche SQLite (suppression de `mode: insensitive`)

### Nouvelles fonctionnalités
5. ✅ API DELETE clients
6. ✅ Checkboxes + bouton suppression dans la liste des clients
7. ✅ Bouton "Modifier" dans la barre d'actions des factures

## Notes importantes

- **Toujours utiliser PowerShell en mode administrateur** pour éviter les problèmes de permissions
- **Toujours vérifier la version de Node.js** avant de lancer un build
- **Attendre que `pnpm install` soit complètement terminé** avant de lancer `pnpm build`
- **Ne pas mélanger npm et pnpm** dans le même projet
