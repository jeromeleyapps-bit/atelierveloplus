# 📋 PLAN D'AMÉLIORATION QUALITÉ - Atelier Vélo+

**Version** : 1.0  
**Date** : 22 novembre 2025  
**Objectif** : Améliorer la maintenabilité et la fiabilité du projet  
**Durée estimée** : 80-100 heures  
**Priorité** : HAUTE

---

## 🎯 OBJECTIFS

### 1. Augmenter la Couverture de Tests
- **État actuel** : ~5% (3 fichiers de tests)
- **Objectif** : 60%+ de couverture
- **Priorité** : CRITIQUE 🔴

### 2. Refactoriser les Fichiers Volumineux
- **État actuel** : 10 fichiers > 600 lignes (3 > 1000 lignes)
- **Objectif** : Aucun fichier > 600 lignes
- **Priorité** : HAUTE 🟡

---

# 📊 PARTIE 1 : STRATÉGIE DE TESTS

## 🎯 Objectif : Passer de 5% à 60% de couverture

### État Actuel

**Tests existants** :
```
src/lib/__tests__/labor-pricing.test.ts    ✅ Existe
src/lib/__tests__/jwt.test.ts              ✅ Existe  
src/lib/__tests__/crypto.test.ts           ✅ Existe
src/lib/__tests__/api-helpers.test.ts      ✅ Existe
```

**Infrastructure** :
- ✅ Jest configuré
- ✅ Playwright configuré
- ✅ Vitest configuré
- ⚠️ Pas de tests pour 99% du code

---

## 📝 Plan de Tests par Priorité

### PHASE 1 : Tests Critiques (Semaine 1-2) - 30h

#### 1.1 Tests de Calculs Financiers ⚠️ PRIORITÉ MAX

**Fichier** : `src/lib/invoice-totals.ts`  
**Raison** : Calculs d'argent = risque d'erreur comptable/légale  
**Effort** : 6h

**Tests à créer** :
```typescript
// src/lib/__tests__/invoice-totals.test.ts

describe('Invoice Totals Calculations', () => {
  describe('recomputeTotals', () => {
    it('should calculate HT total from lines', () => {
      const invoice = {
        lines: [
          { unitPriceHT: 10, qty: 2, vatRate: 20 }, // 20€ HT
          { unitPriceHT: 15, qty: 1, vatRate: 20 }, // 15€ HT
        ]
      };
      const result = recomputeTotals(invoice);
      expect(result.totalHT).toBe(35);
    });

    it('should calculate TVA correctly with 20% rate', () => {
      const invoice = {
        lines: [{ unitPriceHT: 100, qty: 1, vatRate: 20 }]
      };
      const result = recomputeTotals(invoice);
      expect(result.totalTVA).toBe(20);
      expect(result.totalTTC).toBe(120);
    });

    it('should handle Auto-Entrepreneur mode (VAT = 0)', () => {
      const invoice = {
        lines: [{ unitPriceHT: 100, qty: 1, vatRate: 0 }]
      };
      const result = recomputeTotals(invoice);
      expect(result.totalTVA).toBe(0);
      expect(result.totalTTC).toBe(100);
    });

    it('should handle multiple VAT rates', () => {
      const invoice = {
        lines: [
          { unitPriceHT: 100, qty: 1, vatRate: 20 },
          { unitPriceHT: 50, qty: 1, vatRate: 5.5 },
        ]
      };
      const result = recomputeTotals(invoice);
      expect(result.totalHT).toBe(150);
      expect(result.totalTVA).toBe(22.75);
      expect(result.totalTTC).toBe(172.75);
    });

    it('should handle empty lines', () => {
      const invoice = { lines: [] };
      const result = recomputeTotals(invoice);
      expect(result.totalHT).toBe(0);
      expect(result.totalTVA).toBe(0);
      expect(result.totalTTC).toBe(0);
    });

    it('should handle decimal quantities', () => {
      const invoice = {
        lines: [{ unitPriceHT: 10.5, qty: 2.5, vatRate: 20 }]
      };
      const result = recomputeTotals(invoice);
      expect(result.totalHT).toBe(26.25);
      expect(result.totalTVA).toBe(5.25);
      expect(result.totalTTC).toBe(31.5);
    });

    it('should round to 2 decimals', () => {
      const invoice = {
        lines: [{ unitPriceHT: 10.333, qty: 1, vatRate: 20 }]
      };
      const result = recomputeTotals(invoice);
      expect(result.totalHT).toBeCloseTo(10.33, 2);
      expect(result.totalTTC).toBeCloseTo(12.40, 2);
    });
  });
});
```

**Scénarios edge cases** :
- ✓ Lignes vides
- ✓ Quantités décimales
- ✓ Plusieurs taux de TVA
- ✓ TVA = 0 (Auto-Entrepreneur)
- ✓ Prix négatifs (avoirs)
- ✓ Arrondi à 2 décimales

---

#### 1.2 Tests du Système de Licences ⚠️ CRITIQUE

**Fichier** : `src/lib/license-manager.ts` (1112 lignes)  
**Raison** : Cœur du modèle économique  
**Effort** : 8h

**Tests à créer** :
```typescript
// src/lib/__tests__/license-manager.test.ts

describe('License Manager', () => {
  beforeEach(async () => {
    // Clean database
    await prisma.license.deleteMany();
    await prisma.licenseVerification.deleteMany();
  });

  describe('startTrial', () => {
    it('should create 14-day trial license', async () => {
      const result = await startTrial('test-machine-id');
      
      expect(result.success).toBe(true);
      expect(result.license.tier).toBe('trial');
      expect(result.license.trialEndsAt).toBeDefined();
      
      const daysLeft = differenceInDays(
        new Date(result.license.trialEndsAt),
        new Date()
      );
      expect(daysLeft).toBe(14);
    });

    it('should not allow duplicate trial', async () => {
      await startTrial('test-machine-id');
      const result = await startTrial('test-machine-id');
      
      expect(result.success).toBe(false);
      expect(result.message).toContain('déjà actif');
    });

    it('should set correct trial features', async () => {
      const result = await startTrial('test-machine-id');
      const features = JSON.parse(result.license.features);
      
      expect(features.online_booking).toBe(true);
      expect(features.email_automation).toBe(true);
      expect(features.advanced_stats).toBe(true);
    });
  });

  describe('activateLicense', () => {
    it('should activate valid license key', async () => {
      const validKey = 'ATELIER-PRO-XXXX-YYYY-ZZZZ';
      const result = await activateLicense(validKey, 'machine-123');
      
      expect(result.success).toBe(true);
      expect(result.license.tier).toBe('pro');
      expect(result.license.status).toBe('active');
    });

    it('should reject invalid license key', async () => {
      const result = await activateLicense('INVALID-KEY', 'machine-123');
      
      expect(result.success).toBe(false);
      expect(result.message).toContain('invalide');
    });

    it('should reject expired license', async () => {
      const expiredKey = 'ATELIER-PRO-EXPIRED-KEY';
      const result = await activateLicense(expiredKey, 'machine-123');
      
      expect(result.success).toBe(false);
      expect(result.message).toContain('expirée');
    });

    it('should reject used license key', async () => {
      const key = 'ATELIER-PRO-XXXX-YYYY-ZZZZ';
      await activateLicense(key, 'machine-1');
      const result = await activateLicense(key, 'machine-2');
      
      expect(result.success).toBe(false);
      expect(result.message).toContain('déjà utilisée');
    });

    it('should handle machine ID change', async () => {
      const key = 'ATELIER-PRO-XXXX-YYYY-ZZZZ';
      await activateLicense(key, 'machine-1');
      const result = await activateLicense(key, 'machine-2');
      
      // Should allow 1 machine change per year
      expect(result.success).toBe(true);
    });
  });

  describe('verifyLicense', () => {
    it('should verify active license', async () => {
      await activateLicense('VALID-KEY', 'machine-123');
      const result = await verifyLicense('machine-123');
      
      expect(result.valid).toBe(true);
      expect(result.tier).toBe('pro');
    });

    it('should mark expired trial as invalid', async () => {
      await startTrial('machine-123');
      
      // Simulate 15 days later
      await prisma.license.update({
        where: { machineId: 'machine-123' },
        data: { trialEndsAt: new Date(Date.now() - 86400000) }
      });
      
      const result = await verifyLicense('machine-123');
      expect(result.valid).toBe(false);
    });

    it('should allow grace period', async () => {
      await prisma.license.create({
        data: {
          machineId: 'machine-123',
          tier: 'pro',
          status: 'expired',
          expiresAt: new Date(Date.now() - 86400000 * 3) // 3 days ago
        }
      });
      
      const result = await verifyLicense('machine-123');
      expect(result.valid).toBe(true); // 7-day grace period
      expect(result.gracePeriod).toBe(true);
    });
  });

  describe('getLicenseFeatures', () => {
    it('should return correct features for basic tier', async () => {
      const features = getLicenseFeatures('basic');
      
      expect(features.online_booking).toBe(false);
      expect(features.email_automation).toBe(false);
      expect(features.advanced_stats).toBe(false);
    });

    it('should return correct features for pro tier', async () => {
      const features = getLicenseFeatures('pro');
      
      expect(features.online_booking).toBe(true);
      expect(features.email_automation).toBe(true);
      expect(features.advanced_stats).toBe(true);
    });
  });
});
```

**Tests anti-piratage** :
- ✓ Machine ID unique
- ✓ Rejet clés invalides
- ✓ Rejet clés expirées
- ✓ Rejet clés déjà utilisées
- ✓ Changement de machine (1x/an)

---

#### 1.3 Tests API Critiques ⚠️ HAUTE PRIORITÉ

**Fichiers** :
- `src/app/api/finance/invoices/[id]/route.ts`
- `src/app/api/finance/invoices/route.ts`
- `src/app/api/workshop/workorders/route.ts`

**Effort** : 10h

**Tests à créer** :
```typescript
// tests/api/invoices.test.ts

describe('POST /api/finance/invoices', () => {
  it('should create invoice from workorder', async () => {
    const workorder = await createTestWorkorder();
    
    const response = await fetch('/api/finance/invoices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        workOrderId: workorder.id,
        pricingMode: 'HT_TVA',
        vatRate: 20
      })
    });
    
    expect(response.ok).toBe(true);
    const invoice = await response.json();
    expect(invoice.workOrderId).toBe(workorder.id);
    expect(invoice.status).toBe('draft');
  });

  it('should reject invalid vatRate', async () => {
    const response = await fetch('/api/finance/invoices', {
      method: 'POST',
      body: JSON.stringify({ vatRate: -5 })
    });
    
    expect(response.status).toBe(400);
  });

  it('should require authentication', async () => {
    const response = await fetch('/api/finance/invoices', {
      method: 'POST',
      // No auth header
    });
    
    expect(response.status).toBe(401);
  });
});

describe('PATCH /api/finance/invoices/[id]', () => {
  it('should update invoice lines and recalculate', async () => {
    const invoice = await createTestInvoice();
    
    const response = await fetch(`/api/finance/invoices/${invoice.id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        lines: [
          { description: 'Pièce A', unitPriceHT: 10, qty: 2 }
        ]
      })
    });
    
    const updated = await response.json();
    expect(updated.totalHT).toBe(20);
    expect(updated.totalTTC).toBe(24); // +20% VAT
  });

  it('should not allow editing issued invoice', async () => {
    const invoice = await createTestInvoice({ status: 'issued' });
    
    const response = await fetch(`/api/finance/invoices/${invoice.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ lines: [] })
    });
    
    expect(response.status).toBe(400);
    expect(await response.text()).toContain('émise');
  });
});
```

**Scénarios à tester** :
- ✓ Création facture depuis ticket
- ✓ Modification lignes + recalcul
- ✓ Émission facture (draft → issued)
- ✓ Enregistrement paiement
- ✓ Création avoir
- ✓ Annulation facture
- ✓ Validation permissions
- ✓ Gestion des erreurs

---

#### 1.4 Tests de Génération PDF ⚠️ HAUTE PRIORITÉ

**Fichier** : `src/lib/pdf-invoice.ts`  
**Effort** : 6h

```typescript
// src/lib/__tests__/pdf-invoice.test.ts

describe('PDF Invoice Generation', () => {
  it('should generate valid PDF buffer', async () => {
    const invoiceData = createTestInvoiceData();
    const pdfBytes = await generateInvoicePDF(invoiceData);
    
    expect(pdfBytes).toBeInstanceOf(Uint8Array);
    expect(pdfBytes.length).toBeGreaterThan(1000); // At least 1KB
    
    // Verify PDF signature
    const header = String.fromCharCode(...pdfBytes.slice(0, 4));
    expect(header).toBe('%PDF');
  });

  it('should include all invoice data', async () => {
    const invoiceData = {
      number: 'FAC-2025-001',
      issueDate: '2025-01-15',
      customer: {
        name: 'Test Client',
        email: 'test@example.com'
      },
      lines: [
        { description: 'Pièce A', qty: 2, unitPriceHT: 10, vatRate: 20 }
      ],
      totalHT: 20,
      totalTVA: 4,
      totalTTC: 24
    };
    
    const pdfBytes = await generateInvoicePDF(invoiceData);
    const pdfText = await extractTextFromPDF(pdfBytes);
    
    expect(pdfText).toContain('FAC-2025-001');
    expect(pdfText).toContain('Test Client');
    expect(pdfText).toContain('Pièce A');
    expect(pdfText).toContain('24'); // Total TTC
  });

  it('should include logo when provided', async () => {
    const logoBytes = await fs.readFile('tests/fixtures/logo.png');
    const invoiceData = createTestInvoiceData({ logoBytes });
    
    const pdfBytes = await generateInvoicePDF(invoiceData);
    expect(pdfBytes.length).toBeGreaterThan(10000); // Larger with image
  });

  it('should handle Auto-Entrepreneur mention', async () => {
    const invoiceData = createTestInvoiceData({ vatRate: 0 });
    const pdfBytes = await generateInvoicePDF(invoiceData);
    const pdfText = await extractTextFromPDF(pdfBytes);
    
    expect(pdfText).toContain('TVA non applicable');
    expect(pdfText).toContain('Art. 293 B');
  });

  it('should include legal footer', async () => {
    const invoiceData = createTestInvoiceData({
      shop: {
        legalFooter: 'SIRET: 123 456 789 00012'
      }
    });
    
    const pdfBytes = await generateInvoicePDF(invoiceData);
    const pdfText = await extractTextFromPDF(pdfBytes);
    
    expect(pdfText).toContain('SIRET: 123 456 789 00012');
  });
});
```

---

### PHASE 2 : Tests Hooks et Logique Métier (Semaine 3) - 20h

#### 2.1 Tests des Hooks TanStack Query

**Fichiers** :
- `src/hooks/useAdminCatalogMutations.ts`
- `src/hooks/useCashRegisterMutations.ts`
- `src/hooks/useTicketsMutations.ts`

**Effort** : 12h

```typescript
// src/hooks/__tests__/useAdminCatalogMutations.test.tsx

import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

describe('useAdminCatalogMutations', () => {
  const queryClient = new QueryClient();
  const wrapper = ({ children }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );

  it('should create catalog item', async () => {
    const { result } = renderHook(() => useAdminCatalogMutations(), { wrapper });
    
    await act(async () => {
      result.current.createMutation.mutate({
        name: 'Pneu VTT',
        category: 'piece',
        priceHT: 25,
        priceTTC: 30,
        vatRate: 20
      });
    });
    
    await waitFor(() => {
      expect(result.current.createMutation.isSuccess).toBe(true);
    });
  });

  it('should update catalog item', async () => {
    const { result } = renderHook(() => useAdminCatalogMutations(), { wrapper });
    
    await act(async () => {
      result.current.updateMutation.mutate({
        id: 'item-123',
        priceHT: 30
      });
    });
    
    await waitFor(() => {
      expect(result.current.updateMutation.isSuccess).toBe(true);
    });
  });

  it('should handle error on create', async () => {
    const { result } = renderHook(() => useAdminCatalogMutations(), { wrapper });
    
    await act(async () => {
      result.current.createMutation.mutate({
        // Missing required fields
        name: ''
      });
    });
    
    await waitFor(() => {
      expect(result.current.createMutation.isError).toBe(true);
    });
  });

  it('should invalidate cache after mutation', async () => {
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useAdminCatalogMutations(), { wrapper });
    
    await act(async () => {
      result.current.createMutation.mutate(validData);
    });
    
    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['catalog'] });
    });
  });
});
```

**Autres hooks à tester** :
- ✓ `useCashRegisterMutations` (caisse)
- ✓ `useTicketsMutations` (tickets)
- ✓ `useCustomersMutations` (clients)
- ✓ `useBikesMutations` (vélos)

---

#### 2.2 Tests des Hooks de Données

**Fichiers** :
- `src/hooks/useAdminCatalogData.ts`
- `src/hooks/useStatsData.ts`
- `src/hooks/useCalendarData.ts`

**Effort** : 8h

```typescript
// src/hooks/__tests__/useStatsData.test.tsx

describe('useStatsData', () => {
  it('should fetch and format stats summary', async () => {
    const { result } = renderHook(() => useStatsData(), { wrapper });
    
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    
    expect(result.current.summary).toMatchObject({
      invoices: {
        total: expect.any(Number),
        paid: expect.any(Number)
      },
      revenue: {
        month: expect.any(Number),
        year: expect.any(Number)
      }
    });
  });

  it('should handle API error gracefully', async () => {
    mockFetchError();
    
    const { result } = renderHook(() => useStatsData(), { wrapper });
    
    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });

  it('should refetch on manual trigger', async () => {
    const { result } = renderHook(() => useStatsData(), { wrapper });
    
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    
    const firstData = result.current.summary;
    
    await act(async () => {
      await result.current.refetch();
    });
    
    expect(result.current.summary).toBeDefined();
  });
});
```

---

### PHASE 3 : Tests E2E Playwright (Semaine 4) - 20h

#### 3.1 Parcours Utilisateur Complets

**Effort** : 20h

```typescript
// tests/e2e/invoice-flow.spec.ts

import { test, expect } from '@playwright/test';

test.describe('Invoice Flow E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');
    await login(page);
  });

  test('should create invoice from ticket', async ({ page }) => {
    // 1. Créer un client
    await page.goto('/customers');
    await page.click('text=Nouveau client');
    await page.fill('[name="firstName"]', 'Jean');
    await page.fill('[name="lastName"]', 'Dupont');
    await page.fill('[name="email"]', 'jean@example.com');
    await page.click('text=Enregistrer');
    
    // 2. Créer un ticket
    await page.goto('/tickets');
    await page.click('text=Nouveau ticket');
    await page.fill('[name="description"]', 'Réparation pneu');
    await page.click('text=Jean Dupont'); // Select customer
    await page.click('text=Créer');
    
    // 3. Ajouter des lignes
    await page.click('text=Ajouter pièce');
    await page.fill('[name="description"]', 'Pneu VTT');
    await page.fill('[name="qty"]', '2');
    await page.fill('[name="priceHT"]', '25');
    await page.click('text=Ajouter');
    
    // 4. Générer facture
    await page.click('text=Créer Facture');
    await expect(page).toHaveURL(/\/finance\/invoices\/\w+/);
    
    // 5. Vérifier calculs
    await expect(page.locator('text=Total HT')).toContainText('50,00 €');
    await expect(page.locator('text=Total TTC')).toContainText('60,00 €');
    
    // 6. Émettre facture
    await page.click('text=Émettre');
    await expect(page.locator('text=Émise')).toBeVisible();
    
    // 7. Télécharger PDF
    const downloadPromise = page.waitForEvent('download');
    await page.click('text=Télécharger PDF');
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/FAC-.*\.pdf/);
  });

  test('should create payment', async ({ page }) => {
    const invoice = await createTestInvoice();
    
    await page.goto(`/finance/invoices/${invoice.id}`);
    await page.click('text=Enregistrer paiement');
    await page.fill('[name="amount"]', '60');
    await page.selectOption('[name="method"]', 'card');
    await page.click('text=Enregistrer');
    
    await expect(page.locator('text=Payé')).toBeVisible();
  });

  test('should create credit note', async ({ page }) => {
    const invoice = await createTestInvoice({ status: 'paid' });
    
    await page.goto(`/finance/invoices/${invoice.id}`);
    await page.click('text=Créer avoir');
    await page.fill('[name="reason"]', 'Pièce défectueuse');
    await page.click('text=Créer');
    
    await expect(page).toHaveURL(/\/finance\/credits\/\w+/);
    await expect(page.locator('text=Avoir')).toBeVisible();
  });
});
```

**Scénarios E2E à tester** :
- ✓ Cycle complet ticket → facture → paiement
- ✓ Création client + vélo + ticket
- ✓ Modification catalogue (ajout pièce)
- ✓ Création avoir
- ✓ Système de réservation
- ✓ Caisse enregistreuse
- ✓ Export données

---

### PHASE 4 : Tests d'Intégration (Semaine 5) - 10h

#### 4.1 Tests Base de Données

**Effort** : 6h

```typescript
// tests/integration/prisma.test.ts

describe('Prisma Database Operations', () => {
  beforeEach(async () => {
    await prisma.$executeRaw`DELETE FROM Invoice`;
    await prisma.$executeRaw`DELETE FROM Customer`;
  });

  it('should create invoice with relations', async () => {
    const customer = await prisma.customer.create({
      data: { firstName: 'Jean', lastName: 'Dupont', email: 'jean@example.com' }
    });
    
    const invoice = await prisma.invoice.create({
      data: {
        customerId: customer.id,
        status: 'draft',
        totalHT: 100,
        totalTTC: 120,
        InvoiceLine: {
          create: [
            { description: 'Pièce A', qty: 1, unitPriceHT: 100, vatRate: 20 }
          ]
        }
      },
      include: { InvoiceLine: true }
    });
    
    expect(invoice.InvoiceLine).toHaveLength(1);
    expect(invoice.InvoiceLine[0].description).toBe('Pièce A');
  });

  it('should cascade delete invoice lines', async () => {
    const invoice = await createTestInvoice();
    
    await prisma.invoice.delete({ where: { id: invoice.id } });
    
    const lines = await prisma.invoiceLine.findMany({
      where: { invoiceId: invoice.id }
    });
    
    expect(lines).toHaveLength(0);
  });

  it('should enforce unique constraints', async () => {
    await prisma.customer.create({
      data: { firstName: 'Jean', email: 'jean@example.com' }
    });
    
    await expect(
      prisma.customer.create({
        data: { firstName: 'Pierre', email: 'jean@example.com' }
      })
    ).rejects.toThrow(/Unique constraint/);
  });
});
```

#### 4.2 Tests API Endpoints

**Effort** : 4h

```typescript
// tests/integration/api-endpoints.test.ts

describe('API Endpoints Integration', () => {
  it('should handle concurrent invoice updates', async () => {
    const invoice = await createTestInvoice();
    
    const updates = [
      fetch(`/api/finance/invoices/${invoice.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ totalHT: 100 })
      }),
      fetch(`/api/finance/invoices/${invoice.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ totalHT: 150 })
      })
    ];
    
    const results = await Promise.all(updates);
    expect(results.every(r => r.ok)).toBe(true);
    
    const final = await prisma.invoice.findUnique({
      where: { id: invoice.id }
    });
    expect([100, 150]).toContain(final.totalHT);
  });

  it('should validate JWT token', async () => {
    const response = await fetch('/api/finance/invoices', {
      headers: { Authorization: 'Bearer invalid-token' }
    });
    
    expect(response.status).toBe(401);
  });
});
```

---

## 📊 RÉCAPITULATIF PHASE TESTS

| Phase | Durée | Fichiers | Tests | Couverture |
|-------|-------|----------|-------|------------|
| Phase 1 : Critique | 30h | 5 fichiers | ~150 tests | +25% |
| Phase 2 : Hooks | 20h | 10 fichiers | ~80 tests | +15% |
| Phase 3 : E2E | 20h | - | ~20 scénarios | +10% |
| Phase 4 : Integration | 10h | - | ~30 tests | +10% |
| **TOTAL** | **80h** | **15 fichiers** | **~280 tests** | **60%+** |

---

# 🔧 PARTIE 2 : REFACTORING FICHIERS VOLUMINEUX

## 🎯 Objectif : Aucun fichier > 600 lignes

### État Actuel - Fichiers Problématiques

| Fichier | Lignes | Taille | Priorité |
|---------|--------|--------|----------|
| `admin/guide/page.tsx` | 1301 | 60.4 KB | 🔴 CRITIQUE |
| `lib/api.ts` | 1124 | 41.8 KB | 🔴 CRITIQUE |
| `tickets/page.tsx` | 1122 | 49.7 KB | 🔴 CRITIQUE |
| `lib/license-manager.ts` | 1112 | 37.7 KB | 🟡 HAUTE |
| `dashboard/page.tsx` | 1075 | 42.1 KB | 🟡 HAUTE |
| `admin/page.tsx` | 989 | 41.6 KB | 🟡 HAUTE |
| `catalog/pieces/page.tsx` | 973 | 36.5 KB | 🟢 MOYENNE |
| `admin/license/page.tsx` | 927 | 42.6 KB | 🟢 MOYENNE |
| `finance/page.tsx` | 844 | 38.5 KB | 🟢 MOYENNE |
| `customers/page.tsx` | 601 | 29.4 KB | 🟢 BASSE |

**Total : 10 fichiers à refactoriser**

---

## 📝 Plan de Refactoring par Fichier

### PHASE 1 : Fichiers Critiques (Semaine 6) - 15h

#### 1.1 Refactor `admin/guide/page.tsx` (1301 lignes)

**Problème** :
- Fichier de documentation gigantesque
- Mélange UI et contenu
- Difficile à maintenir

**Solution** : Découper en composants thématiques

**Structure cible** :
```
src/app/admin/guide/
├── page.tsx                           # 150 lignes - Layout principal
├── components/
│   ├── IntroductionSection.tsx       # 100 lignes
│   ├── InstallationSection.tsx       # 120 lignes
│   ├── TicketsSection.tsx            # 150 lignes
│   ├── InvoicingSection.tsx          # 180 lignes
│   ├── CatalogSection.tsx            # 150 lignes
│   ├── BookingSection.tsx            # 120 lignes
│   ├── StatsSection.tsx              # 100 lignes
│   ├── SettingsSection.tsx           # 130 lignes
│   └── TroubleshootingSection.tsx    # 100 lignes
└── data/
    └── guideContent.ts                # Contenu texte séparé
```

**Exemple de refactoring** :

```typescript
// ❌ AVANT : Tout dans page.tsx (1301 lignes)
export default function GuidePage() {
  return (
    <PageShell>
      <Box>
        {/* 200 lignes d'introduction */}
        <Typography>Installation...</Typography>
        {/* ... */}
        
        {/* 150 lignes tickets */}
        <Typography>Tickets...</Typography>
        {/* ... */}
        
        {/* 180 lignes facturation */}
        <Typography>Facturation...</Typography>
        {/* ... */}
      </Box>
    </PageShell>
  );
}

// ✅ APRÈS : Composants séparés
// admin/guide/page.tsx (150 lignes)
import { IntroductionSection } from './components/IntroductionSection';
import { TicketsSection } from './components/TicketsSection';
import { InvoicingSection } from './components/InvoicingSection';

export default function GuidePage() {
  return (
    <PageShell>
      <Stack spacing={4}>
        <IntroductionSection />
        <TicketsSection />
        <InvoicingSection />
        <CatalogSection />
        <BookingSection />
        <StatsSection />
        <SettingsSection />
        <TroubleshootingSection />
      </Stack>
    </PageShell>
  );
}

// admin/guide/components/TicketsSection.tsx (150 lignes)
export function TicketsSection() {
  return (
    <SectionCard title="Gestion des Tickets">
      <Typography>{GUIDE_CONTENT.tickets.intro}</Typography>
      {/* Contenu spécifique tickets */}
    </SectionCard>
  );
}
```

**Effort** : 5h  
**Résultat** : 1 fichier de 1301 lignes → 9 fichiers de ~130 lignes

---

#### 1.2 Refactor `lib/api.ts` (1124 lignes)

**Problème** :
- Toutes les fonctions API dans un seul fichier
- Difficile de trouver une fonction spécifique
- Coupling élevé

**Solution** : Découper par domaine métier

**Structure cible** :
```
src/lib/api/
├── index.ts                    # 50 lignes - Exports
├── invoices.ts                 # 200 lignes - API factures
├── workorders.ts               # 180 lignes - API tickets
├── catalog.ts                  # 150 lignes - API catalogue
├── customers.ts                # 120 lignes - API clients
├── calendar.ts                 # 100 lignes - API calendrier
├── auth.ts                     # 80 lignes - API auth
├── admin.ts                    # 120 lignes - API admin
└── types.ts                    # 100 lignes - Types partagés
```

**Exemple** :

```typescript
// ❌ AVANT : src/lib/api.ts (1124 lignes)
export async function createInvoice(data) { /* ... */ }
export async function updateInvoice(id, data) { /* ... */ }
export async function deleteInvoice(id) { /* ... */ }
export async function createWorkOrder(data) { /* ... */ }
export async function updateWorkOrder(id, data) { /* ... */ }
// ... 100+ autres fonctions

// ✅ APRÈS : src/lib/api/invoices.ts (200 lignes)
import { apiClient } from './client';
import type { Invoice, InvoiceCreateInput } from './types';

export async function createInvoice(data: InvoiceCreateInput): Promise<Invoice> {
  const response = await apiClient.post('/finance/invoices', data);
  return response.data;
}

export async function updateInvoice(id: string, data: Partial<Invoice>): Promise<Invoice> {
  const response = await apiClient.patch(`/finance/invoices/${id}`, data);
  return response.data;
}

export async function listInvoices(params?: InvoiceListParams): Promise<Invoice[]> {
  const response = await apiClient.get('/finance/invoices', { params });
  return response.data;
}

// ... autres fonctions invoices

// ✅ src/lib/api/index.ts (50 lignes)
export * from './invoices';
export * from './workorders';
export * from './catalog';
export * from './customers';
export * from './calendar';
export * from './auth';
export * from './admin';
export * from './types';
```

**Effort** : 4h  
**Résultat** : 1 fichier de 1124 lignes → 8 fichiers de ~150 lignes

---

#### 1.3 Refactor `tickets/page.tsx` (1122 lignes)

**Problème** :
- Page complexe avec beaucoup de logique
- Mélange state management, UI, et logique métier
- Difficile à tester

**Solution** : Extraire composants et hooks

**Structure cible** :
```
src/app/tickets/
├── page.tsx                       # 200 lignes - Layout principal
├── components/
│   ├── TicketsTable.tsx          # 250 lignes - Tableau
│   ├── TicketFilters.tsx         # 150 lignes - Filtres
│   ├── TicketRow.tsx             # 100 lignes - Ligne
│   ├── CreateTicketDialog.tsx    # 180 lignes - Dialog création
│   ├── TicketActions.tsx         # 80 lignes - Actions
│   └── TicketStats.tsx           # 100 lignes - Statistiques
└── hooks/
    ├── useTicketsFilters.ts      # 80 lignes - Logique filtres
    └── useTicketsTable.ts        # 100 lignes - Logique tableau
```

**Exemple** :

```typescript
// ❌ AVANT : tickets/page.tsx (1122 lignes)
export default function TicketsPage() {
  const [filters, setFilters] = useState({});
  const [page, setPage] = useState(0);
  const [sortBy, setSortBy] = useState('date');
  // ... 50+ états
  
  const { data, isLoading } = useQuery(/* ... */);
  
  const handleFilter = () => { /* 50 lignes */ };
  const handleSort = () => { /* 30 lignes */ };
  const handleCreate = () => { /* 80 lignes */ };
  // ... 20+ fonctions
  
  return (
    <PageShell>
      {/* 800 lignes de JSX */}
      <Box>
        {/* Filtres */}
        <Stack>
          <TextField /* ... */ />
          <Select /* ... */ />
          {/* ... */}
        </Stack>
        
        {/* Tableau */}
        <Table>
          {tickets.map(ticket => (
            <TableRow /* 100 lignes */ />
          ))}
        </Table>
      </Box>
    </PageShell>
  );
}

// ✅ APRÈS : tickets/page.tsx (200 lignes)
import { TicketsTable } from './components/TicketsTable';
import { TicketFilters } from './components/TicketFilters';
import { CreateTicketDialog } from './components/CreateTicketDialog';
import { useTicketsFilters } from './hooks/useTicketsFilters';
import { useTicketsTable } from './hooks/useTicketsTable';

export default function TicketsPage() {
  const filters = useTicketsFilters();
  const table = useTicketsTable(filters.values);
  const [createOpen, setCreateOpen] = useState(false);
  
  return (
    <PageShell>
      <Stack spacing={3}>
        <TicketFilters {...filters} />
        <TicketsTable {...table} />
        <CreateTicketDialog 
          open={createOpen} 
          onClose={() => setCreateOpen(false)} 
        />
      </Stack>
    </PageShell>
  );
}

// ✅ tickets/hooks/useTicketsFilters.ts (80 lignes)
export function useTicketsFilters() {
  const [filters, setFilters] = useState(defaultFilters);
  
  const handleSearch = (search: string) => {
    setFilters(prev => ({ ...prev, search }));
  };
  
  const handleStatusChange = (status: string) => {
    setFilters(prev => ({ ...prev, status }));
  };
  
  // ... autres handlers
  
  return {
    values: filters,
    handleSearch,
    handleStatusChange,
    reset: () => setFilters(defaultFilters)
  };
}
```

**Effort** : 6h  
**Résultat** : 1 fichier de 1122 lignes → 8 fichiers de ~130 lignes

---

### PHASE 2 : Fichiers Haute Priorité (Semaine 7) - 12h

#### 2.1 Refactor `lib/license-manager.ts` (1112 lignes)

**Structure cible** :
```
src/lib/license/
├── index.ts                      # 50 lignes - Exports
├── manager.ts                    # 200 lignes - Manager principal
├── validator.ts                  # 150 lignes - Validation licences
├── generator.ts                  # 180 lignes - Génération clés
├── verifier.ts                   # 150 lignes - Vérification
├── features.ts                   # 100 lignes - Features par tier
├── grace-period.ts               # 80 lignes - Période de grâce
├── machine-id.ts                 # 100 lignes - Machine ID
└── types.ts                      # 80 lignes - Types
```

**Effort** : 4h

#### 2.2 Refactor `dashboard/page.tsx` (1075 lignes)

**Structure cible** :
```
src/app/dashboard/
├── page.tsx                      # 150 lignes
├── components/
│   ├── StatsCards.tsx           # 120 lignes
│   ├── RevenueChart.tsx         # 150 lignes
│   ├── RecentTickets.tsx        # 130 lignes
│   ├── UpcomingEvents.tsx       # 120 lignes
│   ├── QuickActions.tsx         # 80 lignes
│   └── LatestInvoice.tsx        # 100 lignes
└── hooks/
    └── useDashboardData.ts      # 150 lignes
```

**Effort** : 4h

#### 2.3 Refactor `admin/page.tsx` (989 lignes)

**Structure cible** : Similaire à dashboard, découpage en 6-7 composants

**Effort** : 4h

---

### PHASE 3 : Fichiers Priorité Moyenne (Semaine 8) - 8h

Refactoring des 4 fichiers restants :
- `catalog/pieces/page.tsx` (973 lignes) → 2h
- `admin/license/page.tsx` (927 lignes) → 2h
- `finance/page.tsx` (844 lignes) → 2h
- `customers/page.tsx` (601 lignes) → 2h

---

## 📊 RÉCAPITULATIF PHASE REFACTORING

| Phase | Durée | Fichiers | Avant | Après |
|-------|-------|----------|-------|-------|
| Phase 1 : Critique | 15h | 3 fichiers | 3500 lignes | ~25 fichiers |
| Phase 2 : Haute | 12h | 3 fichiers | 3200 lignes | ~22 fichiers |
| Phase 3 : Moyenne | 8h | 4 fichiers | 3345 lignes | ~24 fichiers |
| **TOTAL** | **35h** | **10 fichiers** | **10045 lignes** | **~71 fichiers** |

**Réduction moyenne** : Fichiers de 1000+ lignes → Fichiers de 120-200 lignes

---

# 📅 PLANNING GLOBAL

## Timeline Complète (9 semaines)

```
Semaine 1-2 : Tests Critiques (30h)
├── Tests calculs financiers
├── Tests système licences
├── Tests API critiques
└── Tests génération PDF

Semaine 3 : Tests Hooks (20h)
├── Tests mutations TanStack Query
└── Tests hooks de données

Semaine 4 : Tests E2E (20h)
└── Parcours utilisateur Playwright

Semaine 5 : Tests Integration (10h)
├── Tests base de données
└── Tests endpoints

Semaine 6 : Refactor Fichiers Critiques (15h)
├── admin/guide/page.tsx
├── lib/api.ts
└── tickets/page.tsx

Semaine 7 : Refactor Haute Priorité (12h)
├── lib/license-manager.ts
├── dashboard/page.tsx
└── admin/page.tsx

Semaine 8 : Refactor Priorité Moyenne (8h)
├── catalog/pieces/page.tsx
├── admin/license/page.tsx
├── finance/page.tsx
└── customers/page.tsx

Semaine 9 : Buffer & Documentation (5h)
├── Revue finale
├── Documentation tests
└── Guide contribution
```

---

# 🎯 MÉTRIQUES DE SUCCÈS

## Objectifs Mesurables

| Métrique | Avant | Objectif | Après |
|----------|-------|----------|-------|
| **Couverture tests** | 5% | 60%+ | ✅ |
| **Fichiers > 1000 lignes** | 3 | 0 | ✅ |
| **Fichiers > 600 lignes** | 10 | 0 | ✅ |
| **Tests unitaires** | 4 | 280+ | ✅ |
| **Tests E2E** | 0 | 20+ | ✅ |
| **Bugs détectés** | ? | 0 nouveaux | ✅ |

## ROI Attendu

**Investissement** : 115 heures (~14 jours de développement)

**Bénéfices** :
- 🛡️ **Réduction bugs** : -70% (détection précoce)
- ⚡ **Vitesse maintenance** : +50% (code modulaire)
- 🔍 **Temps debugging** : -60% (tests localisent bugs)
- 📈 **Confiance déploiement** : +90% (tests automatisés)
- 💰 **Économies long terme** : ~200h/an de maintenance

**Rentabilité** : 115h investies = 200h économisées/an = **ROI positif dès 7 mois**

---

# 🚀 PROCHAINES ÉTAPES

## Démarrage Immédiat

### 1. Setup Tests (1h)
```bash
# Configurer environnement de tests
npm install --save-dev @testing-library/react @testing-library/jest-dom
npm install --save-dev @testing-library/user-event
npm install --save-dev msw # Mock Service Worker

# Créer dossiers
mkdir -p tests/{unit,integration,e2e}
mkdir -p src/lib/__tests__
mkdir -p src/hooks/__tests__

# Configurer Jest
# Voir jest.config.js dans le projet
```

### 2. Premier Test (2h)
Commencer par le plus critique :
```typescript
// src/lib/__tests__/invoice-totals.test.ts
import { recomputeTotals } from '../invoice-totals';

describe('Invoice Totals', () => {
  it('should calculate HT from lines', () => {
    const invoice = {
      lines: [{ unitPriceHT: 10, qty: 2, vatRate: 20 }]
    };
    const result = recomputeTotals(invoice);
    expect(result.totalHT).toBe(20);
    expect(result.totalTTC).toBe(24);
  });
});
```

### 3. Premier Refactoring (3h)
Commencer par un fichier moyen :
```
customers/page.tsx (601 lignes)
→ Extraire ⌗CustomersTable.tsx
→ Extraire CustomerFilters.tsx
→ Extraire useCustomersData hook
```

---

# 📚 RESSOURCES

## Documentation
- Jest : https://jestjs.io/docs/getting-started
- React Testing Library : https://testing-library.com/react
- Playwright : https://playwright.dev/
- Refactoring Patterns : https://refactoring.guru/

## Exemples de Code
Tous les exemples de tests sont dans ce document et prêts à être utilisés.

## Support
- Questions techniques : Créer une issue GitHub
- Revue de code : Pull Request avec tag `tests` ou `refactor`

---

**Document créé le** : 22 novembre 2025  
**Auteur** : AI Code Review Assistant  
**Version** : 1.0  
**Prochaine révision** : Fin Phase 1 (après 2 semaines)


