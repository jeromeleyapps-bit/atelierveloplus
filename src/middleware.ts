import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getUserFromToken } from '@/lib/jwt';
import { logger } from '@/lib/logger';

// Routes API publiques (pas d'authentification requise).
//
// ⚠️ Cette liste est la surface exposée à Internet dès qu'un atelier active la prise de
// rendez-vous : le tunnel Cloudflare publie l'origine entière, pas seulement /rdv.
// N'y ajouter QUE ce dont la page publique /rdv a besoin, et jamais rien qui écrive
// ou qui renvoie des données personnelles.
//
// Audit août 2026 — retirés de cette liste :
//   /api/customers                            renvoyait nom, email, téléphone et adresse
//                                             de 200 clients sans authentification (RGPD).
//                                             Utilisée uniquement par l'interface interne,
//                                             qui passe par l'identité locale Electron.
//   /api/catalog/import/supplier-csv-stream   écriture : import du catalogue fournisseur
//   /api/catalog/scan-bulk                    écriture : import massif au catalogue
//   /api/admin/service-rates/import           écriture : écrasement des tarifs
const publicApiRoutes = [
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/logout',
  // Validation du jeton de session : la route juge elle-même, strictement, sans repli
  // Electron. Elle doit donc contourner l'injection d'identité locale du middleware,
  // sinon un jeton périmé passerait pour valide et ne serait jamais purgé.
  '/api/auth/me',
  '/api/calendar/availability',  // Disponibilités pour prise de RDV clients
  '/api/calendar/bookings',       // Réservations clients
  '/api/calendar/events',         // Événements calendrier (lecture seule)
  '/api/calendar/blocks',         // Blocs calendrier (lecture seule)
  '/api/catalog/barcode',         // Lookup code-barres uniquement (lecture seule)
];

// Patterns de routes publiques (regex)
// Audit août 2026 — cette liste est vidée. Elle contenait :
//
//   PDF factures / devis / avoirs — ouverts sans authentification pour qui connaît
//     l'identifiant du document. Les identifiants sont des cuid difficiles à deviner,
//     mais c'était la seule protection. Vérifié : les documents partent en pièce jointe
//     des emails, jamais en lien — aucun usage légitime ne dépend de cet accès public.
//
//   /api/catalog/items et /api/catalog/categories — le commentaire d'origine indiquait
//     « page protégée côté client », ce qui ne protège pas l'API. Ces routes renvoient
//     tous les champs du catalogue, dont purchasePriceHT, marginCoeff et supplierName :
//     les prix d'achat, les marges et les fournisseurs de l'atelier.
//
// Tous les appelants sont internes à l'application et passent par la session Electron,
// y compris les ouvertures de PDF en nouvelle fenêtre : aucune partition de session
// n'est déclarée, l'en-tête de session est donc injecté sur ces navigations aussi.
const publicPatterns: RegExp[] = [];

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
  '/api/user',            // profil utilisateur (wizard d'onboarding)
  '/api/customers',       // données personnelles clients (RGPD)
  '/api/bikes',
  '/api/tunnel',
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
    
    // Note: vérification licence faite côté client (composants /admin) — Prisma incompatible Edge Runtime.

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

  // 3. REFUS PAR DÉFAUT (audit août 2026).
  //
  // Auparavant, une route ne figurant dans aucune des deux listes était « laissée passer
  // par défaut » : 12 routes se retrouvaient ainsi sans aucun contrôle, dont l'export FEC,
  // les devis et la configuration Stripe. Oublier d'inscrire une nouvelle route dans la
  // liste des routes protégées suffisait à l'ouvrir — c'est exactement ce qui est arrivé
  // à /api/user/profile et à /api/customers.
  //
  // Désormais : tout ce qui n'est pas explicitement public exige une identité. Une route
  // oubliée est fermée, jamais ouverte. La liste `protectedApiRoutes` ci-dessus ne sert
  // plus qu'à documenter les grands domaines ; elle n'ouvre ni ne ferme plus rien.
  const isAdminApi = pathname.startsWith('/api/admin');

  const user = await getUserFromToken(request);
  logger.info('[Proxy] getUserFromToken result', { result: user ? `User ${user.userId}` : 'null' });

  if (!user) {
    // Pas de JWT valide : seule une requête venant réellement du process Electron peut
    // continuer. Elle doit porter le jeton de session que seul le process principal
    // connaît. À défaut, la requête est refusée — y compris si elle arrive par le tunnel
    // de prise de rendez-vous.
    // En dev pur (npm run dev sans Electron), ELECTRON_AUTH_TOKEN n'est pas défini :
    // on tolère l'auto-injection pour ne pas casser le workflow.
    const expectedToken = process.env.ELECTRON_AUTH_TOKEN;
    const providedToken = request.headers.get('x-electron-auth-token');
    const isProduction = process.env.NODE_ENV === 'production';
    if (expectedToken && providedToken !== expectedToken) {
      return NextResponse.json(
        { error: 'unauthorized', message: 'Invalid Electron session token' },
        { status: 401 }
      );
    }
    if (!expectedToken && isProduction) {
      return NextResponse.json(
        { error: 'unauthorized', message: 'Electron session token required in production' },
        { status: 401 }
      );
    }

    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-user-id', 'electron-local');
    requestHeaders.set('x-user-role', 'admin');

    return NextResponse.next({
      request: {
        headers: requestHeaders
      }
    });
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
