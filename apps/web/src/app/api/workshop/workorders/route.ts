import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/db";
import { CreateWorkOrderSchema, formatZodError } from "@/lib/validation";
import { rateLimit } from "@/lib/security";

export const dynamic = "force-dynamic";

function getUserId(req: Request): string | null {
  const uid = req.headers.get("x-user-id");
  return uid && uid.trim() ? uid : null;
}

function getClientIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0] || 
         req.headers.get("x-real-ip") || 
         "unknown";
}

export async function GET(req: Request) {
  const prisma = await getPrisma();
  if (!prisma) return NextResponse.json({ error: "prisma_unavailable" }, { status: 501 });
  
  // 🔒 SÉCURITÉ: Vérifier l'authentification
  const userId = getUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  
  // Extraire les paramètres de recherche
  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status');
  const q = searchParams.get('q');
  
  // Construire le filtre
  const where: any = {};
  if (status) {
    where.status = status;
  }
  if (q && q.trim()) {
    // Recherche dans customer email/nom ou bike brand/model
    where.OR = [
      { customer: { email: { contains: q, mode: 'insensitive' } } },
      { customer: { firstName: { contains: q, mode: 'insensitive' } } },
      { customer: { lastName: { contains: q, mode: 'insensitive' } } },
      { bike: { brand: { contains: q, mode: 'insensitive' } } },
      { bike: { model: { contains: q, mode: 'insensitive' } } },
    ];
  }
  
  const items = await prisma.workOrder.findMany({ 
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      customer: true,
      bike: true,
    },
  });
  return NextResponse.json(items, { status: 200 });
}

export async function POST(req: Request) {
  const prisma = await getPrisma();
  if (!prisma) return NextResponse.json({ error: "prisma_unavailable" }, { status: 501 });
  
  // 🔒 RATE LIMITING: Limiter les créations de tickets
  const ip = getClientIp(req);
  const rl = await rateLimit("workorder:create", ip, 20, 60); // 20 par minute
  if (!rl.allowed) {
    return NextResponse.json({ 
      error: "too_many_requests",
      retryAfter: rl.retryAfter 
    }, { status: 429 });
  }
  
  const userId = getUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  
  try {
    const body = await req.json();
    
    // 🔒 VALIDATION: Valider les données d'entrée
    const validated = CreateWorkOrderSchema.parse(body);
    
    const data: any = {
      status: validated.status || 'created',
      customerId: validated.customerId || null,
      bikeId: validated.bikeId || null,
      type: validated.type || null,
      dueAt: validated.dueAt ? new Date(validated.dueAt) : null,
    };
    
    const wo = await prisma.workOrder.create({ data });
    return NextResponse.json(wo, { status: 201 });
  } catch (error: any) {
    // Erreur de validation Zod
    if (error.name === 'ZodError') {
      return NextResponse.json({ 
        error: "invalid_input", 
        details: formatZodError(error) 
      }, { status: 400 });
    }
    throw error;
  }
}
