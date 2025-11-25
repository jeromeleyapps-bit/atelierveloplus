import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display login page', async ({ page }) => {
    // Vérifier que la page de login s'affiche
    await expect(page).toHaveURL(/\/auth\/login/);
    await expect(page.getByRole('heading', { name: /connexion/i })).toBeVisible();
  });

  test('should show error with invalid credentials', async ({ page }) => {
    await page.goto('/auth/login');
    
    // Remplir le formulaire avec des credentials invalides
    await page.getByLabel(/email/i).fill('invalid@example.com');
    await page.getByLabel(/mot de passe/i).fill('wrongpassword');
    
    // Soumettre le formulaire
    await page.getByRole('button', { name: /se connecter/i }).click();
    
    // Vérifier le message d'erreur
    await expect(page.getByText(/identifiants invalides/i)).toBeVisible({ timeout: 5000 });
  });

  test('should redirect to dashboard after successful login', async ({ page }) => {
    await page.goto('/auth/login');
    
    // Utiliser des credentials de test (à adapter selon votre DB de test)
    await page.getByLabel(/email/i).fill('admin@atelier-velo.fr');
    await page.getByLabel(/mot de passe/i).fill('Admin123!');
    
    // Soumettre le formulaire
    await page.getByRole('button', { name: /se connecter/i }).click();
    
    // Vérifier la redirection vers le dashboard
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
  });

  test('should logout successfully', async ({ page }) => {
    // Se connecter d'abord
    await page.goto('/auth/login');
    await page.getByLabel(/email/i).fill('admin@atelier-velo.fr');
    await page.getByLabel(/mot de passe/i).fill('Admin123!');
    await page.getByRole('button', { name: /se connecter/i }).click();
    
    // Attendre le dashboard
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
    
    // Se déconnecter
    await page.getByRole('button', { name: /déconnexion|profil/i }).click();
    await page.getByRole('menuitem', { name: /déconnexion/i }).click();
    
    // Vérifier la redirection vers login
    await expect(page).toHaveURL(/\/auth\/login/, { timeout: 5000 });
  });
});

