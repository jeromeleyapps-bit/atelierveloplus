# 🔧 Dépannage Electron

## ⚠️ Problème Actuel : Incompatibilité Node.js v22

Electron 38 a des problèmes de compatibilité avec Node.js v22.19.0.

---

## ✅ Solution : Utiliser Node.js v20 LTS

### Option 1 : Installer Node.js v20 (Recommandé)

1. Téléchargez Node.js v20 LTS : https://nodejs.org/en/download
2. Installez-le
3. Vérifiez : `node --version` (devrait afficher v20.x.x)
4. Réinstallez les dépendances :
   ```bash
   cd apps/web
   pnpm install
   pnpm run electron:dev
   ```

### Option 2 : Utiliser nvm-windows

1. Installez nvm-windows : https://github.com/coreybutler/nvm-windows/releases
2. Installez Node.js v20 :
   ```bash
   nvm install 20
   nvm use 20
   ```
3. Réinstallez les dépendances :
   ```bash
   cd apps/web
   pnpm install
   pnpm run electron:dev
   ```

---

## 🚀 Alternative : Package Portable (Sans Electron)

En attendant de résoudre le problème Electron, vous pouvez distribuer l'application comme un package portable.

### Créer le Package Portable

1. **Build Next.js** :
   ```bash
   cd apps/web
   npm run build
   ```

2. **Créer le dossier portable** :
   ```
   AtelierVeloPlus-Portable/
   ├─ app/                    # Copier tout le contenu de apps/web
   ├─ start.bat               # Script de démarrage
   └─ README.txt
   ```

3. **Créer start.bat** :
   ```batch
   @echo off
   echo Demarrage Atelier Velo+...
   cd app
   start http://localhost:3000/dashboard
   npm start
   pause
   ```

4. **Zipper le dossier** et distribuer

---

## 📊 Comparaison

| Solution | Avantages | Inconvénients |
|----------|-----------|---------------|
| **Electron (Node v20)** | ✅ Application native<br>✅ Icône dans la barre des tâches<br>✅ Professionnel | ❌ Nécessite Node v20<br>❌ Plus complexe |
| **Package Portable** | ✅ Fonctionne immédiatement<br>✅ Pas de dépendances<br>✅ Simple | ❌ Pas d'icône native<br>❌ Nécessite navigateur |
| **Application Web** | ✅ Aucune installation<br>✅ Accessible partout | ❌ Nécessite hébergement<br>❌ Nécessite Internet |

---

## 🎯 Recommandation

### Court terme (Maintenant)
Utilisez le **script de démarrage actuel** (`LANCER_ATELIER_VELO.bat`) qui fonctionne parfaitement.

### Moyen terme (Prochaine session)
- Installez Node.js v20
- Testez Electron
- Créez l'installateur

### Long terme (Futur)
- Déployez sur Vercel + Supabase (SaaS)
- Modèle d'abonnement
- Accessible partout

---

## ✅ Ce qui Fonctionne Déjà

Votre application actuelle fonctionne parfaitement avec :
- ✅ Raccourci Bureau
- ✅ Démarrage automatique
- ✅ Ouverture du navigateur
- ✅ Mode sombre
- ✅ Interface moderne
- ✅ Multi-tenancy

**L'application est prête à être utilisée en production locale !**

---

**Note** : Electron est un "nice-to-have" pour une meilleure expérience utilisateur, mais l'application fonctionne déjà très bien sans.
