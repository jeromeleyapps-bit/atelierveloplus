import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // Removed getPrisma() - using direct import
  const sup = await prisma.supplier.findUnique({ where: { id } });
  if (!sup) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  await prisma.$transaction([
    prisma.supplierItem.deleteMany({ where: { supplierId: id } }),
    prisma.supplierCredential.deleteMany({ where: { supplierId: id } }),
    prisma.supplier.delete({ where: { id } }),
  ]);
  return NextResponse.json({ ok: true }, { status: 200 });
}
