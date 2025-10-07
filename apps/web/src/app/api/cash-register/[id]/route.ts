import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const prisma = await getPrisma();
  if (!prisma) return NextResponse.json({ error: "prisma_unavailable" }, { status: 501 });

  const body = await req.json();
  const { type, amount, description, invoiceId } = body;

  try {
    const updated = await prisma.cashRegister.update({
      where: { id: params.id },
      data: {
        type,
        amount: parseFloat(amount),
        description: description || null,
        invoiceId: invoiceId || null,
      },
      include: {
        invoice: { select: { number: true, totalTTC: true } },
        user: { select: { name: true, email: true } }
      }
    });
    return NextResponse.json(updated);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const prisma = await getPrisma();
  if (!prisma) return NextResponse.json({ error: "prisma_unavailable" }, { status: 501 });

  try {
    await prisma.cashRegister.delete({
      where: { id: params.id }
    });
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
