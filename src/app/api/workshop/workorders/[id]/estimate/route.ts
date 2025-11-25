import { NextResponse } from 'next/server';
import { prisma } from "@/lib/prisma";
import { handleApiError } from '@/lib/error-handler';

export const dynamic = "force-dynamic";

/**
 * Fonction partagée pour mettre à jour estimatedMinutes et hourlyRate
 */
async function updateEstimate(req: Request, params: Promise<{ id: string }>) {
  const { id } = await params;
  // Removed getPrisma() - using direct import

  try {
    const body = await req.json();
    const { estimatedMinutes, hourlyRate } = body;

    const updated = await prisma.workOrder.update({
      where: { id: id },
      data: {
        estimatedMinutes: estimatedMinutes !== undefined ? Number(estimatedMinutes) : undefined,
        hourlyRate: hourlyRate !== undefined ? Number(hourlyRate) : undefined,
      },
    });

    return NextResponse.json(updated, { status: 200 });
  } catch (e: unknown) {
    return handleApiError(e, 'ESTIMATE_UPDATE');
  }
}

/**
 * POST - Rétro-compatibilité (ancien code)
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return updateEstimate(req, params);
}

/**
 * PATCH - Méthode sémantiquement correcte pour mise à jour partielle
 */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return updateEstimate(req, params);
}
