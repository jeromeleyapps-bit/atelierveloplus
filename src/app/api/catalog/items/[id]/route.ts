import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handleApiError } from "@/lib/api-error";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {  const { id } = await params;

  // Removed getPrisma() - using direct import
  const row = await prisma.catalogItem.findUnique({ where: { id: id } });
  if (!row) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json(row, { status: 200 });
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // Removed getPrisma() - using direct import
  try {
    const body = await req.json();
    const updated = await prisma.catalogItem.update({ where: { id }, data: body });
    return NextResponse.json(updated, { status: 200 });
  } catch (error) {
    return handleApiError(error, 'catalog/items/PUT');
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // Removed getPrisma() - using direct import
  try {
    // Integrity checks: deny deletion if referenced by invoice lines or stock movements
    const [invLinesCount, movementsCount] = await Promise.all([
      prisma.invoiceLine.count({ where: { partId: id } }),
      prisma.stockMovement.count({ where: { itemId: id } }),
    ]);
    if (invLinesCount > 0 || movementsCount > 0) {
      return NextResponse.json({
        error: 'conflict',
        message: 'Impossible de supprimer: la pièce est référencée par des documents',
        references: { invoiceLines: invLinesCount, stockMovements: movementsCount }
      }, { status: 409 });
    }

    // Safe to delete: remove supplier links and offers, then the item
    await prisma.$transaction([
      prisma.supplierItem.deleteMany({ where: { catalogItemId: id } }),
      prisma.supplierOffer.deleteMany({ where: { catalogItemId: id } }),
      prisma.catalogItem.delete({ where: { id: id } }),
    ]);

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    return handleApiError(error, 'catalog/items/DELETE');
  }
}
