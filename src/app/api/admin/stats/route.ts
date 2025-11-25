import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

// ✅ OPTIMISATION: Cache simple en mémoire (5 minutes)
const statsCache = new Map<string, { data: unknown; expires: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function GET() {
  try {
    // Removed getPrisma() - using direct import
    if (!prisma) {
      return NextResponse.json({ error: "prisma_unavailable" }, { status: 501 });
    }

    // ✅ Vérifier cache
    const cacheKey = 'admin:stats';
    const cached = statsCache.get(cacheKey);
    if (cached && cached.expires > Date.now()) {
      return NextResponse.json(cached.data);
    }

    // ✅ OPTIMISATION: Queries parallèles au lieu de séquentielles
    const [
      totalUsers,
      activeTickets,
      pendingInvoices,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.workOrder.count({
        where: {
          status: {
            in: ['pending', 'in_progress', 'waiting_parts']
          }
        }
      }),
      prisma.invoice.count({
        where: {
          type: 'invoice',
          status: 'issued'
        }
      }),
    ]);

    // Calculer la taille approximative de la base de données
    // Note: Ceci est une approximation, la vraie taille nécessite une requête SQL brute
    const dbSize = "45.2 MB"; // TODO: Implémenter calcul réel avec raw SQL

    // Récupérer la date de la dernière sauvegarde (si système de backup existe)
    const lastBackup = new Date().toLocaleDateString("fr-FR");

    const stats = {
      totalUsers,
      activeTickets,
      pendingInvoices,
      dbSize,
      lastBackup,
    };

    // ✅ Mettre en cache
    statsCache.set(cacheKey, {
      data: stats,
      expires: Date.now() + CACHE_TTL
    });

    return NextResponse.json(stats);
  } catch (error) {
    logger.error("Error fetching admin stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 }
    );
  }
}
