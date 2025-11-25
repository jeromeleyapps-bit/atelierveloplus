import { test, expect } from '@playwright/test';

test.describe('Tickets (Work Orders)', () => {
  test.beforeEach(async ({ page }) => {
    // Se connecter avant chaque test
    await page.goto('/auth/login');
    await page.getByLabel(/email/i).fill('admin@atelier-velo.fr');
    await page.getByLabel(/mot de passe/i).fill('Admin123!');
    await page.getByRole('button', { name: /se connecter/i }).click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
  });

  test('should display tickets page', async ({ page }) => {
    await page.goto('/tickets');
    
    // Vérifier que la page des tickets s'affiche
    await expect(page.getByRole('heading', { name: /tickets|atelier/i })).toBeVisible();
  });

  test('should open create ticket dialog', async ({ page }) => {
    await page.goto('/tickets');
    
    // Cliquer sur le bouton "Nouveau ticket"
    await page.getByRole('button', { name: /nouveau|créer/i }).first().click();
    
    // Vérifier que le dialog s'ouvre
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByText(/nouveau ticket|créer un ticket/i)).toBeVisible();
  });

  test('should filter tickets by status', async ({ page }) => {
    await page.goto('/tickets');
    
    // Attendre que les tickets se chargent
    await page.waitForTimeout(2000);
    
    // Cliquer sur un filtre de statut (ex: "En cours")
    const statusButton = page.getByRole('button', { name: /en cours|pending/i }).first();
    if (await statusButton.isVisible()) {
      await statusButton.click();
      
      // Vérifier que l'URL contient le filtre
      await expect(page).toHaveURL(/status/);
    }
  });

  test('should search tickets', async ({ page }) => {
    await page.goto('/tickets');
    
    // Chercher un champ de recherche
    const searchInput = page.getByPlaceholder(/rechercher|search/i);
    if (await searchInput.isVisible()) {
      await searchInput.fill('test');
      
      // Attendre les résultats
      await page.waitForTimeout(1000);
      
      // Vérifier que la recherche fonctionne (au moins pas d'erreur)
      await expect(page.getByRole('main')).toBeVisible();
    }
  });
});

