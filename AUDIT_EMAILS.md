# 📧 Audit Système d'Envoi d'Emails

## 🔍 État Actuel

### 2 Systèmes Parallèles

#### 1. **Resend/Nodemailer** (`/lib/email.ts`)
**Utilisé pour**: Envoi de factures
- ✅ Implémenté et fonctionnel
- 📄 Fichier: `apps/web/src/lib/email.ts`
- 🔧 Variables d'environnement:
  - `RESEND_API_KEY` (production)
  - `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` (dev)
  - `EMAIL_FROM`

**Endpoints utilisant ce système**:
- ✅ `POST /api/finance/invoices/[id]/send-email` - Envoi facture par email

#### 2. **HubSpot** (`/lib/hubspot.ts`)
**Utilisé pour**: Communications clients (emails marketing/transactionnels + SMS)
- ✅ Implémenté et fonctionnel
- 📄 Fichier: `apps/web/src/lib/hubspot.ts`
- 🔧 Variables d'environnement:
  - `HUBSPOT_ACCESS_TOKEN` ✅ (présent dans .env)
  - `HUBSPOT_EMAIL_ID` ❌ (manquant - requis)
  - `HUBSPOT_FROM_EMAIL` (optionnel)
  - `HUBSPOT_FROM_PHONE` (optionnel)

**Endpoints utilisant ce système**:
- ✅ `POST /api/communications/send` - Envoi email/SMS via templates

---

## 📍 Pages avec Envoi d'Emails

### 1. **Page Facture Détail** (`/finance/invoices/[id]`)
- 📄 Fichier: `apps/web/src/app/finance/invoices/[id]/page.tsx`
- 🔧 Système: **Resend/Nodemailer**
- ✅ Statut: **Fonctionnel**
- 📧 Fonctionnalité: Bouton "Envoyer par email" pour factures émises
- 📎 Pièce jointe: PDF de la facture

**Code actuel**:
```typescript
// Ligne ~XXX dans page.tsx
const handleSendEmail = async () => {
  const response = await fetch(`/api/finance/invoices/${id}/send-email`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` }
  });
  // ...
};
```

### 2. **Page Communications** (`/admin/communications`)
- 📄 Fichier: `apps/web/src/app/admin/communications/page.tsx` (probable)
- 🔧 Système: **HubSpot**
- ⚠️ Statut: **Nécessite configuration HubSpot**
- 📧 Fonctionnalité: Envoi d'emails/SMS via templates
- 🎯 Variables: Remplacement automatique ({{firstName}}, {{lastName}}, etc.)

**Code actuel**:
```typescript
// API: /api/communications/send
await sendEmail({
  to: customer.email,
  subject: subject,
  htmlContent: content
});
```

### 3. **Confirmations RDV** (`/api/calendar/bookings`)
- 📄 Fichier: `apps/web/src/app/api/calendar/bookings/route.ts`
- 🔧 Système: **Aucun (commenté)**
- ❌ Statut: **Non implémenté**
- 📧 Fonctionnalité: Email de confirmation après prise de RDV

**Code actuel**:
```typescript
// Ligne ~XXX - Code commenté
// TODO: Send confirmation email
```

---

## 🔧 Configuration Requise

### Pour Resend/Nodemailer (Factures)

#### Production
```env
RESEND_API_KEY=re_xxxxxxxxxxxxx
EMAIL_FROM=noreply@atelier-velo.fr
```

#### Développement
```env
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_SECURE=false
SMTP_USER=
SMTP_PASS=
EMAIL_FROM=noreply@atelier-velo.fr
```

### Pour HubSpot (Communications)

```env
HUBSPOT_ACCESS_TOKEN=your-hubspot-access-token  ✅ Présent
HUBSPOT_EMAIL_ID=123456789                      ❌ MANQUANT
HUBSPOT_FROM_EMAIL=contact@atelier-velo.fr
HUBSPOT_FROM_PHONE=+33612345678
```

**⚠️ PROBLÈME**: `HUBSPOT_EMAIL_ID` est requis mais manquant !

---

## 🚨 Problèmes Identifiés

### 1. **HubSpot Email ID Manquant**
- ❌ Variable `HUBSPOT_EMAIL_ID` non définie
- 🔧 Requis pour: `/api/communications/send`
- 📝 Solution: Créer un template email dans HubSpot et récupérer son ID

### 2. **Confirmations RDV Non Implémentées**
- ❌ Pas d'email de confirmation après prise de RDV
- 🔧 Système recommandé: **HubSpot** (pour cohérence)
- 📝 Solution: Implémenter l'envoi via HubSpot

### 3. **Deux Systèmes Parallèles**
- ⚠️ Resend/Nodemailer pour factures
- ⚠️ HubSpot pour communications
- 📝 Recommandation: Unifier sur **HubSpot** pour tout

---

## ✅ Recommandations

### Option 1: Unifier sur HubSpot (Recommandé)
**Avantages**:
- ✅ Un seul système à maintenir
- ✅ Tracking centralisé dans HubSpot
- ✅ Gestion contacts automatique
- ✅ Templates réutilisables
- ✅ Support SMS intégré

**Actions**:
1. Créer template email facture dans HubSpot
2. Migrer `/lib/email.ts` vers `/lib/hubspot.ts`
3. Ajouter support pièces jointes dans HubSpot
4. Configurer `HUBSPOT_EMAIL_ID`

### Option 2: Garder les Deux Systèmes
**Avantages**:
- ✅ Déjà fonctionnel pour factures
- ✅ Moins de changements

**Inconvénients**:
- ❌ Maintenance de 2 systèmes
- ❌ Tracking dispersé
- ❌ Coûts doubles (Resend + HubSpot)

---

## 📋 Plan d'Action

### Étape 1: Configuration HubSpot Email ID
1. Se connecter à HubSpot
2. Aller dans Marketing > Email > Templates
3. Créer un template "Facture"
4. Récupérer l'ID du template
5. Ajouter `HUBSPOT_EMAIL_ID=123456789` dans `.env`

### Étape 2: Tester Communications
1. Vérifier que `/api/communications/send` fonctionne
2. Tester envoi email simple
3. Tester envoi SMS

### Étape 3: Implémenter Confirmations RDV
1. Créer template HubSpot "Confirmation RDV"
2. Modifier `/api/calendar/bookings/route.ts`
3. Ajouter appel `sendEmail()` après création booking

### Étape 4 (Optionnel): Migration Factures vers HubSpot
1. Créer template HubSpot avec support PDF
2. Migrer route `/api/finance/invoices/[id]/send-email`
3. Tester envoi factures
4. Désactiver Resend/Nodemailer

---

## 🧪 Tests à Effectuer

### Test 1: Envoi Facture
```bash
# Émettre une facture
# Cliquer sur "Envoyer par email"
# Vérifier réception email + PDF
```

### Test 2: Communications HubSpot
```bash
# Aller dans Communications
# Sélectionner client
# Envoyer email de test
# Vérifier réception
```

### Test 3: Confirmation RDV (après implémentation)
```bash
# Prendre un RDV sur /rdv
# Vérifier email de confirmation
```

---

## 📞 Support

**HubSpot**:
- Documentation: https://developers.hubspot.com/docs/api/overview
- Support: https://help.hubspot.com/

**Resend**:
- Documentation: https://resend.com/docs
- Support: support@resend.com
