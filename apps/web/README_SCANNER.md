# 📱 Scanner de Code-Barres - Démarrage Rapide

## ⚡ Installation (2 minutes)

```powershell
cd apps/web
.\install-barcode-scanner.ps1
```

## 🚀 Utilisation

### Sur PC (localhost)

```powershell
npm run dev
```

Puis : http://localhost:3000/admin/catalog → Bouton "Scanner"

### Sur Smartphone (recommandé)

```powershell
npm run dev:tunnel
```

1. Ouvrir sur smartphone : `https://rdv.upgradedbikes.com/admin/catalog`  
   ⚠️ **URL complète** (ne PAS utiliser juste `https://rdv.upgradedbikes.com`)
2. Se connecter
3. Cliquer "Scanner"
4. Autoriser la caméra
5. Scanner les produits

## 📖 Documentation

- **Guide complet** → `SCANNER_CODE_BARRES.md`
- **Accès mobile** → `SCANNER_ACCES_MOBILE.md`
- **Tunnel Cloudflare** → `CLOUDFLARE_TUNNEL_GUIDE.md`

## 🧪 Test Rapide

Code-barres de test : `3017620422003` (Nutella)

## 🔧 Dépannage

**Caméra ne s'ouvre pas** → Vérifier que l'URL est `https://rdv.upgradedbikes.com`  
**Produit non trouvé** → Normal pour produits spécialisés, saisir manuellement  
**Erreur npm** → `npm cache clean --force` puis réinstaller

---

**📱 Bon scan ! 🚴‍♂️**
