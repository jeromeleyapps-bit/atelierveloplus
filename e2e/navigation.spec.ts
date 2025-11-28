import { test, expect } from '@playwright/test';
import { login } from './helpers/auth-helper';

test.describe('Navigation', () => {
  test.beforeEach(async ({ page }) => {
    // Se connecter avant chaque test
    await login(page);
  });

  test('should navigate to dashboard', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByRole('heading', { name: /tableau de bord|dashboard/i })).toBeVisible();
  });

  test('should navigate to tickets', async ({ page }) => {
    // Naviguer directement vers tickets pour tester l'accès
    await page.goto('/tickets');
    
    // Attendre que la page soit sur /tickets (peut être redirigé temporairement par RequireAuth)
    await page.waitForURL(/\/tickets/, { timeout: 45000 });
    await page.waitForLoadState('networkidle');
    
    // Vérifier que la page s'affiche correctement
    await expect(page.getByText(/tickets.*atelier|gestion.*réparations/i).first()).toBeVisible({ timeout: 10000 });
  });

  test('should navigate to customers', async ({ page }) => {
    // Naviguer directement vers customers pour tester l'accès
    await page.goto('/customers');
    
    // Attendre que la page soit sur /customers (peut être redirigé temporairement par RequireAuth)
    await page.waitForURL(/\/customers/, { timeout: 45000 });
    await page.waitForLoadState('networkidle');
    
    // Vérifier que la page s'affiche correctement
    await expect(page.getByText(/clients/i).first()).toBeVisible({ timeout: 10000 });
  });

  test('should navigate to catalog', async ({ page }) => {
    // Naviguer directement vers catalog pour tester l'accès
    await page.goto('/catalog');
    
    // Attendre que la page soit sur /catalog (peut être redirigé temporairement par RequireAuth)
    await page.waitForURL(/\/catalog/, { timeout: 45000 });
    await page.waitForLoadState('networkidle');
    
    // Vérifier que la page s'affiche correctement - chercher "Catalogue Général"
    await expect(page.getByText(/catalogue.*général|catalogue/i).first()).toBeVisible({ timeout: 10000 });
  });

  test('should navigate to finance', async ({ page }) => {
    // Naviguer directement vers finance pour tester l'accès
    await page.goto('/finance');
    
    // Attendre que la page soit sur /finance (peut être redirigé temporairement par RequireAuth)
    await page.waitForURL(/\/finance/, { timeout: 45000 });
    await page.waitForLoadState('networkidle');
    
    // Vérifier que la page s'affiche correctement - chercher "Facturation"
    await expect(page.getByText(/facturation|gestion.*devis.*factures/i).first()).toBeVisible({ timeout: 10000 });
  });

  test('should access admin settings', async ({ page }) => {
    // Naviguer directement vers admin pour tester l'accès
    await page.goto('/admin');
    
    // Attendre que la page soit sur /admin (peut être redirigé temporairement par RequireAuth)
    await page.waitForURL(/\/admin/, { timeout: 45000 });
    await page.waitForLoadState('networkidle');
    
    // Vérifier que la page s'affiche correctement - chercher "Administration"
    await expect(page.getByText(/administration|besoin.*aide/i).first()).toBeVisible({ timeout: 10000 });
  });
});

