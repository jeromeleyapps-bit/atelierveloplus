import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const prisma = await getPrisma();
  if (!prisma) return NextResponse.json({ error: "prisma_unavailable" }, { status: 501 });
  const sup = await prisma.supplier.findUnique({ where: { id: params.id } });
  if (!sup) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  await prisma.$transaction([
    prisma.supplierItem.deleteMany({ where: { supplierId: params.id } }),
    prisma.supplierCredential.deleteMany({ where: { supplierId: params.id } }),
    prisma.supplier.delete({ where: { id: params.id } }),
  ]);
  return NextResponse.json({ ok: true }, { status: 200 });
}
