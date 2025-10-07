# 🚀 Instructions de Déploiement - Page Admin

## ✅ Ce qui a été créé

### **APIs Backend** (4 routes)
1. ✅ `/api/admin/stats/route.ts` - KPIs temps réel
2. ✅ `/api/admin/users/route.ts` - Gestion utilisateurs
3. ✅ `/api/admin/backup/route.ts` - Sauvegarde/restauration
4. ✅ `/api/admin/system-settings/route.ts` - Paramètres système

### **Schéma Prisma**
- ✅ Modèle `SystemSettings` ajouté
- ✅ Relation `User.systemSettings` ajoutée

### **Page Admin**
- ✅ Interface Strava ajoutée
- ✅ Prête pour connexion aux APIs

---

## ⚠️ Situation Actuelle

Le schéma Prisma a divergé de la base de données actuelle. Vous avez **2 options** :

### **Option 1 : Reset Complet (Recommandé pour dev)** 🔄

**Avantages** :
- ✅ Schéma propre et à jour
- ✅ Toutes les contraintes appliquées
- ✅ Pas de problèmes futurs

**Inconvénients** :
- ❌ **Perte de toutes les données**

**Commandes** :
```powershell
cd apps/web

# Sauvegarder les données importantes manuellement si nécessaire

# Reset et migration
npx prisma migrate reset --force

# Générer le client
npx prisma generate

# Redémarrer le serveur
npm run dev
```

---

### **Option 2 : Migration Manuelle (Garder les données)** 🛠️

**Avantages** :
- ✅ Garde les données existantes

**Inconvénients** :
- ⚠️ Plus complexe
- ⚠️ Risque d'erreurs

**Commandes** :
```powershell
cd apps/web

# Créer juste la table SystemSettings
npx prisma db execute --stdin < migration_manual.sql
```

**Fichier `migration_manual.sql`** :
```sql
-- Créer la table SystemSettings
CREATE TABLE IF NOT EXISTS "SystemSettings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL UNIQUE,
    "notificationsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "emailNotificationsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "activityLogsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "autoBackupEnabled" BOOLEAN NOT NULL DEFAULT false,
    "backupFrequency" TEXT NOT NULL DEFAULT 'weekly',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SystemSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Index
CREATE UNIQUE INDEX "SystemSettings_userId_key" ON "SystemSettings"("userId");
```

Puis :
```powershell
npx prisma generate
npm run dev
```

---

## 📦 Installer les Dépendances

```powershell
cd apps/web

# Installer bcryptjs pour hasher les mots de passe
npm install bcryptjs
npm install --save-dev @types/bcryptjs
```

---

## 🧪 Tester les Fonctionnalités

### **1. KPIs Temps Réel**
```powershell
# Ouvrir http://localhost:3000/admin
# Vérifier que les chiffres correspondent à la BDD
```

**API Test** :
```powershell
curl http://localhost:3000/api/admin/stats
```

---

### **2. Créer un Utilisateur**

**Via l'interface** :
1. Ouvrir `/admin`
2. Cliquer sur la tuile "Utilisateurs"
3. Remplir le formulaire
4. Créer

**Via API** :
```powershell
curl -X POST http://localhost:3000/api/admin/users `
  -H "Content-Type: application/json" `
  -d '{"email":"test@example.com","name":"Test User","password":"Password123!"}'
```

**Vérifier en BDD** :
```sql
SELECT id, email, name, "createdAt" FROM "User";
```

---

### **3. Exporter les Données**

**Via l'interface** :
1. Ouvrir `/admin`
2. Section "Sauvegarde & Données"
3. Cliquer "Exporter toutes les données"
4. Fichier JSON téléchargé

**Via API** :
```powershell
curl http://localhost:3000/api/admin/backup -o backup.json
```

---

### **4. Paramètres Système**

**Via l'interface** :
1. Ouvrir `/admin`
2. Section "Paramètres Système"
3. Toggle un paramètre
4. Vérifier la sauvegarde

**Via API** :
```powershell
# GET
curl http://localhost:3000/api/admin/system-settings

# PUT
curl -X PUT http://localhost:3000/api/admin/system-settings `
  -H "Content-Type: application/json" `
  -d '{"notificationsEnabled":false,"emailNotificationsEnabled":true,"activityLogsEnabled":true}'
```

---

## 🔧 Prochaines Étapes

### **Fonctionnalités à Connecter**

1. **Dialog Création Utilisateur** 
   - Créer un composant `CreateUserDialog.tsx`
   - Ajouter au clic sur la tuile "Utilisateurs"

2. **Upload Backup**
   - Ajouter un input file
   - Parser le JSON
   - Appeler POST `/api/admin/backup`

3. **Connecter les Toggles**
   - Charger les settings au mount
   - onChange → PUT `/api/admin/system-settings`

4. **Rafraîchir les Stats**
   - Bouton refresh
   - Auto-refresh toutes les 30s

---

## 📋 Checklist Complète

### **Backend**
- [x] API Stats créée
- [x] API Users créée
- [x] API Backup créée
- [x] API System Settings créée
- [x] Schéma Prisma mis à jour

### **Base de Données**
- [ ] Migration appliquée (Option 1 ou 2)
- [ ] Table SystemSettings créée
- [ ] Client Prisma généré

### **Dépendances**
- [ ] bcryptjs installé
- [ ] @types/bcryptjs installé

### **Frontend** (À faire)
- [ ] Dialog création utilisateur
- [ ] Upload backup
- [ ] Connecter toggles
- [ ] Rafraîchir stats

### **Tests**
- [ ] KPIs affichent vraies données
- [ ] Création utilisateur fonctionne
- [ ] Export backup fonctionne
- [ ] Paramètres système sauvegardés

---

## 🎉 Résultat Attendu

Une fois déployé, vous aurez :

✅ **KPIs en temps réel** depuis la base de données
✅ **Gestion utilisateurs** fonctionnelle
✅ **Sauvegarde/restauration** complète
✅ **Paramètres système** persistants
✅ **Intégration Strava** prête
✅ **APIs robustes** et documentées

**La page Admin sera pleinement opérationnelle !** 🚀

---

## 💡 Recommandation

**Pour le développement** : Utilisez l'**Option 1** (Reset complet)
- Plus propre
- Évite les problèmes futurs
- Les données de dev peuvent être recréées

**Pour la production** : Utilisez l'**Option 2** (Migration manuelle)
- Garde les données clients
- Plus sûr
- Nécessite plus de tests

---

## 📞 Support

Si vous rencontrez des problèmes :

1. Vérifier les logs du serveur
2. Vérifier la console du navigateur
3. Tester les APIs avec curl
4. Vérifier la base de données avec pgAdmin

**Bon déploiement !** 🎯
