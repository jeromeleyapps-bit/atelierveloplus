# 🚀 Plan d'Action - 15 Octobre 2025

**Heure début**: 10h00  
**Objectifs**: RDV Clients + Redesign Interfaces

---

## 🎯 PARTIE 1: Rendez-vous Clients (PRIORITAIRE)

### Problème Identifié
- ✅ API `/api/workorders/[id]/appointment` existe
- ✅ Composant `AppointmentPicker` existe
- ❌ **Problème**: Clients ne peuvent pas prendre RDV
- ❌ **Cause**: Processus calendrier non lancé au démarrage Electron

### Solution Immédiate (Dev)
**Le serveur tourne déjà** → Les RDV fonctionnent en dev !

### Solution Build Electron
**2 Options**:

#### Option A: Auto-start Calendrier (Recommandé)
```typescript
// apps/desktop/main.js
app.on('ready', async () => {
  // 1. Lancer serveur Next.js
  await startNextServer();
  
  // 2. Lancer processus calendrier
  await startCalendarProcess();
  
  // 3. Ouvrir fenêtre
  createWindow();
});
```

**Avantages**:
- ✅ Automatique
- ✅ Transparent
- ✅ Clients peuvent toujours prendre RDV

**Inconvénients**:
- ⚠️ Consomme ressources même si pas utilisé
- ⚠️ Démarre au lancement

#### Option B: Start Manuel avec Indicateur
```typescript
// Interface avec bouton
<Button onClick={startCalendar}>
  {calendarRunning ? "🟢 Calendrier actif" : "🔴 Démarrer calendrier"}
</Button>
```

**Avantages**:
- ✅ Contrôle total
- ✅ Économie ressources

**Inconvénients**:
- ❌ Clients ne peuvent pas prendre RDV si oublié
- ❌ Manipulation manuelle

### Recommandation
**Option A** avec option de désactivation dans les paramètres:
```
Paramètres > Calendrier
☑ Démarrer automatiquement au lancement
☐ Afficher notification au démarrage
```

---

## 🎨 PARTIE 2: Redesign Interfaces

### Stratégie (Selon REDESIGN_INTERFACES_PLAN.md)

#### Approche: Créer Nouvelles Pages Parallèles

**Avantages**:
- ✅ Pas de casse du code existant
- ✅ Tests en parallèle
- ✅ Rollback facile
- ✅ Migration progressive

**Process**:
```
1. Créer page-new.tsx
2. Développer avec nouveaux composants
3. Tester complètement
4. Basculer route
5. Supprimer ancienne page
```

### Pages à Redesigner (Ordre)

#### 1. Page Ticket (PRIORITAIRE)
**Fichier**: `apps/web/src/app/tickets/[id]/page-new.tsx`

**Layout**: Grid 8/4
- **Colonne Gauche (8/12)**:
  - CustomerCard
  - BikeCard
  - Prestations et Pièces (LineItemsTable)
  - Notes et Historique

- **Colonne Droite (4/12)**:
  - FinancialSummaryCard (sticky)
  - Actions rapides
  - Rendez-vous retour (AppointmentPicker)
  - Statut et Timeline

**Composants à utiliser**:
- ✅ CustomerCard (créé)
- ✅ BikeCard (créé)
- ✅ FinancialSummaryCard (créé)
- ✅ LineItemSelector (créé)
- ✅ LineItemsTable (créé)
- ✅ AppointmentPicker (existe)

#### 2. CreateQuoteDialog (Devis)
**Fichier**: `apps/web/src/app/finance/components/CreateQuoteDialog-new.tsx`

**Layout**: Stepper moderne
```
Étape 1: Client & Vélo
Étape 2: Lignes (prestations/pièces)
Étape 3: Récapitulatif & Validation
```

#### 3. CreateInvoiceDialog (Factures)
**Fichier**: `apps/web/src/app/finance/components/CreateInvoiceDialog-new.tsx`

**Layout**: Sidebar sticky
- **Gauche**: Formulaire
- **Droite**: Résumé financier (sticky)

---

## 📋 Plan d'Exécution Détaillé

### Phase 1: RDV Clients (1-2h)

#### Étape 1.1: Vérifier État Actuel
```bash
# Test en dev
1. Ouvrir ticket
2. Vérifier AppointmentPicker visible
3. Définir un RDV
4. Vérifier création dans calendrier
```

#### Étape 1.2: Implémenter Auto-Start Electron
```typescript
// apps/desktop/main.js
const { spawn } = require('child_process');

let calendarProcess = null;

async function startCalendarProcess() {
  if (calendarProcess) return;
  
  calendarProcess = spawn('node', ['calendar-server.js'], {
    cwd: path.join(__dirname, '../web'),
    env: process.env
  });
  
  calendarProcess.on('error', (err) => {
    console.error('Calendar process error:', err);
  });
  
  console.log('✅ Calendar process started');
}

app.on('ready', async () => {
  await startNextServer();
  await startCalendarProcess(); // ← NOUVEAU
  createWindow();
});

app.on('quit', () => {
  if (calendarProcess) {
    calendarProcess.kill();
  }
});
```

#### Étape 1.3: Ajouter Paramètre Utilisateur
```typescript
// apps/web/src/app/api/account/settings/route.ts
// Ajouter champ: autoStartCalendar: boolean
```

#### Étape 1.4: Tests
- [ ] RDV créé en dev
- [ ] RDV créé en build Electron
- [ ] Calendrier démarre automatiquement
- [ ] Paramètre désactivation fonctionne

---

### Phase 2: Redesign Page Ticket (3-4h)

#### Étape 2.1: Créer Structure
```bash
# Créer nouveau fichier
apps/web/src/app/tickets/[id]/page-new.tsx
```

#### Étape 2.2: Implémenter Layout Grid
```typescript
<Container maxWidth="xl">
  <Grid container spacing={3}>
    {/* Colonne Gauche */}
    <Grid item xs={12} md={8}>
      <CustomerCard />
      <BikeCard />
      <LineItemsSection />
    </Grid>
    
    {/* Colonne Droite */}
    <Grid item xs={12} md={4}>
      <FinancialSummaryCard sticky />
      <ActionsCard />
      <AppointmentPicker />
    </Grid>
  </Grid>
</Container>
```

#### Étape 2.3: Migrer Logique
- [ ] Copier états depuis page.tsx
- [ ] Copier fonctions API
- [ ] Adapter aux nouveaux composants
- [ ] Tester chaque section

#### Étape 2.4: Tests Complets
- [ ] Affichage données
- [ ] Ajout lignes
- [ ] Modification lignes
- [ ] Suppression lignes
- [ ] Calcul totaux
- [ ] RDV retour
- [ ] Actions (devis, facture)

#### Étape 2.5: Basculement
```typescript
// apps/web/src/app/tickets/[id]/page.tsx
// Renommer en page-old.tsx

// apps/web/src/app/tickets/[id]/page-new.tsx
// Renommer en page.tsx
```

---

### Phase 3: Redesign Dialogs (2-3h)

#### CreateQuoteDialog-new.tsx
- [ ] Stepper 3 étapes
- [ ] Intégration LineItemSelector
- [ ] Validation par étape
- [ ] Récapitulatif final

#### CreateInvoiceDialog-new.tsx
- [ ] Layout sidebar
- [ ] FinancialSummaryCard sticky
- [ ] Intégration lignes
- [ ] Workflow optimisé

---

## ⏱️ Estimation Temps

| Tâche | Temps | Priorité |
|-------|-------|----------|
| RDV Clients (vérif + impl) | 1-2h | 🔴 CRITIQUE |
| Redesign Page Ticket | 3-4h | 🟠 HAUTE |
| Redesign Dialogs | 2-3h | 🟡 MOYENNE |
| Tests & Ajustements | 1h | 🟢 NORMALE |
| **TOTAL** | **7-10h** | - |

---

## 🎯 Objectifs Journée

### Minimum Viable (Priorité 1)
- ✅ RDV Clients fonctionnel en build
- ✅ Page Ticket redesignée et testée

### Souhaitable (Priorité 2)
- ✅ CreateQuoteDialog modernisé
- ✅ CreateInvoiceDialog modernisé

### Bonus (Priorité 3)
- Tests responsive complets
- Documentation utilisateur
- Vidéo démo

---

## 🚀 On Commence Par Quoi ?

### Option A: RDV d'abord (Recommandé)
**Raison**: Bloquant pour clients

1. Vérifier état actuel (15min)
2. Implémenter auto-start (30min)
3. Tester (15min)
4. **Total**: 1h
5. **Puis**: Redesign interfaces

### Option B: Redesign d'abord
**Raison**: Momentum créatif

1. Page Ticket nouvelle (3h)
2. Tests (30min)
3. **Puis**: RDV

---

## 💡 Ma Recommandation

**Commencer par RDV (Option A)**

**Pourquoi ?**
- Bloquant pour clients
- Rapide à implémenter (1h)
- Donne confiance pour la suite
- Libère l'esprit pour le redesign

**Ensuite**: Redesign avec l'esprit tranquille

---

## ❓ Décision

**Quelle option choisis-tu ?**

**A.** RDV d'abord (1h) puis Redesign  
**B.** Redesign d'abord puis RDV  
**C.** Les deux en parallèle (risqué)

**Dis-moi et on y va !** 🚀

---

© 2024-2025 Jérôme Leyssard - Upgraded Bikes
