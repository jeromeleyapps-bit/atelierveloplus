import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/db";

export const dynamic = "force-dynamic";

function getUserId(req: Request): string | null {
  const uid = req.headers.get("x-user-id");
  return uid && uid.trim() ? uid : null;
}

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const prisma = await getPrisma();
  if (!prisma) return NextResponse.json({ error: "prisma_unavailable" }, { status: 501 });
  
  // 🔒 SÉCURITÉ: Vérifier l'authentification
  const userId = getUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  
  try {
    // Essayer de trouver d'abord
    let row = await prisma.workOrder.findUnique({
      where: { id: params.id },
      include: {
        customer: true,
        bike: true,
      },
    });
    
    // Si n'existe pas, créer
    if (!row) {
      row = await prisma.workOrder.create({
        data: { id: params.id, status: 'created' },
        include: {
          customer: true,
          bike: true,
        },
      });
    }
    
    return NextResponse.json(row, { status: 200 });
  } catch (error: any) {
    console.error('[workorder/id] Error:', error);
    return NextResponse.json({ 
      error: "workorder_fetch_failed", 
      detail: error.message 
    }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const prisma = await getPrisma();
  if (!prisma) return NextResponse.json({ error: "prisma_unavailable" }, { status: 501 });
  
  const userId = getUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  
  try {
    await prisma.workOrder.delete({
      where: { id: params.id },
    });
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error: any) {
    console.error('[workorder/delete] Error:', error);
    return NextResponse.json({ 
      error: "workorder_delete_failed", 
      detail: error.message 
    }, { status: 500 });
  }
}
