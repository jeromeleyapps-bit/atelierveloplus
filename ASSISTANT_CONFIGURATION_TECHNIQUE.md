# 🛠️ Assistant de Configuration - Spécifications Techniques

## 🎯 Objectif

Créer un **assistant de configuration interactif** qui guide l'utilisateur lors du premier lancement de l'application, éliminant le besoin de modifier manuellement des fichiers `.env` ou de créer des comptes sur des services externes.

---

## 📋 Fonctionnalités de l'Assistant

### Étape 1 : Bienvenue et Détection
- **Déclenchement** : Au premier lancement de l'application Electron
- **Détection** : Fichier flag `~/.atelier-velo-desktop/first-launch.json` n'existe pas
- **Écran** : Splash screen "Bienvenue dans Atelier Vélo+"

### Étape 2 : Génération Automatique des Clés de Sécurité
- **Action** : Génération automatique de `NEXTAUTH_SECRET` et `AUTH_SECRET`
- **Algorithme** : `crypto.randomBytes(32).toString('base64')`
- **Sauvegarde** : Écriture automatique dans le fichier `.env`
- **Affichage** : ✅ "Clés de sécurité générées avec succès"

### Étape 3 : Informations de l'Atelier
Formulaire avec validation :

#### Onglet 1 : Informations Générales
- **Nom de l'atelier** (requis)
- **Adresse ligne 1** (requis)
- **Adresse ligne 2** (optionnel)
- **Code postal** (requis, format : 5 chiffres)
- **Ville** (requis)
- **Téléphone** (requis, format : 0X XX XX XX XX)
- **Email** (requis, validation format email)

#### Onglet 2 : Informations Légales
- **SIRET** (requis, format : 14 chiffres)
- **Numéro de TVA** (requis, format : FRXX XXXX XXXX)
- **RCS** (requis)
- **Capital social** (optionnel)
- **Assurance** (requis)
- **Régime fiscal** :
  - Radio button : "Auto-Entrepreneur (TVA 0%)" / "Régime normal (TVA 20%)"

#### Validation et Sauvegarde
- Bouton **"Valider et Continuer"**
- Écriture automatique dans `.env` :
```env
SHOP_NAME=...
SHOP_ADDRESS1=...
SHOP_ZIP=...
# etc.
```

### Étape 4 : Création du Compte Administrateur
- **Formulaire** :
  - Prénom
  - Nom
  - Email (sera l'identifiant de connexion)
  - Mot de passe (min 8 caractères)
  - Confirmation mot de passe
- **Action** : Appel API `/api/auth/register`
- **Résultat** : Compte créé automatiquement dans la base SQLite

### Étape 5 : Configuration Email (Optionnel)
- **Message** : "Voulez-vous configurer l'envoi automatique de factures par email ?"
- **Options** :
  - **"Plus tard"** (skip cette étape)
  - **"Configurer maintenant"**

Si "Configurer maintenant" :

#### Option A : Service Resend (Recommandé)
- **Instructions intégrées** :
  1. "Créez un compte gratuit sur resend.com"
  2. Lien direct : [Ouvrir Resend](https://resend.com/signup)
  3. "Copiez votre clé API (commence par `re_`)"
- **Champ** : "Clé API Resend"
- **Bouton** : "Tester la connexion"
  - Envoie un email de test
  - Affiche ✅ ou ❌

#### Option B : Configuration SMTP (Avancé)
- **Champs** :
  - Serveur SMTP (ex: smtp.gmail.com)
  - Port (ex: 587)
  - Utiliser TLS/SSL (checkbox)
  - Utilisateur
  - Mot de passe
- **Bouton** : "Tester la connexion"

### Étape 6 : Accès Internet pour Clients (Optionnel)
- **Message** : "Voulez-vous permettre à vos clients de prendre rendez-vous en ligne ?"
- **Options** :
  - **"Non, utilisation locale uniquement"** (défaut)
  - **"Oui, configurer l'accès Internet"**

Si "Oui" :

#### Tutoriel Interactif Cloudflare
1. **Étape 1** : "Créez un compte Cloudflare"
   - Lien direct : [Ouvrir Cloudflare](https://dash.cloudflare.com/sign-up)
   - Checkbox : "J'ai créé mon compte"

2. **Étape 2** : "Installez Cloudflare Tunnel"
   - Lien de téléchargement : [cloudflared pour Windows](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/)
   - Checkbox : "J'ai installé cloudflared"

3. **Étape 3** : "Copiez votre Tunnel ID"
   - Instructions : "Ouvrez PowerShell et exécutez : `cloudflared tunnel create atelier-velo`"
   - Champ : "Tunnel ID"
   - Exemple : `abc123-def456-ghi789`

4. **Étape 4** : Sauvegarde automatique
   - Écriture dans `.env` : `START_TUNNEL=1`
   - Message : "Cloudflare Tunnel sera activé au prochain démarrage"

### Étape 7 : Finalisation
- **Écran de confirmation** :
  - ✅ Clés de sécurité générées
  - ✅ Informations de l'atelier configurées
  - ✅ Compte administrateur créé
  - ✅ Email configuré (ou "Non configuré")
  - ✅ Accès Internet configuré (ou "Désactivé")
- **Bouton** : "Démarrer l'application"
- **Action** :
  - Créer le fichier flag `~/.atelier-velo-desktop/first-launch.json`
  - Redémarrer l'application (ou recharger la page)
  - Connexion automatique avec le compte créé

---

## 🔧 Implémentation Technique

### Architecture

#### 1. Modification de `apps/desktop/main.js`

```javascript
const fs = require('fs');
const path = require('path');
const { app } = require('electron');

// Détection du premier lancement
const userDataPath = app.getPath('userData');
const firstLaunchFlagPath = path.join(userDataPath, 'first-launch.json');

function isFirstLaunch() {
  return !fs.existsSync(firstLaunchFlagPath);
}

function markFirstLaunchComplete() {
  fs.writeFileSync(firstLaunchFlagPath, JSON.stringify({
    completed: true,
    timestamp: new Date().toISOString()
  }));
}

// Au démarrage
app.on('ready', () => {
  if (isFirstLaunch()) {
    // Afficher l'assistant de configuration
    mainWindow.loadURL('http://127.0.0.1:3000/setup/welcome');
  } else {
    // Charger l'application normalement
    mainWindow.loadURL('http://127.0.0.1:3000/dashboard');
  }
});
```

#### 2. Création du Module Setup API

**Nouveau fichier** : `apps/web/src/app/api/setup/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

// Générer les clés secrètes
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { action, data } = body;

  switch (action) {
    case 'generate-secrets':
      return generateSecrets();
    
    case 'save-shop-info':
      return saveShopInfo(data);
    
    case 'test-email':
      return testEmailConnection(data);
    
    case 'complete-setup':
      return completeSetup();
    
    default:
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }
}

function generateSecrets() {
  const nextauthSecret = crypto.randomBytes(32).toString('base64');
  const authSecret = crypto.randomBytes(32).toString('base64');
  
  // Écrire dans .env
  const envPath = path.join(process.cwd(), '.env');
  let envContent = fs.readFileSync(envPath, 'utf8');
  
  envContent = envContent.replace(
    /NEXTAUTH_SECRET=.*/,
    `NEXTAUTH_SECRET=${nextauthSecret}`
  );
  envContent = envContent.replace(
    /AUTH_SECRET=.*/,
    `AUTH_SECRET=${authSecret}`
  );
  
  fs.writeFileSync(envPath, envContent);
  
  return NextResponse.json({ 
    success: true,
    nextauthSecret: nextauthSecret.substring(0, 8) + '...' // Prévisualisation
  });
}

function saveShopInfo(data: any) {
  const envPath = path.join(process.cwd(), '.env');
  let envContent = fs.readFileSync(envPath, 'utf8');
  
  const fields = {
    SHOP_NAME: data.shopName,
    SHOP_ADDRESS1: data.address1,
    SHOP_ADDRESS2: data.address2 || '',
    SHOP_ZIP: data.zip,
    SHOP_CITY: data.city,
    SHOP_PHONE: data.phone,
    SHOP_EMAIL: data.email,
    SHOP_SIRET: data.siret,
    SHOP_TVA: data.tva,
    SHOP_RCS: data.rcs,
    SHOP_CAPITAL: data.capital || '',
    SHOP_INSURANCE: data.insurance,
  };
  
  Object.entries(fields).forEach(([key, value]) => {
    const regex = new RegExp(`${key}=.*`);
    envContent = envContent.replace(regex, `${key}=${value}`);
  });
  
  fs.writeFileSync(envPath, envContent);
  
  return NextResponse.json({ success: true });
}

async function testEmailConnection(data: any) {
  // Tester la connexion email (Resend ou SMTP)
  try {
    if (data.provider === 'resend') {
      // Test Resend
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${data.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: data.fromEmail,
          to: data.testEmail,
          subject: 'Test Email - Atelier Vélo+',
          text: 'Votre configuration email fonctionne correctement !'
        })
      });
      
      if (response.ok) {
        return NextResponse.json({ success: true });
      } else {
        return NextResponse.json({ 
          success: false, 
          error: 'Échec de l\'envoi. Vérifiez votre clé API.' 
        }, { status: 400 });
      }
    } else {
      // Test SMTP (à implémenter)
      return NextResponse.json({ 
        success: false, 
        error: 'SMTP non encore implémenté' 
      }, { status: 501 });
    }
  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}

function completeSetup() {
  // Marquer la configuration comme terminée
  // Le flag sera géré côté Electron (first-launch.json)
  return NextResponse.json({ success: true });
}
```

#### 3. Création des Pages Setup

**Nouveau dossier** : `apps/web/src/app/setup/`

Pages à créer :
- `setup/welcome/page.tsx` - Écran de bienvenue
- `setup/secrets/page.tsx` - Génération des clés (automatique)
- `setup/shop-info/page.tsx` - Formulaire informations atelier
- `setup/admin-account/page.tsx` - Création compte admin
- `setup/email/page.tsx` - Configuration email (optionnel)
- `setup/internet/page.tsx` - Configuration accès Internet (optionnel)
- `setup/complete/page.tsx` - Finalisation

Utiliser un **Stepper MUI** pour afficher la progression.

#### 4. Création du Hook de Setup

**Nouveau fichier** : `apps/web/src/hooks/useSetup.ts`

```typescript
import { useState } from 'react';

export function useSetup() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateSecrets = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'generate-secrets' })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const saveShopInfo = async (shopData: any) => {
    setLoading(true);
    try {
      const res = await fetch('/api/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'save-shop-info', data: shopData })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const testEmail = async (emailData: any) => {
    setLoading(true);
    try {
      const res = await fetch('/api/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'test-email', data: emailData })
      });
      const data = await res.json();
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { generateSecrets, saveShopInfo, testEmail, loading, error };
}
```

---

## 🎨 Design de l'Interface

### Wireframe de l'Assistant

```
┌─────────────────────────────────────────────────────┐
│  Atelier Vélo+ - Configuration Initiale             │
├─────────────────────────────────────────────────────┤
│                                                     │
│  [1]──[2]──[3]──[4]──[5]──[6]                      │
│   •    •    •    ○    ○    ○                       │
│                                                     │
│  ┌───────────────────────────────────────────────┐ │
│  │                                               │ │
│  │   Informations de l'Atelier                   │ │
│  │                                               │ │
│  │   Nom de l'atelier *                          │ │
│  │   ┌─────────────────────────────────────────┐ │ │
│  │   │ Mon Atelier Vélo                        │ │ │
│  │   └─────────────────────────────────────────┘ │ │
│  │                                               │ │
│  │   Adresse *                                   │ │
│  │   ┌─────────────────────────────────────────┐ │ │
│  │   │ 123 Rue du Vélo                         │ │ │
│  │   └─────────────────────────────────────────┘ │ │
│  │                                               │ │
│  │   [Code Postal]     [Ville]                   │ │
│  │   ┌─────────┐      ┌──────────────────────┐  │ │
│  │   │ 75001   │      │ Paris                │  │ │
│  │   └─────────┘      └──────────────────────┘  │ │
│  │                                               │ │
│  └───────────────────────────────────────────────┘ │
│                                                     │
│  [← Précédent]              [Suivant →]            │
└─────────────────────────────────────────────────────┘
```

### Palette de Couleurs
- **Primaire** : Bleu (#1976d2)
- **Secondaire** : Orange (#ff9800)
- **Succès** : Vert (#4caf50)
- **Erreur** : Rouge (#f44336)

---

## 📦 Amélioration de l'Installateur

### Inclure Node.js Portable dans l'Installateur

**Modification de `apps/desktop/package.json`** :

```json
{
  "build": {
    "extraResources": [
      {
        "from": "node_modules/node-portable",
        "to": "nodejs"
      },
      // ... autres ressources
    ]
  }
}
```

**Modification de `main.js`** pour utiliser Node.js embarqué :

```javascript
const nodePath = path.join(process.resourcesPath, 'nodejs', 'node.exe');
```

**Résultat** : L'utilisateur n'a plus besoin d'installer Node.js !

---

## 📋 Guide d'Installation Simplifié (Après Automatisation)

### Nouveau Guide Ultra-Court

```markdown
# Installation Rapide - Atelier Vélo+

## 1. Installation
1. Téléchargez `Atelier-Velo-Plus-Setup.exe`
2. Double-cliquez et suivez les instructions
3. Lancez l'application

## 2. Configuration (5 minutes)
Au premier lancement, un assistant vous guide :
1. ✅ Génération automatique des clés de sécurité
2. 📝 Remplissez les informations de votre atelier
3. 👤 Créez votre compte administrateur
4. ✉️ (Optionnel) Configurez l'envoi d'emails
5. 🌐 (Optionnel) Activez l'accès Internet pour vos clients

## 3. C'est terminé !
Votre application est prête à l'emploi.
```

---

## ✅ Avantages de l'Automatisation

1. **Expérience Utilisateur** :
   - Zéro manipulation de fichiers
   - Interface graphique intuitive
   - Validation en temps réel
   - Messages d'erreur clairs

2. **Sécurité** :
   - Génération automatique de clés cryptographiquement sûres
   - Pas de risque d'erreur de saisie dans `.env`
   - Validation des formats (SIRET, email, etc.)

3. **Maintenance** :
   - Centralisation de la configuration
   - Possibilité de réouvrir l'assistant (menu Paramètres)
   - Logs de configuration

4. **Réduction du Support** :
   - Moins d'erreurs de configuration
   - Tutoriels intégrés pour services externes
   - Diagnostic automatique

---

## 🚀 Plan de Développement

### Phase 1 : Core Assistant (2-3 jours)
- [x] Spécifications techniques
- [ ] Détection premier lancement
- [ ] Pages setup (Welcome, Shop Info, Admin Account)
- [ ] API setup (génération secrets, sauvegarde .env)
- [ ] Navigation entre étapes (Stepper)

### Phase 2 : Configuration Email (1 jour)
- [ ] Page setup/email
- [ ] Intégration Resend API
- [ ] Test de connexion
- [ ] Sauvegarde config dans .env

### Phase 3 : Configuration Internet (1 jour)
- [ ] Page setup/internet
- [ ] Tutoriel interactif Cloudflare
- [ ] Validation Tunnel ID

### Phase 4 : Node.js Embarqué (1 jour)
- [ ] Téléchargement de Node.js Portable
- [ ] Intégration dans electron-builder
- [ ] Modification de main.js
- [ ] Tests sur différentes machines

### Phase 5 : Tests et Documentation (1 jour)
- [ ] Tests E2E de l'assistant
- [ ] Mise à jour du guide utilisateur
- [ ] Vidéo de démonstration

**Durée totale estimée** : 6-7 jours

---

## 📝 Notes Importantes

1. **Rétrocompatibilité** :
   - Si `.env` existe déjà avec des valeurs, proposer de les garder
   - Permettre de réexécuter l'assistant depuis les Paramètres

2. **Mode Développement** :
   - Désactiver l'assistant en mode dev (`NODE_ENV=development`)
   - Ajouter un flag `SKIP_SETUP=1` pour les tests

3. **Sécurité** :
   - L'API `/api/setup` doit être protégée
   - Accessible uniquement avant la création du premier compte
   - Après configuration, désactiver cet endpoint

---

**Auteur** : Cascade AI  
**Date** : 13 janvier 2025  
**Version** : 1.0
