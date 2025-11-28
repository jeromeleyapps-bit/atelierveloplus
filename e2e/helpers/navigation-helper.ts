import { Page } from '@playwright/test';

/**
 * Helper pour naviguer vers une page spécifique
 */
export async function navigateTo(page: Page, path: string) {
  await page.goto(path);
  await page.waitForLoadState('networkidle');
}

/**
 * Helper pour naviguer vers le dashboard
 */
export async function goToDashboard(page: Page) {
  await navigateTo(page, '/dashboard');
  await page.waitForURL(/\/dashboard/);
}

/**
 * Helper pour naviguer vers les tickets
 */
export async function goToTickets(page: Page) {
  await navigateTo(page, '/tickets');
  await page.waitForURL(/\/tickets/);
}

/**
 * Helper pour naviguer vers les clients
 */
export async function goToCustomers(page: Page) {
  await navigateTo(page, '/customers');
  await page.waitForURL(/\/customers/);
}

/**
 * Helper pour naviguer vers le catalogue
 */
export async function goToCatalog(page: Page) {
  await navigateTo(page, '/catalog');
  await page.waitForURL(/\/catalog/);
}

/**
 * Helper pour naviguer vers la finance
 */
export async function goToFinance(page: Page) {
  await navigateTo(page, '/finance');
  await page.waitForURL(/\/finance/);
}

/**
 * Helper pour naviguer vers les paramètres admin
 */
export async function goToAdminSettings(page: Page) {
  await navigateTo(page, '/admin/settings');
  await page.waitForURL(/\/admin\/settings/);
}

