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
    await page.waitForURL(/\/tickets/, { timeout: 10000 });
    await page.waitForLoadState('networkidle');
    
    // Vérifier que la page s'affiche correctement
    await expect(page.getByText(/tickets.*atelier/i).first()).toBeVisible({ timeout: 10000 });
  });

  test('should navigate to customers', async ({ page }) => {
    // Naviguer directement vers customers pour tester l'accès
    await page.goto('/customers');
    await page.waitForURL(/\/customers/, { timeout: 10000 });
    await page.waitForLoadState('networkidle');
    
    // Vérifier que la page s'affiche correctement
    await expect(page.getByText(/clients/i).first()).toBeVisible({ timeout: 10000 });
  });

  test('should navigate to catalog', async ({ page }) => {
    // Naviguer directement vers catalog pour tester l'accès
    await page.goto('/catalog');
    await page.waitForURL(/\/catalog/, { timeout: 10000 });
    await page.waitForLoadState('networkidle');
    
    // Vérifier que la page s'affiche correctement (au moins pas d'erreur)
    await expect(page.getByRole('main')).toBeVisible({ timeout: 10000 });
  });

  test('should navigate to finance', async ({ page }) => {
    // Naviguer directement vers finance pour tester l'accès
    await page.goto('/finance');
    await page.waitForURL(/\/finance/, { timeout: 10000 });
    await page.waitForLoadState('networkidle');
    
    // Vérifier que la page s'affiche correctement (au moins pas d'erreur)
    await expect(page.getByRole('main')).toBeVisible({ timeout: 10000 });
  });

  test('should access admin settings', async ({ page }) => {
    // Naviguer directement vers admin pour tester l'accès
    await page.goto('/admin');
    await page.waitForURL(/\/admin/, { timeout: 10000 });
    await page.waitForLoadState('networkidle');
    
    // Vérifier que la page s'affiche correctement (au moins pas d'erreur)
    await expect(page.getByRole('main')).toBeVisible({ timeout: 10000 });
  });
});

