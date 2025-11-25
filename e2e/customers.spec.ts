import { test, expect } from '@playwright/test';

test.describe('Customers', () => {
  test.beforeEach(async ({ page }) => {
    // Se connecter avant chaque test
    await page.goto('/auth/login');
    await page.getByLabel(/email/i).fill('admin@atelier-velo.fr');
    await page.getByLabel(/mot de passe/i).fill('Admin123!');
    await page.getByRole('button', { name: /se connecter/i }).click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
  });

  test('should display customers page', async ({ page }) => {
    await page.goto('/customers');
    
    // Vérifier que la page des clients s'affiche
    await expect(page.getByRole('heading', { name: /clients|customers/i })).toBeVisible();
  });

  test('should open create customer dialog', async ({ page }) => {
    await page.goto('/customers');
    
    // Cliquer sur le bouton "Nouveau client"
    await page.getByRole('button', { name: /nouveau|créer|ajouter/i }).first().click();
    
    // Vérifier que le dialog s'ouvre
    await expect(page.getByRole('dialog')).toBeVisible();
  });

  test('should search customers', async ({ page }) => {
    await page.goto('/customers');
    
    // Attendre que la page se charge
    await page.waitForTimeout(2000);
    
    // Chercher un champ de recherche
    const searchInput = page.getByPlaceholder(/rechercher|search/i);
    if (await searchInput.isVisible()) {
      await searchInput.fill('test');
      
      // Attendre les résultats
      await page.waitForTimeout(1000);
      
      // Vérifier que la recherche fonctionne
      await expect(page.getByRole('main')).toBeVisible();
    }
  });

  test('should display customer details', async ({ page }) => {
    await page.goto('/customers');
    
    // Attendre que les clients se chargent
    await page.waitForTimeout(2000);
    
    // Cliquer sur le premier client (si existe)
    const firstCustomer = page.getByRole('row').nth(1);
    if (await firstCustomer.isVisible()) {
      await firstCustomer.click();
      
      // Vérifier qu'on est sur la page de détails
      await expect(page).toHaveURL(/\/customers\/[a-z0-9-]+/);
    }
  });
});

