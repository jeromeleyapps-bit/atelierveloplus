# 🚀 Atelier Vélo+ - Application Electron

## ✅ Configuration Terminée

L'application est maintenant configurée pour fonctionner comme une application desktop standalone avec Electron.

---

## 🧪 Tester l'Application Electron

### 1. Mode Développement

```bash
cd apps/web
pnpm run electron:dev
```

**Ce qui se passe** :
- ✅ Next.js démarre sur le port 3000
- ✅ Une fenêtre Electron s'ouvre
- ✅ L'application charge automatiquement
- ✅ Icône dans la barre des tâches

### 2. Fermer l'Application

- **Cliquer sur X** : Minimise dans la barre des tâches
- **Clic droit sur l'icône → Quitter** : Ferme complètement

---

## 📦 Créer l'Installateur Windows

### Option 1 : Build Complet (Installateur .exe)

```bash
cd apps/web
pnpm run dist
```

**Résultat** : `dist/Atelier Velo+ Setup.exe` (environ 200-300 MB)

**Durée** : 5-10 minutes

### Option 2 : Build Rapide (Dossier portable)

```bash
cd apps/web
pnpm run pack
```

**Résultat** : `dist/win-unpacked/` (dossier portable)

**Durée** : 2-3 minutes

---

## 📁 Structure de l'Installateur

```
Atelier Velo+ Setup.exe
├─ Application Electron
├─ Next.js (compilé)
├─ Node.js (embarqué)
├─ Dépendances npm
└─ Prisma Client
```

**Note** : PostgreSQL n'est PAS inclus. Il doit être installé séparément.

---

## 🎯 Distribution

### Pour Distribuer à d'Autres Ateliers

1. **Créer l'installateur** : `pnpm run dist`
2. **Partager** : `dist/Atelier Velo+ Setup.exe`
3. **Instructions** : Chaque atelier doit :
   - Installer PostgreSQL
   - Lancer l'installateur
   - Configurer la base de données au premier lancement

---

## 🔧 Prochaines Améliorations

### À Faire (Optionnel)

1. **Embarquer PostgreSQL Portable**
   - Inclure PostgreSQL dans l'installateur
   - Démarrage automatique de la DB

2. **Auto-Update**
   - Mises à jour automatiques via electron-updater
   - Notification de nouvelles versions

3. **Splash Screen**
   - Écran de chargement pendant le démarrage

4. **Icône .ico**
   - Convertir logo.png en .ico pour Windows

---

## 🐛 Dépannage

### L'application ne démarre pas

1. Vérifiez que PostgreSQL est installé et démarré
2. Vérifiez que le port 3000 est libre
3. Regardez les logs dans la console

### Erreur "Cannot find module"

```bash
cd apps/web
pnpm install
pnpm run electron:dev
```

### L'installateur est trop gros

C'est normal ! Il contient :
- Node.js (~50 MB)
- Electron (~100 MB)
- Dépendances npm (~100 MB)

---

## 📊 Taille des Fichiers

- **Installateur** : ~250-300 MB
- **Application installée** : ~400-500 MB
- **Première installation** : ~5 minutes

---

## ✅ Checklist de Test

Avant de distribuer, testez :

- [ ] L'application démarre
- [ ] Le dashboard s'affiche
- [ ] La connexion à PostgreSQL fonctionne
- [ ] Les tickets peuvent être créés
- [ ] Les factures peuvent être générées
- [ ] L'application se minimise dans la barre des tâches
- [ ] L'application peut être fermée proprement
- [ ] Le mode sombre fonctionne
- [ ] L'installateur crée un raccourci Bureau
- [ ] L'installateur crée une entrée dans le menu Démarrer

---

## 🎨 Personnalisation

### Changer l'Icône

Remplacez `public/logo.png` par votre icône (256x256px minimum)

### Changer le Nom

Modifiez dans `package.json` :
```json
"build": {
  "productName": "Votre Nom d'App"
}
```

---

**Version Electron** : 38.2.1  
**Version Next.js** : 14.2.33  
**Dernière mise à jour** : 06/10/2025
