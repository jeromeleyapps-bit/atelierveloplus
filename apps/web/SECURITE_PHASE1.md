# 🔒 Phase 1 : Sécurité - Guide Complet

## 🎯 Objectif

Sécuriser l'application avant le déploiement en production.

**Durée estimée** : 3-4 heures  
**Priorité** : 🔴 CRITIQUE

---

## ✅ Étape 1 : Désactiver RESET_DB_ON_REGISTER (5 min)

### **Problème Actuel**
Ligne 70 de `/api/auth/register/route.ts` :
```typescript
const shouldReset = process.env.RESET_DB_ON_REGISTER === "true" || process.env.NODE_ENV === "development";
```

**Danger** : En mode développement, la base de données est effacée à chaque inscription !

### **Solution**

**Fichier** : `apps/web/.env`

Ajouter :
```env
# Sécurité : Désactiver le reset automatique de la BDD
RESET_DB_ON_REGISTER=false
```

**Vérification** :
```powershell
# Tester l'inscription
# La BDD ne devrait PAS être effacée
```

---

## ✅ Étape 2 : Générer Nouveaux Secrets (5 min)

### **Problème Actuel**
Les secrets actuels peuvent être :
- Identiques (NEXTAUTH_SECRET = AUTH_SECRET)
- Faibles ou par défaut
- Exposés dans le code

### **Solution**

**Générer 2 secrets forts** :
```powershell
# Dans PowerShell
# Secret 1
$bytes1 = New-Object byte[] 32
[Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes1)
$secret1 = [Convert]::ToBase64String($bytes1)
Write-Host "NEXTAUTH_SECRET=$secret1"

# Secret 2
$bytes2 = New-Object byte[] 32
[Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes2)
$secret2 = [Convert]::ToBase64String($bytes2)
Write-Host "AUTH_SECRET=$secret2"
```

**Alternative (si OpenSSL installé)** :
```powershell
openssl rand -base64 32
openssl rand -base64 32
```

**Fichier** : `apps/web/.env`

Mettre à jour :
```env
# Secrets d'authentification (NE JAMAIS COMMITER)
NEXTAUTH_SECRET=<premier secret généré>
AUTH_SECRET=<second secret généré>
NEXTAUTH_URL=http://localhost:3000
```

**⚠️ IMPORTANT** :
- Ne JAMAIS commiter ces secrets
- Utiliser des secrets différents en production
- Les stocker de manière sécurisée (Vercel Secrets, etc.)

---

## ✅ Étape 3 : Configurer Upstash Redis (15 min)

### **Problème Actuel**
Le rate limiting utilise la mémoire locale :
- Perdu au redémarrage
- Ne fonctionne pas en multi-instance
- Pas de persistance

### **Solution : Upstash Redis**

#### **3.1 Créer un Compte Upstash**
1. Aller sur https://upstash.com
2. S'inscrire (gratuit)
3. Créer une nouvelle base Redis
4. Choisir la région la plus proche

#### **3.2 Récupérer les Credentials**
Dans le dashboard Upstash :
- **REST URL** : `https://your-redis.upstash.io`
- **REST TOKEN** : `AXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXx`

#### **3.3 Configurer l'Application**

**Fichier** : `apps/web/.env`

Ajouter :
```env
# Upstash Redis (Rate Limiting)
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=AXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXx
```

#### **3.4 Installer le Package**
```powershell
cd apps/web
pnpm add @upstash/redis
```

#### **3.5 Mettre à Jour le Rate Limiter**

**Fichier** : `src/lib/security.ts`

Chercher la fonction `rateLimit` et la mettre à jour pour utiliser Upstash au lieu de la mémoire.

---

## ✅ Étape 4 : Middleware de Protection (2-3h)

### **Problème Actuel**
- Aucune protection des routes admin
- APIs accessibles sans authentification
- Pas de vérification de session

### **Solution : Middleware Next.js**

#### **4.1 Créer le Middleware**

**Fichier** : `apps/web/src/middleware.ts`

```typescript
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

// Routes qui nécessitent une authentification
const protectedRoutes = [
  '/dashboard',
  '/customers',
  '/tickets',
  '/finance',
  '/catalog',
  '/suppliers',
  '/admin',
  '/booking',
  '/calendar',
  '/cash-register',
  '/stats',
  '/settings',
];

// Routes admin (nécessitent role = admin)
const adminRoutes = [
  '/admin',
];

// APIs protégées (sauf auth)
const protectedApiRoutes = [
  '/api/customers',
  '/api/workorders',
  '/api/finance',
  '/api/catalog',
  '/api/suppliers',
  '/api/admin',
  '/api/booking',
  '/api/calendar',
  '/api/cash-register',
  '/api/stats',
  '/api/account',
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Vérifier si la route nécessite une authentification
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route));
  const isProtectedApi = protectedApiRoutes.some(route => pathname.startsWith(route));
  const isAdminRoute = adminRoutes.some(route => pathname.startsWith(route));

  if (isProtectedRoute || isProtectedApi) {
    // Récupérer le token JWT
    const token = await getToken({ 
      req: request, 
      secret: process.env.NEXTAUTH_SECRET 
    });

    // Pas de token = pas authentifié
    if (!token) {
      if (isProtectedApi) {
        return NextResponse.json(
          { error: 'unauthorized' },
          { status: 401 }
        );
      }
      // Rediriger vers la page de connexion
      const url = new URL('/auth/signin', request.url);
      url.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(url);
    }

    // Vérifier le rôle pour les routes admin
    if (isAdminRoute && token.role !== 'admin') {
      if (isProtectedApi) {
        return NextResponse.json(
          { error: 'forbidden' },
          { status: 403 }
        );
      }
      // Rediriger vers le dashboard
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
};
```

#### **4.2 Mettre à Jour next-auth**

**Fichier** : `src/app/api/auth/[...nextauth]/route.ts`

Vérifier que le JWT callback inclut le rôle :
```typescript
callbacks: {
  async jwt({ token, user }) {
    if (user) {
      token.id = user.id;
      token.role = user.role; // ✅ Important
    }
    return token;
  },
  async session({ session, token }) {
    if (session.user) {
      session.user.id = token.id;
      session.user.role = token.role; // ✅ Important
    }
    return session;
  },
}
```

#### **4.3 Mettre à Jour les Types**

**Fichier** : `src/types/next-auth.d.ts` (créer si n'existe pas)

```typescript
import 'next-auth';

declare module 'next-auth' {
  interface User {
    id: string;
    role?: string;
  }

  interface Session {
    user: {
      id: string;
      email: string;
      name?: string;
      role?: string;
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    role?: string;
  }
}
```

---

## 🧪 Tests de Sécurité

### **Test 1 : Protection Routes**
```powershell
# Se déconnecter
# Essayer d'accéder à /admin
# Résultat attendu : Redirection vers /auth/signin
```

### **Test 2 : Protection APIs**
```powershell
# Sans token
curl http://localhost:3000/api/admin/stats
# Résultat attendu : 401 Unauthorized
```

### **Test 3 : Rôle Admin**
```powershell
# Se connecter avec un compte non-admin
# Essayer d'accéder à /admin
# Résultat attendu : Redirection vers /dashboard
```

### **Test 4 : Reset DB Désactivé**
```powershell
# Créer un client
# S'inscrire avec un nouveau compte
# Vérifier que le client existe toujours
```

---

## 📋 Checklist Complète

### **Étape 1 : RESET_DB_ON_REGISTER**
- [ ] Ajouter `RESET_DB_ON_REGISTER=false` dans `.env`
- [ ] Tester l'inscription
- [ ] Vérifier que les données persistent

### **Étape 2 : Secrets**
- [ ] Générer 2 secrets forts (32 bytes)
- [ ] Mettre à jour `.env`
- [ ] Redémarrer le serveur
- [ ] Tester la connexion

### **Étape 3 : Upstash Redis**
- [ ] Créer compte Upstash
- [ ] Créer base Redis
- [ ] Copier REST_URL et REST_TOKEN
- [ ] Ajouter dans `.env`
- [ ] Installer `@upstash/redis`
- [ ] Mettre à jour `src/lib/security.ts`
- [ ] Tester le rate limiting

### **Étape 4 : Middleware**
- [ ] Créer `src/middleware.ts`
- [ ] Mettre à jour next-auth callbacks
- [ ] Créer `src/types/next-auth.d.ts`
- [ ] Tester protection routes
- [ ] Tester protection APIs
- [ ] Tester rôle admin

---

## 🎯 Résultat Attendu

Après cette phase, vous aurez :

✅ **Base de données protégée** (pas de reset accidentel)
✅ **Secrets forts** et uniques
✅ **Rate limiting persistant** (Upstash)
✅ **Routes protégées** (middleware)
✅ **APIs sécurisées** (authentification requise)
✅ **Rôles respectés** (admin vs user)

**L'application sera sécurisée pour un déploiement initial !** 🔒

---

## ⚠️ Points d'Attention

### **Secrets**
- ❌ Ne JAMAIS commiter les secrets
- ✅ Utiliser `.env.local` en dev
- ✅ Utiliser Vercel Secrets en prod

### **Rate Limiting**
- ✅ Upstash Free : 10K requests/day
- ⚠️ Surveiller l'usage
- 💡 Upgrade si nécessaire

### **Middleware**
- ⚠️ Peut ralentir légèrement les requêtes
- ✅ Essentiel pour la sécurité
- 💡 Optimiser si nécessaire

---

## 📞 Prochaine Étape

Après la sécurité, vous pourrez :
1. **Déployer en production** (Vercel)
2. **Intégrer Stripe/SumUp** (paiements)
3. **Intégrer HubSpot** (emails/SMS)
4. **Conformité fiscale** (NF525/Attestation)

**Commençons par l'Étape 1 !** 🚀
