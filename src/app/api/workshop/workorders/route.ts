import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { CreateWorkOrderSchema, formatZodError } from "@/lib/validation";
import { rateLimit } from "@/lib/security";
import { logger } from '@/lib/logger';

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
  // Removed getPrisma() - using direct import
  
  // Vérifier que Prisma est disponible
  if (!prisma) {
    logger.error("[WorkOrders GET] Prisma not available");
    return NextResponse.json(
      { error: "database_unavailable", message: "Base de données non disponible" },
      { status: 503 }
    );
  }
  
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
  const where: Prisma.WorkOrderWhereInput = {};
  if (status) {
    where.status = status;
  }
  if (q && q.trim()) {
    // ✅ FIX: Utiliser les noms de relations Prisma corrects (PascalCase)
    // Recherche dans Customer email/nom ou CustomerBike brand/model
    where.OR = [
      { Customer: { email: { contains: q } } },
      { Customer: { firstName: { contains: q } } },
      { Customer: { lastName: { contains: q } } },
      { CustomerBike: { brand: { contains: q } } },
      { CustomerBike: { model: { contains: q } } },
    ];
  }
  
  const items = await prisma.workOrder.findMany({ 
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      Customer: true,
      CustomerBike: true,
    },
  });
  return NextResponse.json(items, { status: 200 });
}

export async function POST(req: Request) {
  // Removed getPrisma() - using direct import
  
  // 🔒 RATE LIMITING: Limiter les créations de tickets
  const ip = getClientIp(req);
  const rl = await rateLimit("workorder:create", ip);
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
    
    const data: unknown = {
      status: validated.status || 'created',
      customerId: validated.customerId || null,
      bikeId: validated.bikeId || null,
      type: validated.type || null,
      dueAt: validated.dueAt ? new Date(validated.dueAt) : null,
    };
    
    logger.info('[WorkOrder Create] Creating with data:', JSON.stringify(Object.assign({}, data, { userId })));
    
    const wo = await prisma.workOrder.create({ 
      data,
      // ✅ FIX: Inclure les relations dans la réponse pour vérifier le client
      include: {
        Customer: true,
        CustomerBike: true,
      },
    });
    
    logger.info('[WorkOrder Create] Created ticket:', { 
      id: wo.id, 
      customerId: wo.customerId,
      hasCustomer: !!wo.Customer,
      customerName: wo.Customer ? `${wo.Customer.firstName} ${wo.Customer.lastName}` : 'N/A',
      bikeId: wo.bikeId,
      hasBike: !!wo.CustomerBike,
    });
    
    return NextResponse.json(wo, { status: 201 });
  } catch (error) {
    // Erreur de validation Zod
    if (error && typeof error === 'object' && 'name' in error && error.name === 'ZodError') {
      return NextResponse.json({ 
        error: "invalid_input", 
        details: formatZodError(error) 
      }, { status: 400 });
    }
    throw error;
  }
}
