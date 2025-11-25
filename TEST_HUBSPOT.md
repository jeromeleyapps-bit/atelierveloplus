# 🧪 Test Configuration HubSpot

## Problème
Pas d'email reçu après réservation RDV.

## Diagnostic

### 1. Vérifier Variables d'Environnement

**Ouvre ton fichier `.env`** et vérifie que tu as :

```env
# HubSpot - OBLIGATOIRE
HUBSPOT_ACCESS_TOKEN=CiRldTEtMGQ3Yy1hODNlLTRmMzUtOGM2MS0yZjMxYjU1ODc3ZTMQsP2IRhiO-rcOKhkABeaRgoBWGFHRh74vaVxPwwIYafYPu9ZkSgNldTE

# Email - OBLIGATOIRE
HUBSPOT_FROM_EMAIL=contact@atelier-velo.fr
EMAIL_FROM=contact@atelier-velo.fr

# Shop - OBLIGATOIRE pour emails
SHOP_NAME=Atelier Vélo+
SHOP_EMAIL=contact@atelier-velo.fr
SHOP_PHONE=01 23 45 67 89
SHOP_ADDRESS1=123 Rue du Vélo
SHOP_CITY=Paris
```

### 2. Vérifier les Logs

**Dans la console où tourne `npm run dev:tunnel`**, cherche :
- `booking_email_error` - Erreur d'envoi email
- `HubSpot email error` - Erreur API HubSpot

### 3. Erreurs Possibles

#### A. Token HubSpot Invalide
```
Error: Unauthorized
```
**Solution** : Vérifier que `HUBSPOT_ACCESS_TOKEN` est correct

#### B. Email FROM Non Vérifié
```
Error: From email not verified
```
**Solution** : Vérifier l'email dans HubSpot Settings

#### C. Variables Manquantes
```
Error: Cannot read property 'shopName' of undefined
```
**Solution** : Ajouter variables SHOP_* dans `.env`

---

## 🔧 Solution Rapide

### Étape 1 : Arrêter le Serveur
```powershell
# Ctrl+C dans le terminal
```

### Étape 2 : Vérifier `.env`

**Copie-colle ce contenu dans ton `.env`** :

```env
# ===========================================
# DATABASE
# ===========================================
DATABASE_URL="postgresql://USER:PASSWORD@HOST:6543/postgres?sslmode=require&pgbouncer=true&connection_limit=1"

NEXT_PUBLIC_API_BASE_URL=http://localhost:3001/api


# ===========================================
# HUBSPOT (Emails + SMS)
# ===========================================
HUBSPOT_ACCESS_TOKEN=CiRldTEtMGQ3Yy1hODNlLTRmMzUtOGM2MS0yZjMxYjU1ODc3ZTMQsP2IRhiO-rcOKhkABeaRgoBWGFHRh74vaVxPwwIYafYPu9ZkSgNldTE
HUBSPOT_DEVELOPER_API_KEY=eu1-40c6-ff73-49b1-9758-1b17c4cb148c
HUBSPOT_FROM_EMAIL=contact@atelier-velo.fr
HUBSPOT_FROM_PHONE=+33123456789
HUBSPOT_EMAIL_ID=

EMAIL_FROM=contact@atelier-velo.fr


# ===========================================
# SHOP INFORMATION
# ===========================================
SHOP_NAME=Atelier Vélo+
SHOP_ADDRESS1=123 Rue du Vélo
SHOP_ZIP=75001
SHOP_CITY=Paris
SHOP_PHONE=01 23 45 67 89
SHOP_EMAIL=contact@atelier-velo.fr

SHOP_SIRET=123 456 789 00012
SHOP_TVA=FR12345678901
SHOP_RCS=Paris B 123 456 789
SHOP_CAPITAL=10 000 €
SHOP_INSURANCE=Allianz Police n° 123456789
```

### Étape 3 : Redémarrer
```powershell
npm run dev:tunnel
```

### Étape 4 : Tester à Nouveau
1. Aller sur `https://rdv.upgradedbikes.com`
2. Réserver un créneau
3. Vérifier les logs dans le terminal

---

## 🔍 Debug Avancé

Si toujours pas d'email, ajoute des logs :

### Modifier temporairement le code

**Fichier** : `apps/web/src/app/api/calendar/bookings/route.ts`

**Ligne 248**, remplace :
```typescript
  } catch (e) {
    console.error("booking_email_error", e);
  }
```

Par :
```typescript
  } catch (e: any) {
    console.error("❌ ERREUR EMAIL:", e);
    console.error("Message:", e.message);
    console.error("Stack:", e.stack);
  }
```

Puis redémarre et reteste.

---

## 🎯 Vérification HubSpot

### Test 1 : Vérifier Token
```bash
# Dans un terminal PowerShell
$token = "CiRldTEtMGQ3Yy1hODNlLTRmMzUtOGM2MS0yZjMxYjU1ODc3ZTMQsP2IRhiO-rcOKhkABeaRgoBWGFHRh74vaVxPwwIYafYPu9ZkSgNldTE"
$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}
Invoke-RestMethod -Uri "https://api.hubapi.com/account-info/v3/api-usage/daily" -Headers $headers
```

**Résultat attendu** : Informations sur ton compte HubSpot

**Si erreur** : Token invalide ou expiré

### Test 2 : Vérifier Email FROM

1. Aller sur https://app.hubspot.com/
2. Settings > Marketing > Email
3. Vérifier que `contact@atelier-velo.fr` est vérifié

---

## 📧 Alternative Temporaire

Si HubSpot ne fonctionne pas, utilise Nodemailer temporairement :

### Installer Nodemailer
```bash
npm install nodemailer @types/nodemailer
```

### Configurer SMTP dans `.env`
```env
# Gmail (exemple)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=ton-email@gmail.com
SMTP_PASS=ton-mot-de-passe-app
```

---

## ✅ Checklist

- [ ] Variables HUBSPOT_* dans `.env`
- [ ] Variables SHOP_* dans `.env`
- [ ] Serveur redémarré
- [ ] Logs vérifiés
- [ ] Token HubSpot testé
- [ ] Email FROM vérifié dans HubSpot

---

**Commence par vérifier ton `.env` et redémarrer le serveur !**
