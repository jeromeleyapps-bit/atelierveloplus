/**
 * GET /api/communications
 * List communications with filters
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { getUserIdOrFirst } from "@/lib/api-helpers";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  // Removed getPrisma() - using direct import
  // ✅ FIX: Utiliser getUserIdOrFirst pour mode Electron (pas de JWT requis)
  // Sinon déconnexion automatique si pas de token JWT valide
  const userId = await getUserIdOrFirst(req);
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const customerId = searchParams.get('customerId');
    const type = searchParams.get('type');
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50');

    const where: Prisma.CommunicationWhereInput = {};
    if (customerId) where.customerId = customerId;
    if (type) where.type = type;
    if (status) where.status = status;

    const communications = await prisma.communication.findMany({
      where,
      include: {
        Customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true
          }
        },
        WorkOrder: {
          select: {
            id: true,
            status: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: limit
    });

    return NextResponse.json(communications, { status: 200 });

  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error('List communications error', { error: message });
    return NextResponse.json({ 
      error: "list_failed", 
      detail: message
    }, { status: 500 });
  }
}
