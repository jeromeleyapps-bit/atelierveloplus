# 📧 Configuration Resend (Alternative Gratuite)

## Pourquoi Resend ?
- ✅ **Gratuit** : 100 emails/jour, 3000/mois
- ✅ **Simple** : API moderne, 5 min setup
- ✅ **Fiable** : Utilisé par Vercel, Linear, etc.
- ✅ **Pièces jointes** : Support PDF pour factures

---

## 🚀 Setup en 5 Minutes

### Étape 1 : Créer un Compte Resend

1. Va sur : https://resend.com/signup
2. Inscris-toi avec ton email
3. Vérifie ton email

### Étape 2 : Créer une API Key

1. Dans le dashboard Resend
2. Va dans **API Keys**
3. **Create API Key**
   - Name: `Atelier Vélo+ Production`
   - Permission: `Sending access`
4. **Copie la clé** (tu ne la reverras plus !)

### Étape 3 : Configurer le Domaine (Optionnel mais Recommandé)

**Pour envoyer depuis `contact@atelier-velo.fr`** :

1. Dans Resend, va dans **Domains**
2. **Add Domain** : `atelier-velo.fr`
3. Ajoute les **DNS records** chez ton hébergeur :
   - SPF
   - DKIM
   - DMARC
4. **Verify** (peut prendre quelques minutes)

**OU utilise le domaine Resend** (immédiat) :
- Emails envoyés depuis `onboarding@resend.dev`
- Fonctionne immédiatement, pas de config DNS

### Étape 4 : Mettre à Jour `.env`

```env
# ===========================================
# EMAIL - RESEND
# ===========================================
RESEND_API_KEY=re_VotreCléIci
EMAIL_FROM=contact@atelier-velo.fr
# OU si pas de domaine vérifié :
# EMAIL_FROM=onboarding@resend.dev

# Commenter HubSpot
# HUBSPOT_ACCESS_TOKEN=...
```

### Étape 5 : Installer le Package

```powershell
cd apps/web
npm install resend
```

---

## 📝 Modifications Code Nécessaires

Je vais modifier `/lib/email.ts` pour utiliser Resend au lieu de HubSpot.

---

## 💰 Tarifs Resend

| Plan | Prix | Emails/mois |
|------|------|-------------|
| **Free** | 0€ | 3,000 |
| Pro | 20€ | 50,000 |
| Business | 80€ | 100,000 |

Pour un atelier vélo, le plan gratuit est largement suffisant !

---

## 🎯 Prochaines Étapes

1. Crée ton compte Resend
2. Copie l'API Key
3. Dis-moi quand c'est fait, je modifie le code
