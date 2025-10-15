# 🔧 Diagnostic Tunnel RDV - rdv.upgradedbikes.com

## 🚨 Problème

Le tunnel Cloudflare `rdv.upgradedbikes.com` est down et inaccessible.

---

## 📋 Configuration Actuelle

### Script de Démarrage
- **Fichier** : `apps/web/start-tunnel.ps1`
- **Commande** : `npm run dev:tunnel`
- **Dépendances** :
  - `C:\cloudflared\cloudflared.exe`
  - `C:\cloudflared\config.yml`

### Problème Identifié
Le tunnel nécessite Cloudflare Tunnel (anciennement Argo Tunnel) configuré.

---

## 🎯 Solutions Disponibles

### ✅ Solution 1 : Utiliser Localhost (Recommandé pour Dev)

**Avantages** :
- ✅ Fonctionne immédiatement
- ✅ Pas de configuration externe
- ✅ Rapide et stable

**Inconvénients** :
- ❌ Pas accessible depuis l'extérieur
- ❌ Pas de HTTPS (sauf avec certificat local)

**Utilisation** :
```bash
# Démarrer l'app normalement
npm run dev

# Accéder à :
http://localhost:3000/rdv
```

---

### ✅ Solution 2 : Cloudflare Tunnel (Actuel - À Réparer)

**Avantages** :
- ✅ HTTPS automatique
- ✅ Accessible depuis n'importe où
- ✅ Domaine personnalisé

**Inconvénients** :
- ❌ Configuration complexe
- ❌ Nécessite compte Cloudflare
- ❌ Peut être instable

**Étapes de Réparation** :

#### 1. Vérifier Installation
```powershell
# Vérifier si cloudflared est installé
Test-Path "C:\cloudflared\cloudflared.exe"

# Vérifier config
Test-Path "C:\cloudflared\config.yml"
```

#### 2. Réinstaller Cloudflared (si manquant)
```powershell
# Télécharger cloudflared
Invoke-WebRequest -Uri "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe" -OutFile "C:\cloudflared\cloudflared.exe"

# Authentifier
C:\cloudflared\cloudflared.exe login
```

#### 3. Créer/Vérifier config.yml
```yaml
# C:\cloudflared\config.yml
tunnel: atelier-velo
credentials-file: C:\cloudflared\atelier-velo.json

ingress:
  - hostname: rdv.upgradedbikes.com
    service: http://localhost:3000
  - service: http_status:404
```

#### 4. Créer le Tunnel (si nouveau)
```powershell
# Créer tunnel
C:\cloudflared\cloudflared.exe tunnel create atelier-velo

# Configurer DNS
C:\cloudflared\cloudflared.exe tunnel route dns atelier-velo rdv.upgradedbikes.com

# Démarrer
npm run dev:tunnel
```

---

### ✅ Solution 3 : Ngrok (Alternative Simple)

**Avantages** :
- ✅ Installation simple
- ✅ HTTPS automatique
- ✅ Gratuit pour usage basique

**Inconvénients** :
- ❌ URL change à chaque démarrage (version gratuite)
- ❌ Limite de requêtes

**Installation** :
```powershell
# Installer via Chocolatey
choco install ngrok

# Ou télécharger : https://ngrok.com/download
```

**Utilisation** :
```bash
# Terminal 1 : Démarrer Next.js
npm run dev

# Terminal 2 : Démarrer ngrok
ngrok http 3000

# URL fournie : https://xxxx-xx-xx-xx-xx.ngrok.io
```

---

### ✅ Solution 4 : Localtunnel (Alternative Gratuite)

**Avantages** :
- ✅ Très simple
- ✅ Pas de compte requis
- ✅ Subdomain personnalisé possible

**Installation** :
```bash
npm install -g localtunnel
```

**Utilisation** :
```bash
# Terminal 1 : Démarrer Next.js
npm run dev

# Terminal 2 : Démarrer tunnel
lt --port 3000 --subdomain atelier-velo

# URL : https://atelier-velo.loca.lt
```

---

### ✅ Solution 5 : Vercel Dev (Pour Tests)

**Avantages** :
- ✅ Intégré avec Next.js
- ✅ HTTPS automatique
- ✅ Gratuit

**Installation** :
```bash
npm install -g vercel
```

**Utilisation** :
```bash
# Dans le dossier apps/web
vercel dev

# URL fournie automatiquement
```

---

## 🎯 Recommandation

### Pour Développement Local
**→ Solution 1 : Localhost**
- Simple et rapide
- Pas de configuration
- Utiliser : `http://localhost:3000/rdv`

### Pour Tests Externes (Smartphone, etc.)
**→ Solution 3 : Ngrok**
- Installation simple
- HTTPS automatique
- Gratuit

### Pour Production
**→ Solution 2 : Cloudflare Tunnel**
- Domaine personnalisé
- Stable et rapide
- Nécessite configuration initiale

---

## 🔧 Script de Diagnostic

Créons un script pour diagnostiquer le problème :

```powershell
# diagnostic-tunnel.ps1

Write-Host "=== Diagnostic Tunnel Cloudflare ===" -ForegroundColor Cyan
Write-Host ""

# 1. Vérifier cloudflared
Write-Host "1. Verification cloudflared.exe..." -ForegroundColor Yellow
if (Test-Path "C:\cloudflared\cloudflared.exe") {
    Write-Host "   ✅ cloudflared.exe trouve" -ForegroundColor Green
    $version = & "C:\cloudflared\cloudflared.exe" --version
    Write-Host "   Version: $version" -ForegroundColor White
} else {
    Write-Host "   ❌ cloudflared.exe MANQUANT" -ForegroundColor Red
    Write-Host "   Solution: Reinstaller cloudflared" -ForegroundColor Yellow
}

Write-Host ""

# 2. Vérifier config
Write-Host "2. Verification config.yml..." -ForegroundColor Yellow
if (Test-Path "C:\cloudflared\config.yml") {
    Write-Host "   ✅ config.yml trouve" -ForegroundColor Green
    Write-Host "   Contenu:" -ForegroundColor White
    Get-Content "C:\cloudflared\config.yml" | ForEach-Object { Write-Host "   $_" }
} else {
    Write-Host "   ❌ config.yml MANQUANT" -ForegroundColor Red
    Write-Host "   Solution: Creer config.yml" -ForegroundColor Yellow
}

Write-Host ""

# 3. Vérifier credentials
Write-Host "3. Verification credentials..." -ForegroundColor Yellow
if (Test-Path "C:\cloudflared\*.json") {
    Write-Host "   ✅ Fichier credentials trouve" -ForegroundColor Green
} else {
    Write-Host "   ❌ Fichier credentials MANQUANT" -ForegroundColor Red
    Write-Host "   Solution: Executer 'cloudflared login'" -ForegroundColor Yellow
}

Write-Host ""

# 4. Tester connexion
Write-Host "4. Test connexion localhost:3000..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000" -TimeoutSec 5 -ErrorAction Stop
    Write-Host "   ✅ Next.js accessible" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Next.js NON accessible" -ForegroundColor Red
    Write-Host "   Solution: Demarrer 'npm run dev' d'abord" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=== Fin du diagnostic ===" -ForegroundColor Cyan
```

---

## 🚀 Actions Immédiates

### Option A : Utiliser Localhost (Rapide)
```bash
# Démarrer normalement
npm run dev

# Accéder à
http://localhost:3000/rdv
```

### Option B : Réparer Cloudflare Tunnel
```powershell
# 1. Exécuter diagnostic
.\diagnostic-tunnel.ps1

# 2. Suivre les recommandations
# 3. Redémarrer tunnel
npm run dev:tunnel
```

### Option C : Utiliser Ngrok (Alternative)
```bash
# Terminal 1
npm run dev

# Terminal 2
ngrok http 3000
```

---

## 📞 Support

### Cloudflare Tunnel
- Documentation : https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/
- Support : https://community.cloudflare.com/

### Ngrok
- Documentation : https://ngrok.com/docs
- Dashboard : https://dashboard.ngrok.com/

---

## ✅ Checklist Réparation

- [ ] Vérifier si cloudflared est installé
- [ ] Vérifier config.yml existe
- [ ] Vérifier credentials existe
- [ ] Tester connexion localhost:3000
- [ ] Redémarrer tunnel
- [ ] Tester accès rdv.upgradedbikes.com

---

**💡 Conseil** : Pour le développement quotidien, utilise `localhost`. Pour les tests externes (smartphone, démo client), utilise Ngrok ou répare Cloudflare Tunnel.
