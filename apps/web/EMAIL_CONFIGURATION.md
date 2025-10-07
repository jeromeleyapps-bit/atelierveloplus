# 📧 Configuration Email - Guide Complet

## 🎯 Objectif

Configurer l'envoi d'emails pour :
- ✅ Confirmations de RDV clients
- ✅ Notifications "Vélo prêt"
- ✅ Envoi de factures
- ✅ Relances de paiement

---

## 🔧 Configuration SMTP

### **1. Ajouter les Variables d'Environnement**

Éditez le fichier `.env.local` dans `apps/web/` :

```bash
# Configuration SMTP
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=votre-email@gmail.com
SMTP_PASS=votre-mot-de-passe-app
SMTP_FROM=noreply@upgradedbikes.com
SHOP_EMAIL=contact@upgradedbikes.com
```

---

## 📧 Options de Fournisseurs SMTP

### **Option 1 : Gmail (Recommandé pour Tests)** ⭐

**Avantages** :
- ✅ Gratuit
- ✅ Facile à configurer
- ✅ 500 emails/jour

**Configuration** :

1. **Activer l'authentification à 2 facteurs** :
   - Aller sur https://myaccount.google.com/security
   - Activer "Validation en deux étapes"

2. **Créer un mot de passe d'application** :
   - Aller sur https://myaccount.google.com/apppasswords
   - Sélectionner "Autre (nom personnalisé)"
   - Nommer : "Atelier Velo"
   - Copier le mot de passe généré (16 caractères)

3. **Configurer `.env.local`** :
```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=votre-email@gmail.com
SMTP_PASS=abcd efgh ijkl mnop  # Mot de passe app (sans espaces)
SMTP_FROM=votre-email@gmail.com
SHOP_EMAIL=votre-email@gmail.com
```

---

### **Option 2 : Brevo (ex-Sendinblue)** 🚀

**Avantages** :
- ✅ 300 emails/jour gratuits
- ✅ Professionnel
- ✅ Statistiques d'envoi

**Configuration** :

1. **Créer un compte** : https://www.brevo.com/fr/
2. **Obtenir les clés SMTP** :
   - Aller dans "SMTP & API"
   - Copier les identifiants SMTP

3. **Configurer `.env.local`** :
```bash
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_USER=votre-email@brevo.com
SMTP_PASS=votre-cle-smtp
SMTP_FROM=noreply@upgradedbikes.com
SHOP_EMAIL=contact@upgradedbikes.com
```

---

### **Option 3 : Mailgun** 💪

**Avantages** :
- ✅ 5000 emails/mois gratuits (3 mois)
- ✅ Très fiable
- ✅ API puissante

**Configuration** :

1. **Créer un compte** : https://www.mailgun.com/
2. **Vérifier votre domaine**
3. **Obtenir les clés SMTP**

```bash
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_USER=postmaster@mg.upgradedbikes.com
SMTP_PASS=votre-cle-smtp
SMTP_FROM=noreply@upgradedbikes.com
SHOP_EMAIL=contact@upgradedbikes.com
```

---

### **Option 4 : OVH (Si vous avez un hébergement)** 🏢

**Configuration** :

```bash
SMTP_HOST=ssl0.ovh.net
SMTP_PORT=587
SMTP_USER=contact@upgradedbikes.com
SMTP_PASS=votre-mot-de-passe-email
SMTP_FROM=contact@upgradedbikes.com
SHOP_EMAIL=contact@upgradedbikes.com
```

---

## 🧪 Test de Configuration

### **1. Redémarrer l'Application**

```powershell
# Arrêter (Ctrl+C)
# Relancer
pnpm dev:tunnel
```

### **2. Tester une Réservation**

1. Aller sur `https://rdv.upgradedbikes.com/booking-local`
2. Remplir le formulaire avec votre email
3. Réserver un créneau
4. ✅ Vous devriez recevoir un email de confirmation

### **3. Vérifier les Logs**

Dans le terminal, vous devriez voir :
```
[mailer] Email sent successfully to: votre-email@gmail.com
```

Au lieu de :
```
[mailer] SMTP not configured. Email would be sent: {...}
```

---

## 📋 Emails Envoyés par l'Application

### **1. Confirmation de RDV Client** 📅
- **Destinataire** : Client
- **Déclencheur** : Réservation via `/booking-local`
- **Contenu** : Date, heure, informations du RDV

### **2. Notification Admin** 👑
- **Destinataire** : `SHOP_EMAIL`
- **Déclencheur** : Nouvelle réservation
- **Contenu** : Détails du client et du RDV

### **3. Vélo Prêt** 🚴
- **Destinataire** : Client
- **Déclencheur** : Bouton "Email Vélo prêt" dans le ticket
- **Contenu** : Notification que le vélo est prêt

### **4. Factures** 💰
- **Destinataire** : Client
- **Déclencheur** : Envoi de facture
- **Contenu** : Facture en PDF

### **5. Relances** ⏰
- **Destinataire** : Client
- **Déclencheur** : Relance de paiement
- **Contenu** : Rappel de paiement

---

## 🔒 Sécurité

### **Bonnes Pratiques** :

1. ✅ **Ne jamais commiter `.env.local`** (déjà dans `.gitignore`)
2. ✅ **Utiliser des mots de passe d'application** (pas votre mot de passe principal)
3. ✅ **Limiter les permissions** SMTP
4. ✅ **Surveiller les quotas** d'envoi

### **Variables Sensibles** :
```bash
# ❌ NE JAMAIS PARTAGER
SMTP_PASS=...

# ✅ Peut être partagé
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
```

---

## 🎨 Personnalisation des Emails

### **Modifier le Contenu**

**Fichier** : `apps/web/src/app/api/calendar/bookings/route.ts`

```typescript
// Ligne 200 - Email client
const text = `Bonjour ${data.name},

Votre rendez-vous a été confirmé !

📅 Date : ${new Date(start).toLocaleDateString('fr-FR')}
⏰ Heure : ${new Date(start).toLocaleTimeString('fr-FR')}
🚴 Vélo : ${data.bike || 'Non spécifié'}

Nous vous attendons à l'atelier.

Cordialement,
L'équipe Upgraded Bikes`;
```

---

## 📊 Monitoring

### **Vérifier les Envois**

**Gmail** :
- Aller dans "Envoyés"
- Vérifier les emails sortants

**Brevo** :
- Dashboard → Statistiques
- Voir les emails envoyés, ouverts, cliqués

**Logs Application** :
```powershell
# Voir les logs en temps réel
# Dans le terminal où tourne l'app
```

---

## ❓ Dépannage

### **Problème 1 : "SMTP not configured"**

**Solution** :
- Vérifier que `.env.local` contient les variables SMTP
- Redémarrer l'application
- Vérifier les logs

### **Problème 2 : "Authentication failed"**

**Solution Gmail** :
- Vérifier que l'authentification 2FA est activée
- Régénérer un mot de passe d'application
- Copier sans espaces

**Solution Brevo** :
- Vérifier la clé SMTP
- Vérifier que le compte est activé

### **Problème 3 : "Connection timeout"**

**Solution** :
- Vérifier le firewall Windows
- Vérifier le port (587 ou 465)
- Essayer avec un autre fournisseur

---

## ✅ Checklist Configuration

- [ ] Variables SMTP ajoutées dans `.env.local`
- [ ] Application redémarrée
- [ ] Test de réservation effectué
- [ ] Email de confirmation reçu
- [ ] Email admin reçu
- [ ] Logs vérifiés

---

## 🎉 Configuration Recommandée

**Pour Démarrer (Tests)** :
```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=votre-email@gmail.com
SMTP_PASS=mot-de-passe-app
SMTP_FROM=votre-email@gmail.com
SHOP_EMAIL=votre-email@gmail.com
```

**Pour Production** :
```bash
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_USER=votre-compte@brevo.com
SMTP_PASS=cle-smtp-brevo
SMTP_FROM=noreply@upgradedbikes.com
SHOP_EMAIL=contact@upgradedbikes.com
```

---

## 📞 Support

**Gmail** : https://support.google.com/mail/answer/185833  
**Brevo** : https://help.brevo.com/  
**Mailgun** : https://documentation.mailgun.com/

---

**Prêt à configurer ? Suivez les étapes ci-dessus !** 📧✨
