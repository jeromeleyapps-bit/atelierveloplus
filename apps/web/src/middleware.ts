import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getPrisma } from '@/lib/db';

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
];

// Patterns de routes publiques (regex)
const publicPatterns = [
  /^\/api\/finance\/invoices\/[^/]+\/pdf$/,     // PDFs factures
  /^\/api\/finance\/quotes\/[^/]+\/pdf$/,       // PDFs devis
  /^\/api\/finance\/credits\/[^/]+\/pdf$/,      // PDFs avoirs
  /^\/api\/finance\/invoices\/[^/]+\/email$/,   // Envoi email facture
  /^\/api\/finance\/quotes\/[^/]+\/email$/,     // Envoi email devis
  /^\/api\/finance\/credits\/[^/]+\/email$/,    // Envoi email avoir
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

  // 0. Ignorer les ressources Next.js internes
  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/static/') ||
    pathname.includes('webpack-hmr') ||
    pathname.endsWith('.ico') ||
    pathname.endsWith('.png') ||
    pathname.endsWith('.jpg') ||
    pathname.endsWith('.svg')
  ) {
    return NextResponse.next();
  }

  // 1. Ignorer les routes UI publiques
  if (publicRoutes.includes(pathname)) {
    return NextResponse.next();
  }

  // 2. Ignorer les routes API publiques explicites
  if (publicApiRoutes.some(route => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // 3. Ignorer les routes publiques avec patterns (PDFs, emails)
  if (publicPatterns.some(pattern => pattern.test(pathname))) {
    return NextResponse.next();
  }

  // 4. Vérifier si c'est une API protégée
  const isProtectedApi = protectedApiRoutes.some(route => pathname.startsWith(route));
  
  if (isProtectedApi) {
    // Vérifier la présence du header x-user-id
    const userId = request.headers.get('x-user-id');

    if (!userId) {
      return NextResponse.json(
        { error: 'unauthorized', message: 'Authentication required' },
        { status: 401 }
      );
    }

    // Pour les routes admin, vérifier le rôle en base
    const isAdminApi = pathname.startsWith('/api/admin');
    if (isAdminApi) {
      try {
        const prisma = await getPrisma();
        if (prisma) {
          const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { role: true, active: true }
          });

          if (!user || !user.active || user.role !== 'admin') {
            return NextResponse.json(
              { error: 'forbidden', message: 'Admin role required' },
              { status: 403 }
            );
          }
        }
      } catch (error) {
        console.error('Error checking admin role:', error);
        return NextResponse.json(
          { error: 'internal_error', message: 'Failed to verify permissions' },
          { status: 500 }
        );
      }
    }
  }

  // 5. Pour les routes UI, RequireAuth (client-side) gère la protection
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
};
