# 🚀 Démarrage Automatique au Démarrage de Windows

## Option 1 : Raccourci dans le Dossier Démarrage (Recommandé)

### Étapes :
1. Appuyez sur `Win + R`
2. Tapez : `shell:startup`
3. Appuyez sur Entrée
4. Copiez le raccourci `Atelier Vélo+` depuis votre Bureau dans ce dossier

**Résultat** : L'application démarrera automatiquement quand vous allumez votre PC.

---

## Option 2 : Tâche Planifiée Windows

### Étapes :
1. Ouvrez le Planificateur de tâches (`taskschd.msc`)
2. Créer une tâche de base
3. **Nom** : Atelier Vélo+
4. **Déclencheur** : À l'ouverture de session
5. **Action** : Démarrer un programme
6. **Programme** : `C:\Users\j_ley\Atelier-velo+\LANCER_ATELIER_VELO.bat`
7. Cochez "Exécuter avec les privilèges les plus élevés"

---

## Option 3 : Service Windows (Avancé)

Pour une vraie application en production, utilisez un gestionnaire de processus comme :
- **PM2** (Node.js process manager)
- **NSSM** (Non-Sucking Service Manager)

### Avec PM2 :
```bash
npm install -g pm2
cd apps/web
pm2 start npm --name "atelier-velo" -- run dev
pm2 startup
pm2 save
```

---

## ⚠️ Important

Si vous activez le démarrage automatique :
- PostgreSQL doit aussi démarrer automatiquement (c'est déjà le cas normalement)
- L'application utilisera des ressources même si vous ne l'utilisez pas
- Pensez à l'arrêter si vous n'en avez pas besoin

---

## 🛑 Désactiver le Démarrage Automatique

### Si Option 1 :
Supprimez le raccourci du dossier Démarrage (`Win + R` → `shell:startup`)

### Si Option 2 :
Désactivez ou supprimez la tâche dans le Planificateur de tâches

### Si Option 3 :
```bash
pm2 stop atelier-velo
pm2 delete atelier-velo
pm2 unstartup
```
