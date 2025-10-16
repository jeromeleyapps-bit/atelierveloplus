# 📧 Système Email Unifié - Documentation Complète

## 🎯 Vue d'Ensemble

Le système d'envoi d'emails supporte maintenant **3 providers** avec sélection automatique intelligente :

```
Priority 1: RESEND     → Recommandé (gratuit, fiable)
Priority 2: HUBSPOT    → Si token valide (payant)
Priority 3: NODEMAILER → Fallback dev (local)
```

---

## 🔧 Configuration

### Option 1 : Resend (Recommandé) ⭐

**Avantages** :
- ✅ Gratuit : 3000 emails/mois
- ✅ Setup rapide : 5 minutes
- ✅ Pièces jointes PDF
- ✅ Excellente délivrabilité
- ✅ API moderne

**Setup** :
1. Créer compte : https://resend.com/signup
2. Créer API Key : Dashboard > API Keys > Create
3. Ajouter dans `.env` :

```env
RESEND_API_KEY=re_VotreCléIci
EMAIL_FROM=contact@atelier-velo.fr
```

**Domaine personnalisé (optionnel)** :
- Dashboard > Domains > Add Domain
- Configurer DNS (SPF, DKIM, DMARC)
- Sinon utiliser : `onboarding@resend.dev`

---

### Option 2 : HubSpot (Si Plan Payant)

**Avantages** :
- ✅ Intégration CRM
- ✅ Tracking avancé
- ✅ Workflows automatisés

**Inconvénients** :
- ❌ Nécessite Marketing Hub Starter (€45/mois minimum)
- ❌ Setup plus complexe

**Setup** :
1. HubSpot > Settings > Integrations > Private Apps
2. Create app avec scope `transactional-email`
3. Copier le token
4. Ajouter dans `.env` :

```env
HUBSPOT_ACCESS_TOKEN=VotreTokenValide
HUBSPOT_FROM_EMAIL=contact@atelier-velo.fr
EMAIL_FROM=contact@atelier-velo.fr
```

---

### Option 3 : Nodemailer (Dev Uniquement)

**Avantages** :
- ✅ Gratuit illimité
- ✅ Aucune config externe
- ✅ Parfait pour dev local

**Inconvénients** :
- ❌ Ne fonctionne qu'en local
- ❌ Pas de délivrabilité en production

**Setup** :
1. Installer MailHog (optionnel) : https://github.com/mailhog/MailHog
2. Ou laisser les valeurs par défaut (localhost:1025)
3. Ajouter dans `.env` (optionnel) :

```env
SMTP_HOST=localhost
SMTP_PORT=1025
EMAIL_FROM=contact@atelier-velo.fr
```

---

## 🚀 Utilisation

Le code détecte automatiquement le provider disponible :

```typescript
import { sendEmail } from '@/lib/email';

await sendEmail({
  to: 'client@example.com',
  subject: 'Votre facture',
  html: '<h1>Facture</h1>',
  attachments: [{
    filename: 'facture.pdf',
    content: pdfBuffer,
    contentType: 'application/pdf',
  }],
});
```

**Logs automatiques** :
```
📧 Envoi email via Resend...
✅ Email envoyé via Resend
```

---

## 🧪 Test

### Test Rapide

```powershell
cd apps/web
node test-email-hubspot.js
```

Le script affiche :
- ✅ Variables d'environnement détectées
- ✅ Provider utilisé
- ✅ Résultat de l'envoi

### Test Complet (Booking)

1. Aller sur : `https://rdv.upgradedbikes.com`
2. Réserver un créneau avec ton email
3. Vérifier les logs du serveur
4. Vérifier réception de l'email

---

## 📊 Comparaison Providers

| Critère | Resend | HubSpot | Nodemailer |
|---------|--------|---------|------------|
| **Prix** | Gratuit 3000/mois | €45+/mois | Gratuit |
| **Setup** | 5 min | 10 min | 2 min |
| **Pièces jointes** | ✅ | ✅ | ✅ |
| **CRM** | ❌ | ✅ | ❌ |
| **Production** | ✅ | ✅ | ❌ |
| **Dev local** | ✅ | ✅ | ✅ |
| **Délivrabilité** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐ |

---

## 🔍 Dépannage

### Erreur : "Cannot find module 'nodemailer'"

```powershell
cd apps/web
npm install nodemailer @types/nodemailer
```

### Erreur : "Token expired" (HubSpot)

Le système bascule automatiquement sur Nodemailer. Pour corriger :
1. Régénérer le token HubSpot
2. Ou configurer Resend

### Aucun email reçu

1. Vérifier les logs du serveur
2. Vérifier spam/courrier indésirable
3. Tester avec `node test-email-hubspot.js`
4. Vérifier la variable `EMAIL_FROM`

---

## 📝 Fichiers Modifiés

### `/lib/email.ts`
- ✅ Support multi-provider
- ✅ Sélection automatique
- ✅ Fallback intelligent
- ✅ Logs détaillés

### `/lib/hubspot.ts`
- ✅ Support pièces jointes base64
- ✅ Gestion erreurs améliorée

### `.env.example`
- ✅ Documentation 3 options
- ✅ Exemples de configuration

### `package.json`
- ✅ Dépendance `nodemailer` restaurée
- ✅ Types TypeScript

---

## 🎯 Recommandation Finale

**Pour un atelier vélo** :

1. **Démarrer avec Resend** (gratuit, simple)
2. **Passer à HubSpot** si besoin CRM avancé
3. **Utiliser Nodemailer** uniquement en dev

**Configuration minimale** :
```env
RESEND_API_KEY=re_VotreCléIci
EMAIL_FROM=contact@atelier-velo.fr
```

C'est tout ! 🎉
