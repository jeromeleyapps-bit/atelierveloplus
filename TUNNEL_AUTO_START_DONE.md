# ✅ Tunnel Auto-Start Activé !

**Date**: 15 octobre 2025 - 10h15  
**Statut**: ✅ Modifications appliquées

---

## 🎯 Modifications Effectuées

### Fichier: `apps/desktop/main.js`

#### 1. Suppression Condition START_TUNNEL
**Avant**:
```javascript
if (process.env.START_TUNNEL !== '1') {
  console.log('[Tunnel] Skipped...');
} else {
  console.log('[Tunnel] Deferred start...');
}
```

**Après**:
```javascript
// Tunnel Cloudflare: Auto-start activé pour RDV clients
// Le tunnel permet aux clients de prendre RDV en ligne via URL publique
console.log('[Tunnel] Auto-start enabled: Tunnel will launch after server is ready.');
console.log('[Tunnel] This allows clients to book appointments online.');
```

#### 2. Auto-Start dans waitForServer
**Avant**:
```javascript
if (process.env.START_TUNNEL === '1' && !tunnelStarted) {
  console.log('[Tunnel] Conditions met...');
  tunnelStarted = true;
  setTimeout(() => startCloudfareTunnel(), 200);
}
```

**Après**:
```javascript
// Start Cloudflare tunnel automatically after UI/server is reachable
// This enables clients to book appointments online via public URL
if (!tunnelStarted) {
  console.log('[Tunnel] Server ready. Starting Cloudflare tunnel for client bookings...');
  tunnelStarted = true;
  setTimeout(() => startCloudfareTunnel(), 200);
}
```

---

## ✅ Résultat

### Comportement Actuel
1. **App démarre** → Serveur Next.js lance
2. **Serveur prêt** → Tunnel Cloudflare démarre automatiquement
3. **Tunnel actif** → Clients peuvent prendre RDV en ligne

### Logs Attendus
```
[Electron] App ready
[Electron] Starting Next.js server...
[Tunnel] Auto-start enabled: Tunnel will launch after server is ready.
[Tunnel] This allows clients to book appointments online.
[Electron] Waiting for Next.js server to be ready...
[Electron] Server is up, loading UI...
[Tunnel] Server ready. Starting Cloudflare tunnel for client bookings...
[Tunnel] Starting Cloudflare Tunnel for public booking access...
[Tunnel] Tunnel ready at https://atelier-velo.upgradedbikes.com
```

---

## 🔧 Prérequis (Vérification)

### 1. Cloudflared Installé
```bash
# Vérifier installation
dir C:\cloudflared\cloudflared.exe
# Doit exister

dir C:\cloudflared\config.yml
# Doit exister
```

### 2. Configuration Tunnel
**Fichier**: `C:\cloudflared\config.yml`
```yaml
tunnel: atelier-velo
credentials-file: C:\cloudflared\credentials.json

ingress:
  - hostname: atelier-velo.upgradedbikes.com
    service: http://localhost:3000
  - service: http_status:404
```

### 3. Credentials
```bash
# Vérifier credentials
dir C:\cloudflared\credentials.json
# Doit exister
```

---

## 🧪 Tests

### Test 1: Vérifier Tunnel Démarre
```bash
# 1. Lancer l'app en dev
npm run dev:desktop

# 2. Vérifier logs console
# Doit afficher:
# [Tunnel] Auto-start enabled...
# [Tunnel] Starting Cloudflare Tunnel...
```

### Test 2: Vérifier Accès Public
```bash
# Depuis un autre appareil (téléphone, autre PC)
# Ouvrir navigateur:
https://atelier-velo.upgradedbikes.com

# Doit afficher l'application
```

### Test 3: Créer RDV
```bash
# 1. Ouvrir ticket dans l'app
# 2. Section "📅 Rendez-vous Retour"
# 3. Cliquer "Définir un RDV"
# 4. Choisir date/heure
# 5. Enregistrer

# Vérifier:
# - RDV créé dans ticket
# - Événement dans calendrier
# - Créneau bloqué (blocksAvail: true)
```

### Test 4: Accès Client au Calendrier
```bash
# Depuis URL publique
https://atelier-velo.upgradedbikes.com/calendar

# Vérifier:
# - Calendrier visible
# - Créneaux disponibles affichés
# - Créneaux bloqués non sélectionnables
```

---

## 🚨 Troubleshooting

### Tunnel ne démarre pas

**Symptôme**: Logs affichent "Cloudflared prerequisites missing"

**Causes**:
1. Cloudflared pas installé
2. config.yml manquant
3. credentials.json manquant

**Solution**:
```bash
# 1. Installer Cloudflared
# Télécharger depuis: https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/

# 2. Créer tunnel
cloudflared tunnel create atelier-velo

# 3. Configurer
# Créer C:\cloudflared\config.yml avec contenu ci-dessus

# 4. Router DNS
cloudflared tunnel route dns atelier-velo atelier-velo.upgradedbikes.com

# 5. Tester
cloudflared tunnel --config C:\cloudflared\config.yml run atelier-velo
```

### Tunnel démarre mais URL inaccessible

**Symptôme**: Tunnel actif mais URL ne répond pas

**Causes**:
1. DNS pas propagé
2. Firewall bloque
3. Service pas sur port 3000

**Solution**:
```bash
# 1. Vérifier DNS
nslookup atelier-velo.upgradedbikes.com
# Doit résoudre vers Cloudflare

# 2. Vérifier firewall
# Autoriser cloudflared.exe dans Windows Firewall

# 3. Vérifier port serveur
netstat -ano | findstr :3000
# Doit afficher processus sur port 3000
```

### RDV créé mais pas dans calendrier

**Symptôme**: RDV enregistré mais événement manquant

**Cause**: Problème API

**Solution**:
```bash
# Vérifier logs API
# DevTools > Console > Network
# Chercher requête POST /api/workorders/[id]/appointment

# Vérifier réponse
# Doit retourner:
{
  "success": true,
  "event": { ... },
  "workOrder": { ... }
}
```

---

## 📋 Prochaines Étapes

### Immédiat
- [x] Modifier code main.js
- [ ] Tester en dev
- [ ] Vérifier tunnel démarre
- [ ] Tester création RDV
- [ ] Vérifier accès public

### Build Production
- [ ] Rebuild avec `npm run build:v2`
- [ ] Tester .exe
- [ ] Vérifier tunnel auto-start
- [ ] Tester workflow complet
- [ ] Documenter pour utilisateurs

### Améliorations Futures (Optionnel)
- [ ] Ajouter paramètre utilisateur "Activer RDV en ligne"
- [ ] Notification quand tunnel démarre
- [ ] Indicateur visuel tunnel actif
- [ ] Page admin pour gérer tunnel
- [ ] Logs tunnel dans interface

---

## 🎯 Workflow Complet RDV

### 1. Mécanicien Crée Ticket
```
Tickets > Nouveau Ticket
├─ Client: Jean Dupont
├─ Vélo: Giant TCR
├─ Prestations: Révision complète
└─ 📅 RDV Retour: 20/10/2025 14h00
   └─ Enregistrer
```

### 2. Système Crée Événement
```javascript
// Automatique via API
CalendarEvent {
  title: "Retour vélo - Jean Dupont",
  start: "2025-10-20T14:00:00Z",
  end: "2025-10-20T14:30:00Z",
  blocksAvail: true,  // ← Bloque le créneau
  color: "#4CAF50"
}
```

### 3. Client Voit Calendrier
```
https://atelier-velo.upgradedbikes.com/calendar
├─ Créneaux disponibles: ✅
├─ Créneau 14h00: ❌ (bloqué)
└─ Choisit autre créneau: 15h00 ✅
```

### 4. Notification (Future)
```
Email/SMS au client:
"Votre vélo sera prêt le 20/10/2025 à 14h00"
```

---

## 💡 Avantages

### Pour le Mécanicien
- ✅ Définit RDV en créant ticket
- ✅ Pas besoin d'aller dans calendrier
- ✅ Tout au même endroit
- ✅ Créneau automatiquement bloqué

### Pour l'Admin
- ✅ Visibilité complète agenda
- ✅ Pas de double-booking
- ✅ Lien ticket ↔ RDV
- ✅ Statistiques disponibilité

### Pour le Client
- ✅ Peut voir calendrier en ligne
- ✅ Sait quand récupérer vélo
- ✅ Peut prendre autre RDV si besoin
- ✅ Accès 24/7

---

## 🎉 C'est Prêt !

Le tunnel démarre maintenant **automatiquement** à chaque lancement.

**Plus besoin de**:
- ❌ Modifier .env
- ❌ Penser à activer
- ❌ Configuration manuelle

**Il suffit de**:
- ✅ Lancer l'app
- ✅ Créer des RDV
- ✅ Clients peuvent accéder

---

## 🚀 Prochaine Étape

**Redesign Page Ticket** ! 🎨

On va créer une interface moderne avec:
- Grid layout 8/4
- CustomerCard
- BikeCard
- FinancialSummaryCard
- LineItemsTable
- AppointmentPicker (déjà intégré ✅)

**Prêt ?** 💪

---

© 2024-2025 Jérôme Leyssard - Upgraded Bikes
