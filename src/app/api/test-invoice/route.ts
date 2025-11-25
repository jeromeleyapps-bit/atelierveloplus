import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Removed getPrisma() - using direct import

    const items = await prisma.invoice.findMany({ 
      orderBy: [{ issueDate: "desc" }, { createdAt: "desc" }] 
    });
    
    return NextResponse.json({ success: true, count: items.length, items });
  } catch (error) {
    const errorLog: {
      message?: string;
      code?: string;
      meta?: unknown;
      stack?: string;
      fullError: unknown;
    } = {
      message: error instanceof Error ? error.message : String(error),
      code: error instanceof Prisma.PrismaClientKnownRequestError ? error.code : undefined,
      meta: error instanceof Prisma.PrismaClientKnownRequestError ? error.meta : undefined,
      stack: error instanceof Error ? error.stack : undefined,
      fullError: JSON.parse(JSON.stringify(error, Object.getOwnPropertyNames(error)))
    };
    
    const logPath = path.join(process.cwd(), 'error-log.json');
    fs.writeFileSync(logPath, JSON.stringify(errorLog, null, 2));
    
    return NextResponse.json({ 
      error: errorLog.message, 
      code: errorLog.code, 
      meta: errorLog.meta,
      logWritten: logPath 
    }, { status: 500 });
  }
}
