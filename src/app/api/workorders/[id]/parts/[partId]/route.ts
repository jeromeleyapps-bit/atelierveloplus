import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from '@/lib/logger';

export const dynamic = "force-dynamic";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string; partId: string }> }) {
  const { id, partId } = await params;
  // Removed getPrisma() - using direct import
  const body = await req.json().catch(() => ({}));
  try {
    const data: unknown = {};
    for (const k of ["catalogItemId","description","quantity","priceHT","notes"]) {
      if (k in body) data[k] = body[k];
    }
    
    // Mettre à jour la ligne de commande de type 'part'
    const saved = await prisma.workOrderLine.update({ 
      where: { 
        id: partId,
        workOrderId: id,
        type: 'part'
      }, 
      data 
    });
    
    return NextResponse.json(saved, { status: 200 });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    logger.error('Erreur lors de la mise à jour de la pièce', { error: message });
    return NextResponse.json({ error: 'part_update_failed', detail: message }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string; partId: string }> }) {
  const { id, partId } = await params;
  // Removed getPrisma() - using direct import
  try {
    // Supprimer la ligne de commande de type 'part'
    await prisma.workOrderLine.delete({ 
      where: { 
        id: partId,
        workOrderId: id,
        type: 'part'
      } 
    });
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    logger.error('Erreur lors de la suppression de la pièce', { error: message });
    return NextResponse.json({ error: 'part_delete_failed', detail: message }, { status: 500 });
  }
}
