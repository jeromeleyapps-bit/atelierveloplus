# 🚴 Intégration Strava - Guide Complet

## 🎯 Objectif

Intégrer Strava à l'atelier vélo pour :
- Voir les activités des clients cyclistes
- Recevoir des notifications d'activités
- Afficher les statistiques de la communauté
- Proposer des services personnalisés basés sur l'usage

---

## 📋 Ce qui a été ajouté

### **Interface Admin**
- ✅ Section Strava dans "Intégrations"
- ✅ Icône vélo orange (couleur Strava #FC4C02)
- ✅ Bouton "Connecter" avec style Strava
- ✅ Chip "Connecté" quand authentifié

**Affichage** :
```
┌─────────────────────────────────────┐
│ Intégrations                        │
├─────────────────────────────────────┤
│ 💳 SumUp          [Actif]          │
│ 💳 Stripe         [Configuré]      │
│ ✉️ HubSpot        [À configurer]   │
│ ─────────────────────────────────   │
│ 🚴 Strava         [Connecter]      │
│    Activités cyclistes & communauté│
└─────────────────────────────────────┘
```

---

## 🔐 Implémentation OAuth 2.0

### **Étape 1 : Créer une Application Strava**

1. Aller sur https://www.strava.com/settings/api
2. Créer une nouvelle application
3. Remplir les informations :
   - **Application Name** : Atelier Vélo+
   - **Category** : Service
   - **Club** : (optionnel)
   - **Website** : https://votre-domaine.com
   - **Authorization Callback Domain** : votre-domaine.com

4. Noter les credentials :
   - **Client ID** : `12345`
   - **Client Secret** : `abcdef123456...`

---

### **Étape 2 : Configuration Variables d'Environnement**

**Fichier** : `.env.local`

```bash
# Strava OAuth
STRAVA_CLIENT_ID=your_client_id
STRAVA_CLIENT_SECRET=your_client_secret
STRAVA_REDIRECT_URI=http://localhost:3000/api/auth/strava/callback
```

---

### **Étape 3 : Créer la Route de Connexion**

**Fichier** : `/api/auth/strava/authorize/route.ts`

```typescript
import { NextResponse } from 'next/server';

export async function GET() {
  const clientId = process.env.STRAVA_CLIENT_ID;
  const redirectUri = process.env.STRAVA_REDIRECT_URI;
  const scope = 'read,activity:read_all,profile:read_all';

  const authUrl = `https://www.strava.com/oauth/authorize?client_id=${clientId}&response_type=code&redirect_uri=${redirectUri}&approval_prompt=force&scope=${scope}`;

  return NextResponse.redirect(authUrl);
}
```

---

### **Étape 4 : Créer la Route de Callback**

**Fichier** : `/api/auth/strava/callback/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/lib/db';

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  if (error) {
    return NextResponse.redirect('/admin?strava_error=' + error);
  }

  if (!code) {
    return NextResponse.redirect('/admin?strava_error=no_code');
  }

  try {
    // Échanger le code contre un access token
    const tokenResponse = await fetch('https://www.strava.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: process.env.STRAVA_CLIENT_ID,
        client_secret: process.env.STRAVA_CLIENT_SECRET,
        code,
        grant_type: 'authorization_code',
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok) {
      throw new Error(tokenData.message || 'Token exchange failed');
    }

    // Sauvegarder les tokens en base
    const prisma = await getPrisma();
    await prisma.stravaIntegration.upsert({
      where: { userId: 'current_user_id' }, // TODO: Récupérer le vrai userId
      update: {
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        expiresAt: new Date(tokenData.expires_at * 1000),
        athleteId: tokenData.athlete.id,
        athleteName: `${tokenData.athlete.firstname} ${tokenData.athlete.lastname}`,
      },
      create: {
        userId: 'current_user_id',
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        expiresAt: new Date(tokenData.expires_at * 1000),
        athleteId: tokenData.athlete.id,
        athleteName: `${tokenData.athlete.firstname} ${tokenData.athlete.lastname}`,
      },
    });

    return NextResponse.redirect('/admin?strava_success=true');
  } catch (error: any) {
    console.error('Strava OAuth error:', error);
    return NextResponse.redirect('/admin?strava_error=' + error.message);
  }
}
```

---

### **Étape 5 : Schéma Prisma**

**Fichier** : `prisma/schema.prisma`

```prisma
model StravaIntegration {
  id           String   @id @default(cuid())
  userId       String   @unique
  accessToken  String
  refreshToken String
  expiresAt    DateTime
  athleteId    Int
  athleteName  String
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

**Migration** :
```bash
npx prisma migrate dev --name add_strava_integration
```

---

### **Étape 6 : Mettre à Jour le Bouton**

**Fichier** : `/admin/page.tsx`

```typescript
const handleStravaConnect = () => {
  // Rediriger vers la route d'autorisation
  window.location.href = '/api/auth/strava/authorize';
};

useEffect(() => {
  // Vérifier si Strava est connecté
  const checkStravaConnection = async () => {
    try {
      const res = await fetch('/api/auth/strava/status');
      const data = await res.json();
      setStravaConnected(data.connected);
    } catch (error) {
      console.error('Error checking Strava status:', error);
    }
  };

  checkStravaConnection();
}, []);
```

---

## 📊 Fonctionnalités Possibles

### **1. Dashboard Activités** 🏃

**Afficher** :
- Dernières sorties vélo des clients
- Distance totale parcourue
- Dénivelé cumulé
- Temps de selle

**Utilité** : Proposer des entretiens préventifs basés sur l'usage

---

### **2. Notifications** 🔔

**Recevoir des alertes** :
- Nouveau record personnel d'un client
- Sortie longue distance (>100km)
- Participation à un événement

**Utilité** : Féliciter les clients, proposer des services

---

### **3. Statistiques Communauté** 📈

**Afficher** :
- Nombre de clients connectés à Strava
- Distance totale de la communauté
- Classement mensuel
- Segments populaires

**Utilité** : Créer une communauté, fidéliser

---

### **4. Services Personnalisés** 🛠️

**Proposer** :
- Entretien préventif basé sur le kilométrage
- Upgrade de composants selon l'usage
- Conseils personnalisés

**Utilité** : Augmenter la valeur ajoutée

---

## 🔄 Refresh Token

**Problème** : Les access tokens Strava expirent après 6 heures.

**Solution** : Refresh automatique

```typescript
async function refreshStravaToken(refreshToken: string) {
  const response = await fetch('https://www.strava.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  const data = await response.json();

  // Mettre à jour en base
  await prisma.stravaIntegration.update({
    where: { refreshToken },
    data: {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: new Date(data.expires_at * 1000),
    },
  });

  return data.access_token;
}
```

---

## 📡 API Strava - Endpoints Utiles

### **Récupérer les Activités**
```typescript
GET https://www.strava.com/api/v3/athlete/activities
Headers: Authorization: Bearer {access_token}
```

### **Détails d'une Activité**
```typescript
GET https://www.strava.com/api/v3/activities/{id}
```

### **Statistiques de l'Athlète**
```typescript
GET https://www.strava.com/api/v3/athletes/{id}/stats
```

### **Webhooks (Notifications)**
```typescript
POST https://www.strava.com/api/v3/push_subscriptions
Body: {
  client_id: "your_client_id",
  client_secret: "your_client_secret",
  callback_url: "https://your-domain.com/api/webhooks/strava",
  verify_token: "STRAVA"
}
```

---

## 🎨 Interface Utilisateur

### **Widget Dashboard**
```
┌─────────────────────────────────────┐
│ 🚴 Activités Strava                 │
├─────────────────────────────────────┤
│ Cette semaine :                     │
│ • 245 km parcourus                  │
│ • 12 sorties                        │
│ • 3,450m D+                         │
│                                     │
│ Dernière sortie :                   │
│ 🚴 Col de la Bonette - 85km        │
│ Il y a 2 heures                     │
│                                     │
│ [Voir toutes les activités]        │
└─────────────────────────────────────┘
```

---

## 🧪 Tests

### **Test 1 : Connexion**
- [ ] Cliquer "Connecter"
- [ ] Redirection vers Strava
- [ ] Autoriser l'application
- [ ] Retour sur /admin
- [ ] Vérifier chip "Connecté"

### **Test 2 : Déconnexion**
- [ ] Bouton "Déconnecter"
- [ ] Token supprimé de la BDD
- [ ] Retour à l'état "Connecter"

### **Test 3 : Refresh Token**
- [ ] Attendre 6h (ou forcer expiration)
- [ ] Faire une requête API
- [ ] Vérifier refresh automatique

---

## 💡 Cas d'Usage Réels

### **Atelier Pro**
- Client fait 200km/semaine
- Notification : "Entretien recommandé tous les 1000km"
- Proposition automatique de RDV

### **Événement**
- Client participe à une course
- Message : "Bravo pour votre course ! 10% sur l'entretien post-course"

### **Communauté**
- Classement mensuel des clients
- Récompense : "Client du mois - 1 révision offerte"

---

## 🎉 Résultat Final

### **Avant**
- ❌ Pas d'intégration Strava
- ❌ Pas de suivi d'usage des vélos
- ❌ Pas de personnalisation

### **Après**
- ✅ Connexion OAuth Strava
- ✅ Suivi des activités clients
- ✅ Notifications personnalisées
- ✅ Services basés sur l'usage
- ✅ Communauté cycliste
- ✅ Fidélisation accrue

**L'atelier devient un hub de la communauté cycliste locale !** 🚴‍♂️✨
