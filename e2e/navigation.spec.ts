import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
  test.beforeEach(async ({ page }) => {
    // Se connecter avant chaque test
    await page.goto('/auth/login');
    await page.getByLabel(/email/i).fill('admin@atelier-velo.fr');
    await page.getByLabel(/mot de passe/i).fill('Admin123!');
    await page.getByRole('button', { name: /se connecter/i }).click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
  });

  test('should navigate to dashboard', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByRole('heading', { name: /tableau de bord|dashboard/i })).toBeVisible();
  });

  test('should navigate to tickets', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Cliquer sur le lien Tickets dans le menu
    await page.getByRole('link', { name: /tickets|atelier/i }).first().click();
    
    await expect(page).toHaveURL(/\/tickets/);
  });

  test('should navigate to customers', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Cliquer sur le lien Clients dans le menu
    await page.getByRole('link', { name: /clients|customers/i }).first().click();
    
    await expect(page).toHaveURL(/\/customers/);
  });

  test('should navigate to catalog', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Cliquer sur le lien Catalogue dans le menu
    const catalogLink = page.getByRole('link', { name: /catalogue|catalog/i }).first();
    if (await catalogLink.isVisible()) {
      await catalogLink.click();
      await expect(page).toHaveURL(/\/catalog/);
    }
  });

  test('should navigate to finance', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Cliquer sur le lien Finance dans le menu
    const financeLink = page.getByRole('link', { name: /finance|facturation/i }).first();
    if (await financeLink.isVisible()) {
      await financeLink.click();
      await expect(page).toHaveURL(/\/finance/);
    }
  });

  test('should access admin settings', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Cliquer sur le lien Admin dans le menu
    const adminLink = page.getByRole('link', { name: /admin|paramètres/i }).first();
    if (await adminLink.isVisible()) {
      await adminLink.click();
      await expect(page).toHaveURL(/\/admin/);
    }
  });
});

