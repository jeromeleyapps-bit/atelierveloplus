# 🚀 Démarrage Rapide - Atelier Vélo+

## Problème Résolu ✅

Votre application a été corrigée pour fonctionner avec PostgreSQL/Supabase au lieu de SQLite.

**Corrections appliquées** :
- ✅ Client Prisma généré
- ✅ Requêtes PostgreSQL corrigées (case-insensitive)
- ✅ Compatibilité SQLite/PostgreSQL gérée
- ✅ Scripts de configuration créés

## 📋 Démarrage en 3 Étapes

### Étape 1: Configurer la DATABASE_URL

Créez ou modifiez le fichier `.env` dans `apps/web/` :

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:6543/postgres?sslmode=require&pgbouncer=true&connection_limit=1"
```

**Obtenir votre DATABASE_URL depuis Supabase** :
1. Allez sur https://supabase.com/dashboard
2. Sélectionnez votre projet
3. **Settings** → **Database** → **Connection string**
4. Choisissez **Transaction** (port 6543)
5. Copiez et remplacez `[YOUR-PASSWORD]`

### Étape 2: Initialiser la Base de Données

```powershell
.\init-database.ps1
```

Ce script va :
- Vérifier la connexion à la base de données
- Créer toutes les tables nécessaires
- Vérifier que tout fonctionne

### Étape 3: Démarrer l'Application

```powershell
npm run dev
```

Puis ouvrez http://localhost:3000 et créez votre premier compte utilisateur !

## 🔧 Commandes Utiles

### Vérifier l'environnement
```powershell
.\check-env.ps1
```

### Voir la base de données (interface graphique)
```powershell
npx prisma studio
```

### Réinitialiser la base de données (⚠️ supprime les données)
```powershell
npx prisma db push --force-reset
```

## ❓ Problèmes Courants

### "prisma_unavailable"
**Solution** : Le client Prisma n'est pas généré
```powershell
npx prisma generate
```

### "Cannot connect to database"
**Solutions** :
1. Vérifiez votre DATABASE_URL dans `.env`
2. Vérifiez que votre IP est autorisée dans Supabase (Settings → Database)
3. Utilisez le bon port (6543 pour production)

### "Table does not exist"
**Solution** : Les tables ne sont pas créées
```powershell
.\init-database.ps1
```

## 📚 Documentation Complète

- **`MIGRATION_FIXES.md`** - Détails des corrections appliquées
- **`SETUP_DATABASE.md`** - Guide complet de configuration
- **`TROUBLESHOOTING.md`** - Guide de dépannage détaillé

## 🎯 Prochaines Étapes

Une fois l'application démarrée :

1. **Créer un compte administrateur**
   - Allez sur http://localhost:3000
   - Créez votre premier compte (sera admin par défaut)

2. **Configurer votre atelier**
   - Paramètres → Informations de l'atelier
   - Ajoutez nom, adresse, SIRET, etc.

3. **Importer votre catalogue**
   - Catalogue → Importer
   - Ou créer manuellement vos pièces

4. **Configurer les paiements** (selon vos préférences)
   - SumUp et/ou Stripe
   - HubSpot pour les communications

## 🚢 Déploiement sur Vercel

Quand vous serez prêt à déployer :

1. Connectez votre repo GitHub à Vercel
2. Ajoutez la variable d'environnement `DATABASE_URL` dans Vercel
3. Utilisez la connection pooling (port 6543) pour la production
4. Déployez !

**Important** : Utilisez toujours le port 6543 (Transaction mode) pour Vercel.

## 💡 Conseils

- **Développement** : Utilisez `npx prisma studio` pour voir/éditer les données
- **Production** : Activez le connection pooling dans Supabase
- **Backup** : Configurez les backups automatiques dans Supabase
- **Monitoring** : Activez Sentry pour le suivi des erreurs (optionnel)

## 📞 Support

Si vous rencontrez des problèmes :
1. Consultez `TROUBLESHOOTING.md`
2. Vérifiez les logs de l'application
3. Vérifiez les logs Supabase dans le Dashboard
