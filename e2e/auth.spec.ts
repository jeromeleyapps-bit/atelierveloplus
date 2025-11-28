import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display login page', async ({ page }) => {
    // Vérifier que la page de login s'affiche
    await page.goto('/auth/login');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/auth\/login/);
    // Attendre que le heading soit visible (peut prendre du temps avec Suspense)
    await expect(page.getByRole('heading', { name: /connexion/i })).toBeVisible({ timeout: 10000 });
  });

  test('should show error with invalid credentials', async ({ page }) => {
    await page.goto('/auth/login');
    await page.waitForLoadState('networkidle');
    
    // Remplir le formulaire avec des credentials invalides
    await page.getByLabel(/email/i).fill('invalid@example.com');
    await page.getByLabel(/mot de passe/i).fill('wrongpassword');
    
    // Soumettre le formulaire
    await page.getByRole('button', { name: /se connecter/i }).click();
    
    // Attendre que le Snackbar avec le message d'erreur apparaisse
    // Le message peut être "Échec de connexion" ou un autre message d'erreur
    // Chercher dans le Snackbar (role alert) ou dans le texte de la page
    try {
      await expect(page.getByRole('alert')).toBeVisible({ timeout: 5000 });
    } catch {
      // Si le Snackbar n'est pas visible, chercher le texte d'erreur directement
      await expect(page.getByText(/échec|erreur|invalide/i)).toBeVisible({ timeout: 5000 });
    }
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
    await page.waitForLoadState('networkidle');
    await page.getByLabel(/email/i).fill('admin@atelier-velo.fr');
    await page.getByLabel(/mot de passe/i).fill('Admin123!');
    await page.getByRole('button', { name: /se connecter/i }).click();
    
    // Attendre le dashboard
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
    await page.waitForLoadState('networkidle');
    
    // Ouvrir le menu (bouton avec icône menu)
    await page.getByRole('button', { name: /menu/i }).click();
    
    // Cliquer sur "Déconnexion" dans le menu
    await page.getByRole('menuitem', { name: /déconnexion/i }).click();
    
    // Vérifier la redirection vers login
    await expect(page).toHaveURL(/\/auth\/login/, { timeout: 10000 });
  });
});

