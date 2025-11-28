import { test, expect } from '@playwright/test';
import { login } from './helpers/auth-helper';
import { goToDashboard } from './helpers/navigation-helper';

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
    await goToDashboard(page);
    await page.waitForLoadState('networkidle');
    
    // Cliquer sur le lien Tickets dans le menu de navigation
    const ticketsLink = page.getByRole('link', { name: /tickets|réparations|atelier/i }).first();
    await ticketsLink.waitFor({ state: 'visible', timeout: 5000 });
    await ticketsLink.click();
    
    await expect(page).toHaveURL(/\/tickets/, { timeout: 10000 });
    await page.waitForLoadState('networkidle');
  });

  test('should navigate to customers', async ({ page }) => {
    await goToDashboard(page);
    await page.waitForLoadState('networkidle');
    
    // Cliquer sur le lien Clients dans le menu de navigation
    const customersLink = page.getByRole('link', { name: /clients|customers/i }).first();
    await customersLink.waitFor({ state: 'visible', timeout: 5000 });
    await customersLink.click();
    
    await expect(page).toHaveURL(/\/customers/, { timeout: 10000 });
    await page.waitForLoadState('networkidle');
  });

  test('should navigate to catalog', async ({ page }) => {
    await goToDashboard(page);
    await page.waitForLoadState('networkidle');
    
    // Cliquer sur le lien Catalogue dans le menu de navigation
    const catalogLink = page.getByRole('link', { name: /catalogue|catalog/i }).first();
    await catalogLink.waitFor({ state: 'visible', timeout: 5000 });
    await catalogLink.click();
    
    await expect(page).toHaveURL(/\/catalog/, { timeout: 10000 });
    await page.waitForLoadState('networkidle');
  });

  test('should navigate to finance', async ({ page }) => {
    await goToDashboard(page);
    await page.waitForLoadState('networkidle');
    
    // Cliquer sur le lien Finance dans le menu de navigation
    const financeLink = page.getByRole('link', { name: /finance|facturation/i }).first();
    await financeLink.waitFor({ state: 'visible', timeout: 5000 });
    await financeLink.click();
    
    await expect(page).toHaveURL(/\/finance/, { timeout: 10000 });
    await page.waitForLoadState('networkidle');
  });

  test('should access admin settings', async ({ page }) => {
    await goToDashboard(page);
    await page.waitForLoadState('networkidle');
    
    // Cliquer sur le lien Admin dans le menu de navigation - peut être dans le menu déroulant
    const adminLink = page.getByRole('link', { name: /admin|paramètres|settings/i }).first();
    await adminLink.waitFor({ state: 'visible', timeout: 5000 });
    await adminLink.click();
    
    // Vérifier qu'on est sur une page admin (peut être /admin ou /admin/settings)
    await expect(page).toHaveURL(/\/admin/, { timeout: 10000 });
  });
});

