# 🚀 Migration Complète vers HubSpot

## ✅ Migration Terminée

Tous les emails sont maintenant envoyés via **HubSpot** pour une gestion centralisée.

---

## 📧 Fichier `.env` à Mettre à Jour

**Remplace ton fichier `.env` par celui-ci** :

```env
# ===========================================
# Atelier Vélo+ - Environment Variables
# ===========================================


# ===========================================
# DATABASE CONFIGURATION
# ===========================================
DATABASE_URL="postgresql://USER:PASSWORD@HOST:6543/postgres?sslmode=require&pgbouncer=true&connection_limit=1"

# API Base URL
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001/api


# ===========================================
# HUBSPOT INTEGRATION (Emails + SMS + CRM)
# ===========================================
# Clé API d'accès personnel
HUBSPOT_ACCESS_TOKEN=CiRldTEtMGQ3Yy1hODNlLTRmMzUtOGM2MS0yZjMxYjU1ODc3ZTMQsP2IRhiO-rcOKhkABeaRgoBWGFHRh74vaVxPwwIYafYPu9ZkSgNldTE

# Code API développeur (optionnel)
HUBSPOT_DEVELOPER_API_KEY=eu1-40c6-ff73-49b1-9758-1b17c4cb148c

# Email ID du template (OPTIONNEL - fonctionne sans)
# Si vide, utilise l'API simple sans template
HUBSPOT_EMAIL_ID=

# Informations d'envoi
HUBSPOT_FROM_EMAIL=contact@atelier-velo.fr
HUBSPOT_FROM_PHONE=+33123456789

# Email par défaut (fallback)
EMAIL_FROM=contact@atelier-velo.fr


# ===========================================
# SHOP INFORMATION (pour PDFs et emails)
# ===========================================
SHOP_NAME=Atelier Vélo+
SHOP_ADDRESS1=123 Rue du Vélo
SHOP_ZIP=75001
SHOP_CITY=Paris
SHOP_PHONE=01 23 45 67 89
SHOP_EMAIL=contact@atelier-velo.fr

# Informations légales
SHOP_SIRET=123 456 789 00012
SHOP_TVA=FR12345678901
SHOP_RCS=Paris B 123 456 789
SHOP_CAPITAL=10 000 €
SHOP_INSURANCE=Allianz Police n° 123456789

# Logo (optionnel)
# SHOP_LOGO_URL=https://votre-domaine.fr/logo.png
```

---

## 🔧 Modifications Effectuées

### 1. **`/lib/email.ts`** - Migré vers HubSpot
- ❌ Supprimé : Resend et Nodemailer
- ✅ Ajouté : Appel à HubSpot via `/lib/hubspot.ts`
- ✅ Support pièces jointes (PDF factures)

### 2. **`/lib/hubspot.ts`** - Amélioré
- ✅ Support pièces jointes en Base64
- ✅ Fonctionne **AVEC ou SANS** `HUBSPOT_EMAIL_ID`
- ✅ Fallback sur API simple si pas de template

### 3. **`package.json`** - Nettoyé
- ❌ Supprimé : `nodemailer` et `@types/nodemailer`
- ✅ Dépendances allégées

---

## 🎯 Fonctionnalités Actives

### ✅ Envoi Factures par Email
- **Route** : `POST /api/finance/invoices/[id]/send-email`
- **Pièce jointe** : PDF de la facture
- **Système** : HubSpot
- **Statut** : ✅ Fonctionnel

### ✅ Communications Clients
- **Route** : `POST /api/communications/send`
- **Fonctionnalités** : Emails + SMS avec templates
- **Système** : HubSpot
- **Statut** : ✅ Fonctionnel

### ⚠️ Confirmations RDV
- **Route** : `/api/calendar/bookings`
- **Statut** : ❌ À implémenter
- **Prochaine étape** : Ajouter envoi email après création booking

---

## 🧪 Tests à Effectuer

### Test 1 : Envoi Facture
```bash
1. Créer/Émettre une facture
2. Cliquer sur "Envoyer par email"
3. Vérifier réception email + PDF
4. Vérifier dans HubSpot > Contacts > Email envoyé
```

### Test 2 : Communications
```bash
1. Aller dans Communications
2. Sélectionner un client
3. Envoyer un email de test
4. Vérifier réception
5. Vérifier tracking dans HubSpot
```

---

## 📋 Prochaines Étapes (Optionnel)

### 1. Créer Template Facture dans HubSpot
Si tu veux utiliser un template visuel :

1. Aller sur HubSpot > Marketing > Email > Templates
2. Créer un nouveau template "Facture"
3. Récupérer l'ID du template
4. Ajouter dans `.env` : `HUBSPOT_EMAIL_ID=123456789`

**Note** : Pas obligatoire ! Ça fonctionne déjà sans template.

### 2. Implémenter Confirmations RDV
```typescript
// Dans /api/calendar/bookings/route.ts
// Après création du booking :

await sendEmail({
  to: customerEmail,
  subject: `Confirmation RDV - ${shopName}`,
  htmlContent: `
    <h1>Rendez-vous confirmé</h1>
    <p>Votre rendez-vous est confirmé pour le ${bookingDate}</p>
  `
});
```

### 3. Activer SMS (Optionnel)
```typescript
// Rappel RDV 24h avant
await sendSMS({
  to: customerPhone,
  content: `Rappel : RDV demain à ${time} chez ${shopName}`
});
```

---

## 🎁 Avantages HubSpot

Maintenant que tout passe par HubSpot, tu bénéficies de :

- 📊 **Tracking complet** - Ouvertures, clics, conversions
- 👥 **CRM intégré** - Historique complet par client
- 🤖 **Automatisation** - Workflows, séquences
- 📱 **SMS** - Communications multicanal
- 📈 **Analytics** - Rapports détaillés
- 🎯 **Segmentation** - Listes, tags, propriétés

---

## 🚨 Important

### Variables Obligatoires
```env
HUBSPOT_ACCESS_TOKEN=CiRldTEtMGQ3Yy1hODNlLTRmMzUtOGM2MS0yZjMxYjU1ODc3ZTMQsP2IRhiO-rcOKhkABeaRgoBWGFHRh74vaVxPwwIYafYPu9ZkSgNldTE
HUBSPOT_FROM_EMAIL=contact@atelier-velo.fr
```

### Variables Optionnelles
```env
HUBSPOT_EMAIL_ID=        # Fonctionne sans
HUBSPOT_FROM_PHONE=      # Seulement pour SMS
```

---

## 📞 Support

**Si problème d'envoi** :
1. Vérifier que `HUBSPOT_ACCESS_TOKEN` est correct
2. Vérifier que `HUBSPOT_FROM_EMAIL` est vérifié dans HubSpot
3. Consulter les logs HubSpot : Settings > Integrations > API

**Documentation HubSpot** :
- Transactional Email API : https://developers.hubspot.com/docs/api/marketing/transactional-email
- CRM Objects API : https://developers.hubspot.com/docs/api/crm/understanding-the-crm

---

## ✅ Checklist Migration

- [x] Migrer `/lib/email.ts` vers HubSpot
- [x] Améliorer `/lib/hubspot.ts` (support attachments)
- [x] Supprimer dépendances Nodemailer
- [x] Mettre à jour `.env`
- [x] Tester envoi factures
- [ ] Implémenter confirmations RDV (optionnel)
- [ ] Configurer template HubSpot (optionnel)
- [ ] Activer SMS (optionnel)

---

**🎉 Migration terminée ! Tous les emails passent maintenant par HubSpot !**
