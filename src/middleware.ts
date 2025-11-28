import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getUserFromToken } from '@/lib/jwt';
import { logger } from '@/lib/logger';
// import { getLicenseInfo } from '@/lib/license-manager'; // Désactivé - Prisma incompatible middleware

// Routes publiques (accessibles sans authentification)
// Note: Actuellement non utilisées car authentification gérée côté composants
// const publicRoutes = ['/', '/auth/login', '/auth/register', '/rdv', '/booking-local'];

// Routes API publiques (pas d'authentification requise)
const publicApiRoutes = [
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/logout',
  '/api/calendar/availability',  // Disponibilités pour prise de RDV clients
  '/api/calendar/bookings',       // Réservations clients
  '/api/calendar/events',         // Événements calendrier (lecture seule)
  '/api/calendar/blocks',         // Blocs calendrier (lecture seule)
  '/api/customers',               // Liste clients pour autocomplete
  '/api/catalog/barcode',         // Lookup code-barres uniquement (lecture seule)
  '/api/catalog/import/supplier-csv-stream',  // Import CSV fournisseur (streaming)
  '/api/catalog/scan-bulk',       // Import CSV scanner
  '/api/admin/service-rates/import',  // Import CSV tarifs et prestations
];

// Patterns de routes publiques (regex)
const publicPatterns = [
  /^\/api\/finance\/invoices\/[^/]+\/pdf$/,     // PDFs factures
  /^\/api\/finance\/quotes\/[^/]+\/pdf$/,       // PDFs devis
  /^\/api\/finance\/credits\/[^/]+\/pdf$/,      // PDFs avoirs
  /^\/api\/finance\/invoices\/[^/]+\/email$/,   // Envoi email facture
  /^\/api\/finance\/quotes\/[^/]+\/email$/,     // Envoi email devis
  /^\/api\/finance\/credits\/[^/]+\/email$/,    // Envoi email avoir
  /^\/api\/catalog\/items$/,                     // Liste des items (GET uniquement, page protégée côté client)
  /^\/api\/catalog\/categories$/,                // Liste des catégories (GET uniquement)
];

// Routes admin (nécessitent role = admin)
// Note: Actuellement non utilisées, vérification admin faite côté composants
// const adminRoutes = ['/admin'];

// APIs protégées (nécessitent authentification)
const protectedApiRoutes = [
  '/api/workorders',
  '/api/workshop',
  '/api/finance',
  '/api/catalog',
  '/api/suppliers',
  '/api/admin',
  '/api/booking',
  '/api/cash-register',
  '/api/stats',
  '/api/service-rates',  // Lecture prestations (authentifié, pas admin)
  '/api/metrics',
  '/api/account',
  '/api/settings',
  '/api/communications',
  '/api/simplybook',
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const host = request.headers.get('host') || '';
  
  // ⚠️ DIAGNOSTIC: Log TOUJOURS pour vérifier que le middleware s'exécute
  logger.info('🔵 [MIDDLEWARE] EXECUTING for', { pathname });
  
  // Log pour vérifier que le proxy s'exécute
  if (pathname.startsWith('/api/')) {
    logger.info('[Proxy] Request', { pathname });
  }
  
  // Rewrite publique: rdv subdomain root -> /rdv (sans redirection visible)
  if (!pathname.startsWith('/api/')) {
    if (host === 'rdv.upgradedbikes.com' && (pathname === '/' || pathname === '')) {
      const url = request.nextUrl.clone();
      url.pathname = '/rdv';
      return NextResponse.rewrite(url);  // Rewrite au lieu de redirect
    }
    
    // PROTECTION AUTH: Rediriger vers dashboard si authentifié et sur page login
    const isAuthPage = pathname.startsWith('/auth');
    if (isAuthPage) {
      const user = await getUserFromToken(request);
      if (user) {
        // User authentifié sur page login → redirect dashboard
        const url = request.nextUrl.clone();
        url.pathname = '/dashboard';
        return NextResponse.redirect(url);
      }
    }
    
    // NOTE: Vérification licence désactivée dans middleware (Prisma incompatible Edge Runtime)
    // La vérification se fait côté client dans les composants admin
    // const isAdminPage = pathname.startsWith('/admin') && !pathname.startsWith('/admin/license');
    // if (isAdminPage && !isAuthPage) {
    //   const licenseInfo = await getLicenseInfo();
    //   if (licenseInfo.status === 'expired') {
    //     return NextResponse.redirect('/admin/license/blocked');
    //   }
    // }
    
    return NextResponse.next();
  }
  
  // 1. Vérifier si c'est une API publique (laisser passer sans vérification)
  const isPublicApi = publicApiRoutes.some(route => pathname.startsWith(route));
  if (isPublicApi) {
    return NextResponse.next();
  }
  
  // 2. Vérifier les patterns publics (PDFs, emails, etc.)
  const matchesPublicPattern = publicPatterns.some(pattern => pattern.test(pathname));
  if (matchesPublicPattern) {
    return NextResponse.next();
  }
  
  // 3. Vérifier si c'est une API protégée
  const isProtectedApi = protectedApiRoutes.some(route => pathname.startsWith(route));
  const isAdminApi = pathname.startsWith('/api/admin');
  
  if (!isProtectedApi) {
    // Ni publique, ni protégée explicitement -> laisser passer par défaut
    return NextResponse.next();
  }

  // C'est une API protégée, vérifier l'authentification JWT
  const user = await getUserFromToken(request);
  logger.info('[Proxy] getUserFromToken result', { result: user ? `User ${user.userId}` : 'null' });

  // Pour toutes les APIs protégées en mode Electron local, créer un user admin fictif
  // Pattern: Mode Electron = pas de JWT, mais besoin d'accès aux APIs internes
  const needsElectronAuth = 
    isAdminApi ||
    pathname.startsWith('/api/account') ||
    pathname.startsWith('/api/finance') ||
    pathname.startsWith('/api/workshop') ||
    pathname.startsWith('/api/workorders') ||
    pathname.startsWith('/api/catalog') ||
    pathname.startsWith('/api/suppliers') ||
    pathname.startsWith('/api/booking') ||
    pathname.startsWith('/api/cash-register') ||
    pathname.startsWith('/api/stats') ||
    pathname.startsWith('/api/service-rates') ||
    pathname.startsWith('/api/metrics') ||
    pathname.startsWith('/api/settings') ||
    pathname.startsWith('/api/communications') ||
    pathname.startsWith('/api/bikes');  // Ajout bikes pour vente vélos
  
  if (!user && needsElectronAuth) {
    // Mode Electron local: on crée un user fictif admin
    // L'API fera le vrai lookup du premier user dans la DB
    // IMPORTANT: Setter les headers sur la REQUEST, pas la RESPONSE
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-user-id', 'electron-local');
    requestHeaders.set('x-user-role', 'admin');
    
    return NextResponse.next({
      request: {
        headers: requestHeaders
      }
    });
  }

  if (!user) {
    return NextResponse.json(
      { error: 'unauthorized', message: 'Valid JWT token required' },
      { status: 401 }
    );
  }

  // Pour les routes admin API, vérifier le rôle (case-insensitive)
  if (isAdminApi && user.role.toLowerCase() !== 'admin') {
    return NextResponse.json(
      { error: 'forbidden', message: 'Admin role required' },
      { status: 403 }
    );
  }

  // Passer userId et role dans headers pour les routes API
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-user-id', user.userId);
  requestHeaders.set('x-user-role', user.role);
  
  return NextResponse.next({
    request: {
      headers: requestHeaders
    }
  });
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
