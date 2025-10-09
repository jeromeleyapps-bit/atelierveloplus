import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getUserFromToken } from '@/lib/jwt';

// Routes publiques (accessibles sans authentification)
const publicRoutes = [
  '/',
  '/auth/login',
  '/auth/register',
  '/rdv',  // Page RDV clients (standalone)
  '/booking-local',  // Ancienne page (à supprimer plus tard)
];

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
const adminRoutes = [
  '/admin',
];

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
  '/api/metrics',
  '/api/account',
  '/api/settings',
  '/api/communications',
  '/api/simplybook',
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // GARDE-FOU: Ignorer explicitement tout ce qui n'est pas /api/
  if (!pathname.startsWith('/api/')) {
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
  
  if (!isProtectedApi) {
    // Ni publique, ni protégée explicitement -> laisser passer par défaut
    return NextResponse.next();
  }

  // C'est une API protégée, vérifier l'authentification JWT
  const user = await getUserFromToken(request);

  if (!user) {
    return NextResponse.json(
      { error: 'unauthorized', message: 'Valid JWT token required' },
      { status: 401 }
    );
  }

  // Pour les routes admin API, vérifier le rôle
  const isAdminApi = pathname.startsWith('/api/admin');
  if (isAdminApi && user.role !== 'admin') {
    return NextResponse.json(
      { error: 'forbidden', message: 'Admin role required' },
      { status: 403 }
    );
  }

  // Passer userId et role dans headers pour les routes API
  const response = NextResponse.next();
  response.headers.set('x-user-id', user.userId);
  response.headers.set('x-user-role', user.role);
  
  return response;
}

export const config = {
  matcher: [
    /*
     * Matcher simplifié : on ne vérifie QUE les routes /api/*
     * Tout le reste (pages, ressources, _next, etc.) est ignoré
     */
    '/api/:path*',
  ],
};
