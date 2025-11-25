import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/api-helpers";
import { logger } from '@/lib/logger';

export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // Removed getPrisma() - using direct import
  
  // 🔒 SÉCURITÉ: Vérifier l'authentification
  const userId = getUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  
  try {
    // Essayer de trouver d'abord
    let row = await prisma.workOrder.findUnique({
      where: { id: id },
      include: {
        Customer: true,
        CustomerBike: true,
      },
    });
    
    // Si n'existe pas, créer
    if (!row) {
      row = await prisma.workOrder.create({
        data: { id: id, status: 'created' },
        include: {
          Customer: true,
          CustomerBike: true,
        },
      });
    }
    
    return NextResponse.json(row, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur inconnue';
    logger.error('[workorder/id] Error:', message);
    return NextResponse.json({ 
      error: "workorder_fetch_failed", 
      detail: message 
    }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // Removed getPrisma() - using direct import
  
  const userId = getUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  
  try {
    await prisma.workOrder.delete({
      where: { id: id },
    });
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur lors de la suppression';
    logger.error('[workorder/delete] Error:', message);
    return NextResponse.json({ 
      error: "workorder_delete_failed", 
      detail: error.message 
    }, { status: 500 });
  }
}
