import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // Removed getPrisma() - using direct import

  const body = await req.json();
  const { type, amount, description, invoiceId } = body;

  try {
    const updated = await prisma.cashRegister.update({
      where: { id: id },
      data: {
        type,
        amount: parseFloat(amount),
        description: description || null,
        invoiceId: invoiceId || null,
      },
      include: {
        Invoice: { select: { number: true, totalTTC: true } },
        User: { select: { name: true, email: true } }
      }
    });
    return NextResponse.json(updated);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // Removed getPrisma() - using direct import

  try {
    await prisma.cashRegister.delete({
      where: { id: id }
    });
    return NextResponse.json({ success: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
