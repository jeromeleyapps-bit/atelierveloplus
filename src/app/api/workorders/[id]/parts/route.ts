import { NextResponse } from "next/server";


export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: _id } = await params;
  // Ancien système désactivé - remplacé par WorkOrderLine
  // Retourne un tableau vide pour éviter les erreurs 500
  return NextResponse.json([], { status: 200 });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: _id } = await params;
  // Ancien système désactivé - utiliser /api/workorders/[id]/lines à la place
  return NextResponse.json({ 
    error: 'deprecated', 
    message: 'Utilisez /api/workorders/[id]/lines pour le nouveau système'
  }, { status: 410 }); // 410 Gone
}
