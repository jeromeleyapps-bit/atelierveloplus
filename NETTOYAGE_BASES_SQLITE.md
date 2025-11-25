# 🧹 Nettoyage Bases SQLite

## ✅ Configuration Unifiée

### Base Unique
**Emplacement** : `apps/web/data/atelier-velo.db`

### Configurations Mises à Jour

#### 1. Prisma Schema
```prisma
datasource db {
  provider = "sqlite"
  url      = "file:../data/atelier-velo.db"
}
```
✅ Pointe vers `apps/web/data/atelier-velo.db`

#### 2. .env et .env.local
```env
DATABASE_PROVIDER=sqlite
SQLITE_DB_PATH=./data/atelier-velo.db
```
✅ Cohérent avec Prisma

---

## 🗑️ Bases Obsolètes à Supprimer

### Bases de Test (Anciennes)
```
apps/data/atelier-velo.db                              ❌ Supprimer
apps/web/prisma/test-sqlite.db                         ❌ Supprimer
apps/web/prisma/data/atelier.db                        ❌ Supprimer
apps/web/prisma/data/atelier-velo.db                   ❌ Supprimer
apps/web/prisma/data/app.db                            ❌ Supprimer
apps/desktop/build-temp/web/prisma/test-sqlite.db      ❌ Supprimer
apps/desktop/build-temp/web/prisma/data/atelier.db     ❌ Supprimer
apps/desktop/build-temp/web/prisma/data/app.db         ❌ Supprimer
```

### Base Active (À Garder)
```
apps/web/data/atelier-velo.db                          ✅ GARDER
```

---

## 🔧 Commandes de Nettoyage

```powershell
# Depuis la racine du projet
cd c:\Users\j_ley\Atelier-velo+

# Supprimer les bases obsolètes
Remove-Item -Force "apps\data\atelier-velo.db" -ErrorAction SilentlyContinue
Remove-Item -Force "apps\web\prisma\test-sqlite.db" -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force "apps\web\prisma\data" -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force "apps\desktop\build-temp" -ErrorAction SilentlyContinue

# Créer le dossier data si nécessaire
New-Item -ItemType Directory -Force -Path "apps\web\data"
```

---

## ✅ Vérification

Après nettoyage, il ne devrait rester que :
```
apps/web/data/atelier-velo.db  ← Base unique
```

---

## 📝 Avantages

1. ✅ **Une seule base** - Plus de confusion
2. ✅ **Chemin cohérent** - Prisma et .env alignés
3. ✅ **Facile à sauvegarder** - Un seul fichier
4. ✅ **Compatible Electron** - Chemin relatif simple
5. ✅ **Moins d'espace disque** - Pas de doublons

---

## 🚀 Prochaines Étapes

1. ✅ Base unifiée créée
2. ✅ Données de test créées
3. ⏳ Redémarrer le serveur
4. ⏳ Tester l'application
5. ⏳ Supprimer les bases obsolètes (optionnel)
