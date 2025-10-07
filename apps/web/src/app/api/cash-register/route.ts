import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const prisma = await getPrisma();
  if (!prisma) return NextResponse.json({ error: "prisma_unavailable" }, { status: 501 });
  
  const entries = await prisma.cashRegister.findMany({
    orderBy: { createdAt: 'desc' },
    include: { 
      invoice: { select: { number: true, totalTTC: true } },
      user: { select: { name: true, email: true } }
    }
  });
  
  return NextResponse.json(entries);
}

export async function POST(req: Request) {
  const prisma = await getPrisma();
  if (!prisma) return NextResponse.json({ error: "prisma_unavailable" }, { status: 501 });

  // Pour l'instant, utilise le premier utilisateur
  const user = await prisma.user.findFirst();
  if (!user) return NextResponse.json({ error: "no_user_found" }, { status: 404 });

  const body = await req.json();
  const { type, amount, description, invoiceId } = body;

  if (!type || !amount) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }

  const entry = await prisma.cashRegister.create({
    data: {
      type,
      amount: parseFloat(amount),
      description: description || null,
      invoiceId: invoiceId || null,
      userId: user.id
    },
    include: {
      invoice: { select: { number: true, totalTTC: true } },
      user: { select: { name: true, email: true } }
    }
  });

  return NextResponse.json(entry, { status: 201 });
}