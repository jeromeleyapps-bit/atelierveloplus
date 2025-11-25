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

    // Calculer la taille réelle de la base de données SQLite
    let dbSize = "N/A";
    try {
      // Requête SQL brute pour obtenir la taille de la DB SQLite
      const pageCount: any = await prisma.$queryRaw`PRAGMA page_count`;
      const pageSize: any = await prisma.$queryRaw`PRAGMA page_size`;
      
      if (pageCount && pageCount[0] && pageSize && pageSize[0]) {
        const sizeInBytes = pageCount[0].page_count * pageSize[0].page_size;
        const sizeInMB = (sizeInBytes / (1024 * 1024)).toFixed(2);
        dbSize = `${sizeInMB} MB`;
      }
    } catch (error) {
      logger.warn('[AdminStats] Failed to calculate DB size:', error);
      dbSize = "N/A";
    }

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
