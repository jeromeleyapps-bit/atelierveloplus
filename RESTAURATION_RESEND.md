# 🔄 Restauration Support Resend

## ✅ Modifications Effectuées

### 1. Code Email Hybride (`/lib/email.ts`)
- ✅ Support **Resend** (priorité 1)
- ✅ Support **HubSpot** (priorité 2, avec fallback)
- ✅ Support **Nodemailer** (priorité 3, dev uniquement)

### 2. Logique de Sélection Automatique
```
SI RESEND_API_KEY existe
  → Utiliser Resend (recommandé)
SINON SI HUBSPOT_ACCESS_TOKEN existe
  → Essayer HubSpot
  → Si échec (token expiré), fallback Nodemailer
SINON
  → Utiliser Nodemailer (dev)
```

---

## 🚀 Installation

### Étape 1 : Installer les Dépendances

```powershell
cd apps/web
npm install nodemailer
npm install -D @types/nodemailer
```

### Étape 2 : Configurer Resend

**Option A : Resend (Recommandé)**

1. Créer compte : https://resend.com/signup
2. Créer API Key
3. Ajouter dans `.env` :

```env
# ===========================================
# EMAIL - RESEND (Priorité 1)
# ===========================================
RESEND_API_KEY=re_VotreCléIci
EMAIL_FROM=contact@atelier-velo.fr
# OU si pas de domaine vérifié :
# EMAIL_FROM=onboarding@resend.dev
```

**Option B : HubSpot (Si token valide)**

```env
# ===========================================
# EMAIL - HUBSPOT (Priorité 2)
# ===========================================
HUBSPOT_ACCESS_TOKEN=VotreTokenValide
HUBSPOT_FROM_EMAIL=contact@atelier-velo.fr
EMAIL_FROM=contact@atelier-velo.fr
```

**Option C : Nodemailer Dev (Fallback)**

```env
# ===========================================
# EMAIL - NODEMAILER DEV (Priorité 3)
# ===========================================
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_SECURE=false
EMAIL_FROM=contact@atelier-velo.fr
```

### Étape 3 : Redémarrer

```powershell
npm run dev:tunnel
```

---

## 🧪 Test

```powershell
node test-email-hubspot.js
```

Le script détectera automatiquement le provider disponible.

---

## 📊 Comparaison Providers

| Provider | Gratuit | Setup | Pièces Jointes | CRM |
|----------|---------|-------|----------------|-----|
| **Resend** | ✅ 3000/mois | ⚡ 5 min | ✅ | ❌ |
| **HubSpot** | ❌ Payant | ⚠️ 10 min | ✅ | ✅ |
| **Nodemailer** | ✅ Illimité | ⚡ 2 min | ✅ | ❌ |

---

## 🎯 Recommandation

**Pour production** : Resend (gratuit, fiable, simple)
**Pour dev local** : Nodemailer (aucune config)
**Pour CRM** : HubSpot (si plan payant)
