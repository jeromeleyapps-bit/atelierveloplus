import { defineConfig, devices } from '@playwright/test';

/**
 * Configuration Playwright pour tests E2E
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './e2e',
  
  /* Setup global avant tous les tests */
  globalSetup: require.resolve('./e2e/global-setup.js'),
  
  /* Timeout par test - augmenté pour gérer RequireAuth token validation */
  timeout: 60 * 1000,
  
  /* Expect timeout */
  expect: {
    timeout: 10000
  },
  
  /* Exécution parallèle */
  fullyParallel: true,
  
  /* Retry en cas d'échec (CI uniquement) */
  retries: process.env.CI ? 2 : 0,
  
  /* Workers parallèles */
  workers: process.env.CI ? 1 : undefined,
  
  /* Reporter */
  reporter: 'html',
  
  /* Configuration partagée pour tous les projets */
  use: {
    /* URL de base */
    baseURL: 'http://localhost:3000',
    
    /* Trace en cas d'échec */
    trace: 'on-first-retry',
    
    /* Screenshot en cas d'échec */
    screenshot: 'only-on-failure',
    
    /* Video en cas d'échec */
    video: 'retain-on-failure',
  },

  /* Configuration des projets (browsers) */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  /* Serveur de dev (optionnel - si tests lancés sans serveur) */
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});

