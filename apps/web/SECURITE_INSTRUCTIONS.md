# 🔒 Instructions de Sécurisation - À Faire Maintenant

## ✅ Ce qui a été fait automatiquement

1. ✅ **Middleware de protection créé** (`src/middleware.ts`)
   - Protection des APIs admin
   - Vérification du rôle admin
   - Gestion d'erreurs 401/403

2. ✅ **Types TypeScript** créés (`src/types/next-auth.d.ts`)

3. ✅ **Script de génération de secrets** (`SECRETS_GENERATION.ps1`)

---

## 📋 Actions MANUELLES Requises

### **Action 1 : Désactiver RESET_DB_ON_REGISTER** ⚠️

**Fichier** : `apps/web/.env`

**Ajouter cette ligne** :
```env
# Sécurité : Désactiver le reset automatique de la BDD
RESET_DB_ON_REGISTER=false
```

**Pourquoi** : Actuellement, en mode dev, la BDD est effacée à chaque inscription !

---

### **Action 2 : Générer et Configurer les Secrets** 🔑

#### **Option A : Avec le Script PowerShell**
```powershell
cd apps/web
.\SECRETS_GENERATION.ps1
```

Le script affichera 2 secrets à copier dans `.env`.

#### **Option B : Manuellement**
```powershell
# Générer Secret 1
$bytes1 = New-Object byte[] 32
[Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes1)
[Convert]::ToBase64String($bytes1)

# Générer Secret 2
$bytes2 = New-Object byte[] 32
[Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes2)
[Convert]::ToBase64String($bytes2)
```

**Fichier** : `apps/web/.env`

**Ajouter/Remplacer** :
```env
# Secrets d'authentification (NE JAMAIS COMMITER)
NEXTAUTH_SECRET=<premier secret généré>
AUTH_SECRET=<second secret généré>
NEXTAUTH_URL=http://localhost:3000
```

---

### **Action 3 : Configurer Upstash Redis** 📊

#### **Étape 3.1 : Créer le Compte**
1. Aller sur https://upstash.com
2. S'inscrire (gratuit - pas de carte bancaire requise)
3. Créer une nouvelle base Redis
4. Choisir la région : **Europe (Ireland)** ou la plus proche

#### **Étape 3.2 : Récupérer les Credentials**
Dans le dashboard Upstash, copier :
- **UPSTASH_REDIS_REST_URL** : `https://xxxxx.upstash.io`
- **UPSTASH_REDIS_REST_TOKEN** : `AXXXXXXXXXXXXXXXXXXXXXXXx`

#### **Étape 3.3 : Configurer l'App**

**Fichier** : `apps/web/.env`

**Ajouter** :
```env
# Upstash Redis (Rate Limiting persistant)
UPSTASH_REDIS_REST_URL=https://xxxxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=AXXXXXXXXXXXXXXXXXXXXXXXx
```

#### **Étape 3.4 : Installer le Package**
```powershell
cd apps/web
pnpm add @upstash/redis
```

#### **Étape 3.5 : Mettre à Jour le Rate Limiter**

**Fichier** : `src/lib/security.ts`

Chercher la fonction `rateLimit` et remplacer l'implémentation mémoire par Upstash.

---

### **Action 4 : Redémarrer le Serveur** 🔄

Après avoir modifié `.env` :
```powershell
# Arrêter le serveur (Ctrl+C)
# Redémarrer
cd apps/web
pnpm dev
```

---

## 🧪 Tests de Vérification

### **Test 1 : RESET_DB_ON_REGISTER Désactivé**
```powershell
# 1. Créer un client dans l'app
# 2. S'inscrire avec un nouveau compte (via /auth/register)
# 3. Vérifier que le client existe toujours
# ✅ Si le client existe = RESET désactivé
# ❌ Si le client a disparu = RESET toujours actif
```

### **Test 2 : Secrets Configurés**
```powershell
# 1. Se déconnecter
# 2. Se reconnecter
# ✅ Si la connexion fonctionne = Secrets OK
# ❌ Si erreur = Secrets invalides
```

### **Test 3 : Protection API Admin**
```powershell
# Sans être connecté
curl http://localhost:3000/api/admin/stats
# Résultat attendu : 401 Unauthorized
```

### **Test 4 : Rôle Admin**
```powershell
# Se connecter avec admin@test.fr / password123
curl http://localhost:3000/api/admin/stats -H "x-user-id: <admin-user-id>"
# Résultat attendu : 200 OK avec les stats
```

---

## 📊 État de Sécurité

### **Avant**
- ❌ BDD effacée à chaque inscription
- ❌ Secrets potentiellement faibles
- ❌ Rate limiting en mémoire (perdu au redémarrage)
- ❌ APIs accessibles sans auth
- ❌ Pas de vérification de rôle

### **Après (une fois les actions faites)**
- ✅ BDD protégée contre les resets
- ✅ Secrets forts et uniques
- ✅ Rate limiting persistant (Upstash)
- ✅ APIs protégées (middleware)
- ✅ Rôles vérifiés (admin vs user)

---

## ⚠️ IMPORTANT

### **Fichier .env**
- ❌ **NE JAMAIS commiter** `.env` dans Git
- ✅ `.env` est déjà dans `.gitignore`
- ✅ Utiliser `.env.example` comme template
- ✅ En production, utiliser Vercel Environment Variables

### **Secrets**
- ✅ Différents en dev et prod
- ✅ Stockés de manière sécurisée
- ✅ Régénérés régulièrement (tous les 6 mois)

### **Upstash**
- ✅ Free tier : 10K requests/day
- ⚠️ Surveiller l'usage
- 💡 Upgrade si nécessaire ($10/mois pour 100K req/day)

---

## 🎯 Prochaines Étapes

Une fois ces 4 actions complétées :

1. **Tester tous les scénarios** de sécurité
2. **Vérifier les logs** pour détecter les tentatives d'accès
3. **Déployer en production** (Vercel)
4. **Intégrer Stripe/SumUp** (paiements)

---

## 💡 Commandes Récapitulatives

```powershell
# 1. Générer les secrets
cd apps/web
.\SECRETS_GENERATION.ps1

# 2. Éditer .env
code .env
# Ajouter RESET_DB_ON_REGISTER=false
# Ajouter NEXTAUTH_SECRET et AUTH_SECRET
# Ajouter UPSTASH_REDIS_REST_URL et UPSTASH_REDIS_REST_TOKEN

# 3. Installer Upstash
pnpm add @upstash/redis

# 4. Redémarrer
pnpm dev

# 5. Tester
curl http://localhost:3000/api/admin/stats
# Devrait retourner 401 si pas authentifié
```

---

## 🎉 Résultat Final

**Après ces actions, votre application sera :**
- 🔒 **Sécurisée** (middleware + auth)
- 🛡️ **Protégée** (rate limiting persistant)
- 🔑 **Robuste** (secrets forts)
- ✅ **Prête pour Production**

**Durée totale estimée** : 30-45 minutes (actions manuelles)

**Bon courage !** 💪
