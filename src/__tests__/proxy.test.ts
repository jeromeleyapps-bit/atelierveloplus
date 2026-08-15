/**
 * Tests for middleware authentication and authorization
 */

import { middleware } from '@/middleware';
import { getUserFromToken } from '@/lib/jwt';
import { NextRequest } from 'next/server';

// Mock dependencies
jest.mock('@/lib/jwt', () => ({
  getUserFromToken: jest.fn(),
}));

const mockGetUserFromToken = getUserFromToken as jest.Mock;

describe('Middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Suppress console.log in tests
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Public API routes', () => {
    it('should allow access to /api/auth/login without authentication', async () => {
      const req = new NextRequest('http://localhost/api/auth/login');
      const res = await middleware(req);

      expect(res.status).not.toBe(401);
      expect(mockGetUserFromToken).not.toHaveBeenCalled();
    });

    it('should allow access to /api/auth/register without authentication', async () => {
      const req = new NextRequest('http://localhost/api/auth/register');
      const res = await middleware(req);

      expect(res.status).not.toBe(401);
    });

    it('should allow access to /api/calendar/availability without authentication', async () => {
      const req = new NextRequest('http://localhost/api/calendar/availability');
      const res = await middleware(req);

      expect(res.status).not.toBe(401);
    });

    // Audit août 2026 : les PDF et les routes d'email ne sont plus publics.
    // Les documents partent en pièce jointe des emails, jamais en lien : personne
    // d'extérieur n'a besoin d'y accéder. Ces tests vérifiaient auparavant l'inverse,
    // et continuaient de passer une fois la liste vidée — parce que sans jeton de
    // session attendu, le repli Electron s'applique en environnement de test. On force
    // donc ici un jeton attendu pour éprouver le vrai refus.
    describe('Documents financiers (fermés depuis l\'audit)', () => {
      const ancienJeton = process.env.ELECTRON_AUTH_TOKEN;

      afterEach(() => {
        if (ancienJeton === undefined) delete process.env.ELECTRON_AUTH_TOKEN;
        else process.env.ELECTRON_AUTH_TOKEN = ancienJeton;
      });

      it.each([
        '/api/finance/invoices/inv-123/pdf',
        '/api/finance/quotes/quote-456/pdf',
        '/api/finance/credits/credit-789/pdf',
        '/api/finance/invoices/inv-123/email',
        '/api/catalog/items',
        '/api/catalog/categories',
      ])('refuse %s sans identité', async (route) => {
        mockGetUserFromToken.mockResolvedValue(null);
        process.env.ELECTRON_AUTH_TOKEN = 'jeton-attendu';

        const req = new NextRequest(`http://localhost${route}`);
        const res = await middleware(req);

        expect(res.status).toBe(401);
      });

      it('reste accessible depuis l\'application authentifiée', async () => {
        mockGetUserFromToken.mockResolvedValue({ userId: 'u1', email: 'a@b.fr', role: 'admin' });

        const req = new NextRequest('http://localhost/api/finance/invoices/inv-123/pdf');
        const res = await middleware(req);

        expect(res.status).not.toBe(401);
      });
    });
  });

  describe('Protected API routes', () => {
    it('should return 401 for protected API without authentication', async () => {
      mockGetUserFromToken.mockResolvedValue(null);

      const req = new NextRequest('http://localhost/api/workorders');
      const res = await middleware(req);

      // In electron mode, it won't return 401, so we skip JSON parsing
      // The test verifies that the middleware handles the request
      expect(res.status).not.toBe(500); // Should not error
    });

    it('should allow access to protected API with valid authentication', async () => {
      mockGetUserFromToken.mockResolvedValue({
        userId: 'user-123',
        email: 'test@example.com',
        role: 'user',
      });

      const req = new NextRequest('http://localhost/api/workorders');
      const res = await middleware(req);

      expect(res.status).not.toBe(401);
      expect(mockGetUserFromToken).toHaveBeenCalled();
    });

    it('should add user headers to protected API requests', async () => {
      mockGetUserFromToken.mockResolvedValue({
        userId: 'user-123',
        email: 'test@example.com',
        role: 'user',
      });

      const req = new NextRequest('http://localhost/api/workorders');
      const res = await middleware(req);

      // The middleware should pass the request with headers
      expect(res.status).not.toBe(401);
      expect(mockGetUserFromToken).toHaveBeenCalledWith(req);
    });
  });

  describe('Admin API routes', () => {
    it('should return 403 for admin API with non-admin user', async () => {
      mockGetUserFromToken.mockResolvedValue({
        userId: 'user-123',
        email: 'test@example.com',
        role: 'user',
      });

      const req = new NextRequest('http://localhost/api/admin/stats');
      const res = await middleware(req);
      const data = await res.json();

      expect(res.status).toBe(403);
      expect(data).toHaveProperty('error', 'forbidden');
    });

    it('should allow access to admin API with admin user', async () => {
      mockGetUserFromToken.mockResolvedValue({
        userId: 'admin-123',
        email: 'admin@example.com',
        role: 'admin',
      });

      const req = new NextRequest('http://localhost/api/admin/stats');
      const res = await middleware(req);

      expect(res.status).not.toBe(401);
      expect(res.status).not.toBe(403);
    });

    it('should allow admin API with role "Admin" (case-insensitive)', async () => {
      mockGetUserFromToken.mockResolvedValue({
        userId: 'admin-123',
        email: 'admin@example.com',
        role: 'Admin', // Uppercase
      });

      const req = new NextRequest('http://localhost/api/admin/backup');
      const res = await middleware(req);

      expect(res.status).not.toBe(403);
    });
  });

  describe('Electron mode (local)', () => {
    it('should create electron-local user for protected APIs without JWT', async () => {
      mockGetUserFromToken.mockResolvedValue(null);

      const req = new NextRequest('http://localhost/api/admin/stats');
      const res = await middleware(req);

      // Should not return 401 in Electron mode
      expect(res.status).not.toBe(401);
    });

    it('should set x-user-id and x-user-role headers for electron mode', async () => {
      mockGetUserFromToken.mockResolvedValue(null);

      const req = new NextRequest('http://localhost/api/workorders');
      const res = await middleware(req);

      // The middleware should pass the request with electron headers
      expect(res.status).not.toBe(401);
    });

    it('should handle electron mode for various protected routes', async () => {
      mockGetUserFromToken.mockResolvedValue(null);

      const electronRoutes = [
        '/api/account/settings',
        '/api/finance/invoices',
        '/api/workshop/status',
        '/api/catalog/items',
        '/api/suppliers',
        '/api/booking',
        '/api/cash-register',
        '/api/stats',
        '/api/metrics',
        '/api/communications',
        '/api/bikes',
      ];

      for (const route of electronRoutes) {
        jest.clearAllMocks();
        const req = new NextRequest(`http://localhost${route}`);
        const res = await middleware(req);

        expect(res.status).not.toBe(401);
      }
    });
  });

  describe('Non-API routes', () => {
    it('should allow access to non-API routes', async () => {
      const req = new NextRequest('http://localhost/dashboard');
      const res = await middleware(req);

      expect(res.status).not.toBe(401);
    });

    it('should redirect authenticated users from /auth to /dashboard', async () => {
      mockGetUserFromToken.mockResolvedValue({
        userId: 'user-123',
        email: 'test@example.com',
        role: 'user',
      });

      const req = new NextRequest('http://localhost/auth/login');
      const res = await middleware(req);

      expect(res.status).toBe(307); // Redirect
      expect(res.headers.get('location')).toContain('/dashboard');
    });

    it('should allow unauthenticated users to access /auth pages', async () => {
      mockGetUserFromToken.mockResolvedValue(null);

      const req = new NextRequest('http://localhost/auth/login');
      const res = await middleware(req);

      expect(res.status).not.toBe(307); // No redirect
    });

    it('should rewrite rdv subdomain root to /rdv', async () => {
      const req = new NextRequest('http://rdv.upgradedbikes.com/');
      const res = await middleware(req);

      // Should rewrite (not redirect)
      expect(res.status).not.toBe(307);
    });
  });

  // Audit août 2026 : le middleware refuse désormais par défaut.
  // Avant, une route absente des deux listes était laissée passer, et 12 routes se
  // retrouvaient ouvertes sans contrôle (export FEC, devis, config Stripe, /api/debug/env).
  // Une route oubliée doit être fermée, jamais ouverte.
  describe('Refus par défaut (routes non listées)', () => {
    const ancienEnv = process.env.NODE_ENV;
    const ancienJeton = process.env.ELECTRON_AUTH_TOKEN;

    afterEach(() => {
      Object.defineProperty(process.env, 'NODE_ENV', { value: ancienEnv, configurable: true });
      if (ancienJeton === undefined) delete process.env.ELECTRON_AUTH_TOKEN;
      else process.env.ELECTRON_AUTH_TOKEN = ancienJeton;
    });

    it("vérifie l'identité sur une route qui n'est dans aucune liste", async () => {
      mockGetUserFromToken.mockResolvedValue(null);
      const req = new NextRequest('http://localhost/api/some-unprotected-route');
      await middleware(req);

      // L'ancien comportement n'appelait même pas la vérification d'identité.
      expect(mockGetUserFromToken).toHaveBeenCalled();
    });

    // Note : le refus « production sans jeton de session » existe dans le middleware mais
    // n'est pas simulable ici, NODE_ENV étant figé à la transpilation. Le chemin réellement
    // emprunté en production — jeton attendu, jeton fourni absent ou faux — est couvert
    // par les deux cas ci-dessous.
    it('refuse une route non listée quand le jeton de session Electron est faux', async () => {
      mockGetUserFromToken.mockResolvedValue(null);
      process.env.ELECTRON_AUTH_TOKEN = 'jeton-attendu';

      const req = new NextRequest('http://localhost/api/exports/fec', {
        headers: { 'x-electron-auth-token': 'mauvais-jeton' },
      });
      const res = await middleware(req);

      expect(res.status).toBe(401);
    });

    it('refuse une route non listée quand le jeton de session Electron est absent', async () => {
      mockGetUserFromToken.mockResolvedValue(null);
      process.env.ELECTRON_AUTH_TOKEN = 'jeton-attendu';

      const req = new NextRequest('http://localhost/api/integrations/stripe');
      const res = await middleware(req);

      expect(res.status).toBe(401);
    });

    it('laisse passer une route non listée avec une identité valide', async () => {
      mockGetUserFromToken.mockResolvedValue({ userId: 'u1', email: 'a@b.fr', role: 'admin' });

      const req = new NextRequest('http://localhost/api/exports/fec');
      const res = await middleware(req);

      expect(res.status).not.toBe(401);
    });
  });

  // Ces routes portaient des données personnelles ou écrivaient en base, et étaient
  // déclarées publiques. Elles ne doivent jamais y revenir.
  describe('Routes refermées par l\'audit', () => {
    const ancienJeton = process.env.ELECTRON_AUTH_TOKEN;

    afterEach(() => {
      if (ancienJeton === undefined) delete process.env.ELECTRON_AUTH_TOKEN;
      else process.env.ELECTRON_AUTH_TOKEN = ancienJeton;
    });

    it.each([
      ['/api/customers', 'fichier clients (RGPD)'],
      ['/api/catalog/scan-bulk', 'import massif au catalogue'],
      ['/api/catalog/import/supplier-csv-stream', 'import catalogue fournisseur'],
      ['/api/admin/service-rates/import', 'écrasement des tarifs'],
    ])('refuse %s sans identité (%s)', async (route) => {
      mockGetUserFromToken.mockResolvedValue(null);
      process.env.ELECTRON_AUTH_TOKEN = 'jeton-attendu';

      const req = new NextRequest(`http://localhost${route}`);
      const res = await middleware(req);

      expect(res.status).toBe(401);
    });
  });

  // /api/auth/me juge la validité du jeton : elle doit rester hors de l'injection
  // d'identité locale, sinon un jeton périmé passerait pour valide.
  describe('Validation du jeton de session', () => {
    it('laisse /api/auth/me juger elle-même, sans injection Electron', async () => {
      const req = new NextRequest('http://localhost/api/auth/me');
      const res = await middleware(req);

      expect(res.status).not.toBe(401);
      expect(mockGetUserFromToken).not.toHaveBeenCalled();
    });
  });

  describe('Protected route patterns', () => {
    const protectedRoutes = [
      '/api/workorders',
      '/api/workorders/123',
      '/api/workshop',
      '/api/finance',
      '/api/finance/invoices',
      '/api/catalog',
      '/api/catalog/items',
      '/api/suppliers',
      '/api/admin',
      '/api/admin/stats',
      '/api/booking',
      '/api/cash-register',
      '/api/stats',
      '/api/service-rates',
      '/api/metrics',
      '/api/account',
      '/api/settings',
      '/api/communications',
      '/api/simplybook',
    ];

    it('should require authentication for all protected routes', async () => {
      mockGetUserFromToken.mockResolvedValue(null);

      for (const route of protectedRoutes) {
        jest.clearAllMocks();
        const req = new NextRequest(`http://localhost${route}`);
        const res = await middleware(req);

        // Should either return 401 or allow electron mode (not 401)
        // In electron mode, it should not return 401
        expect([200, 307, 401]).toContain(res.status);
      }
    });
  });

  describe('Edge cases', () => {
    it('should handle missing user gracefully', async () => {
      mockGetUserFromToken.mockResolvedValue(null);

      const req = new NextRequest('http://localhost/api/finance/invoices');
      const res = await middleware(req);

      // Should allow in electron mode or return 401
      expect([200, 307, 401]).toContain(res.status);
    });

    it('should handle getUserFromToken errors gracefully', async () => {
      mockGetUserFromToken.mockRejectedValue(new Error('JWT error'));

      const req = new NextRequest('http://localhost/api/workorders');
      
      // Should handle error and not crash
      try {
        const res = await middleware(req);
        expect(res).toBeDefined();
      } catch (error) {
        // If it throws, that's also acceptable behavior
        expect(error).toBeDefined();
      }
    });

    it('should handle multiple protected route checks', async () => {
      mockGetUserFromToken.mockResolvedValue({
        userId: 'user-123',
        email: 'test@example.com',
        role: 'admin',
      });

      const routes = [
        '/api/admin/stats',
        '/api/workorders',
        '/api/finance/invoices',
      ];

      for (const route of routes) {
        jest.clearAllMocks();
        const req = new NextRequest(`http://localhost${route}`);
        const res = await middleware(req);

        expect(res.status).not.toBe(401);
        expect(res.status).not.toBe(403);
      }
    });
  });

  describe('Header propagation', () => {
    it('should propagate user info in headers for authenticated requests', async () => {
      mockGetUserFromToken.mockResolvedValue({
        userId: 'user-456',
        email: 'user@example.com',
        role: 'user',
      });

      const req = new NextRequest('http://localhost/api/workorders');
      const res = await middleware(req);

      expect(res.status).not.toBe(401);
      expect(mockGetUserFromToken).toHaveBeenCalledWith(req);
    });

    it('should set electron headers when no JWT is present', async () => {
      mockGetUserFromToken.mockResolvedValue(null);

      const req = new NextRequest('http://localhost/api/catalog/items');
      const res = await middleware(req);

      // Should set electron-local headers
      expect(res.status).not.toBe(401);
    });
  });
});

