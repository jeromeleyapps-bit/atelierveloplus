import { Page } from '@playwright/test';

/**
 * Credentials de test par défaut
 */
export const TEST_CREDENTIALS = {
  email: 'admin@atelier-velo.fr',
  password: 'Admin123!',
};

/**
 * Helper pour se connecter dans les tests E2E
 */
export async function login(page: Page, email = TEST_CREDENTIALS.email, password = TEST_CREDENTIALS.password) {
  await page.goto('/auth/login');
  await page.waitForLoadState('networkidle');
  
  // Remplir le formulaire de connexion
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/mot de passe/i).fill(password);
  
  // Soumettre le formulaire
  await page.getByRole('button', { name: /se connecter/i }).click();
  
  // Attendre la redirection vers le dashboard
  await page.waitForURL(/\/dashboard/, { timeout: 10000 });
  await page.waitForLoadState('networkidle');
  
  // Attendre que l'authentification soit complètement initialisée
  // Cela permet à RequireAuth de valider le token avant de naviguer ailleurs
  await page.waitForTimeout(1000);
}

/**
 * Helper pour se déconnecter
 */
export async function logout(page: Page) {
  // Cliquer sur le menu profil/déconnexion
  const logoutButton = page.getByRole('button', { name: /déconnexion|profil/i });
  
  if (await logoutButton.isVisible()) {
    await logoutButton.click();
    
    // Cliquer sur l'option de déconnexion dans le menu
    const logoutMenuItem = page.getByRole('menuitem', { name: /déconnexion/i });
    if (await logoutMenuItem.isVisible()) {
      await logoutMenuItem.click();
    }
  }
  
  // Attendre la redirection vers la page de login
  await page.waitForURL(/\/auth\/login/, { timeout: 5000 });
}

/**
 * Helper pour vérifier qu'on est connecté
 */
export async function ensureLoggedIn(page: Page) {
  const currentUrl = page.url();
  
  // Si on n'est pas sur le dashboard, se connecter
  if (!currentUrl.includes('/dashboard')) {
    await login(page);
  }
}

