import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  // Removed getPrisma() - using direct import
  
  const entries = await prisma.cashRegister.findMany({
    orderBy: { createdAt: 'desc' },
    include: { 
      Invoice: { select: { number: true, totalTTC: true } },
      User: { select: { name: true, email: true } }
    }
  });
  
  return NextResponse.json(entries);
}

export async function POST(req: Request) {
  // Removed getPrisma() - using direct import

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
      Invoice: { select: { number: true, totalTTC: true } },
      User: { select: { name: true, email: true } }
    }
  });

  return NextResponse.json(entry, { status: 201 });
}