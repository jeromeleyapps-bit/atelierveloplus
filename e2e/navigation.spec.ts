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
    await page.goto('/dashboard');
    await page.waitForURL(/\/dashboard/, { timeout: 10000 });
    await page.waitForLoadState('networkidle');
    
    // Attendre que les liens de navigation soient chargés
    await page.waitForTimeout(1000);
    
    // Les liens de navigation sont des Button avec component={Link}, rendus comme des links
    const ticketsLink = page.getByRole('link', { name: /réparations/i }).first();
    await expect(ticketsLink).toBeVisible({ timeout: 10000 });
    await ticketsLink.click();
    
    await expect(page).toHaveURL(/\/tickets/, { timeout: 10000 });
    await page.waitForLoadState('networkidle');
  });

  test('should navigate to customers', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForURL(/\/dashboard/, { timeout: 10000 });
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    
    const customersLink = page.getByRole('link', { name: /clients/i }).first();
    await expect(customersLink).toBeVisible({ timeout: 10000 });
    await customersLink.click();
    
    await expect(page).toHaveURL(/\/customers/, { timeout: 10000 });
    await page.waitForLoadState('networkidle');
  });

  test('should navigate to catalog', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForURL(/\/dashboard/, { timeout: 10000 });
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    
    const catalogLink = page.getByRole('link', { name: /catalogue/i }).first();
    await expect(catalogLink).toBeVisible({ timeout: 10000 });
    await catalogLink.click();
    
    await expect(page).toHaveURL(/\/catalog/, { timeout: 10000 });
    await page.waitForLoadState('networkidle');
  });

  test('should navigate to finance', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForURL(/\/dashboard/, { timeout: 10000 });
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    
    const financeLink = page.getByRole('link', { name: /facturation/i }).first();
    await expect(financeLink).toBeVisible({ timeout: 10000 });
    await financeLink.click();
    
    await expect(page).toHaveURL(/\/finance/, { timeout: 10000 });
    await page.waitForLoadState('networkidle');
  });

  test('should access admin settings', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForURL(/\/dashboard/, { timeout: 10000 });
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    
    const adminLink = page.getByRole('link', { name: /^admin$/i }).first();
    await expect(adminLink).toBeVisible({ timeout: 10000 });
    await adminLink.click();
    
    await expect(page).toHaveURL(/\/admin/, { timeout: 10000 });
    await page.waitForLoadState('networkidle');
  });
});

