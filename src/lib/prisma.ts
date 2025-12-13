import { PrismaClient } from "@prisma/client";
import path from "path";
import { logger } from "./logger";

export async function ensureSqliteBikeMileageColumn(prisma: PrismaClient, datasourceUrl?: string) {
  try {
    const url = datasourceUrl || process.env.DATABASE_URL || '';
    if (!url.startsWith('file:')) return;

    const rows = await prisma.$queryRawUnsafe<Array<{ name: string }>>("PRAGMA table_info('Bike')");
    const hasMileage = Array.isArray(rows) && rows.some(r => r?.name === 'mileage');
    if (hasMileage) return;

    logger.warn('[Prisma] Missing column Bike.mileage detected, applying SQLite patch (ALTER TABLE)');
    await prisma.$executeRawUnsafe('ALTER TABLE "Bike" ADD COLUMN "mileage" INTEGER');
    logger.info('[Prisma] ✅ SQLite patch applied: Bike.mileage added');
  } catch (e) {
    logger.warn('[Prisma] SQLite patch failed (Bike.mileage)', e);
  }
}

// Fix Prisma ASAR: En production Electron, pointer vers extraResources
// SOLUTION FORUMS 2024: Basée sur GitHub discussions #10562, #21027
if (typeof process !== 'undefined' && process.env.NODE_ENV === 'production') {
  try {
    // Vérifier si on est en Electron (process.resourcesPath existe)
    const resourcesPath = (process as NodeJS.Process & { resourcesPath?: string }).resourcesPath;
    if (resourcesPath) {
      // SOLUTION Stack Overflow: Rediriger vers resources/.prisma/
      const prismaClientPath = path.join(resourcesPath, '.prisma');
      
      // Nécessaire pour Electron ASAR, require synchrone requis
      if (require && require.resolve) {
        // Module natif Node.js, pas d'alternative ES6
        const Module = require('module');
        // Module._resolveFilename non typé dans @types/node
        const originalResolveFilename = Module._resolveFilename;
        // Module._resolveFilename signature native non typée
        Module._resolveFilename = function(request: string, parent: any, isMain: boolean) {
          if (request === '@prisma/client' || request === '.prisma/client') {
            // Rediriger vers resources/node_modules/@prisma/client
            return path.join(resourcesPath, 'node_modules', '@prisma', 'client');
          }
          return originalResolveFilename.call(this, request, parent, isMain);
        };
      }
    }
  } catch (e) {
    // Pas en Electron ou erreur, continuer normalement
    logger.warn('[Prisma] Could not setup extraResources path:', e);
  }
}

/**
 * Resolve DATABASE_URL to absolute path for SQLite
 * CRITICAL: Prisma doesn't resolve relative paths correctly in all contexts
 */
function getDatabaseUrl(): string | undefined {
  const url = process.env.DATABASE_URL;
  if (!url) return undefined;
  
  // Only process SQLite file: URLs
  if (url.startsWith('file:./') || url.startsWith('file:../')) {
    const relativePath = url.replace('file:', '');
    const absolutePath = path.resolve(process.cwd(), relativePath);
    const resolvedUrl = `file:${absolutePath}`;
    logger.info('[Prisma] ✅ Converted relative → absolute', { value: { relativePath, absolutePath } });
    return resolvedUrl;
  }
  
  return url;
}

// Prevent hot-reload from creating multiple instances in Next.js dev
const globalForPrisma = global as unknown as { prisma?: PrismaClient };

let prismaInstance: PrismaClient | null = null;

try {
  const datasourceUrl = getDatabaseUrl();
  prismaInstance = globalForPrisma.prisma ?? new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query','error','warn'] : ['error'],
    datasources: datasourceUrl ? {
      db: { url: datasourceUrl }
    } : undefined
  });

  if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prismaInstance;
  
  // Test connection on initialization
  if (process.env.NODE_ENV === 'development') {
    prismaInstance.$connect().catch((err) => {
      const errorMessage = err instanceof Error ? err.message : String(err);
      logger.error('[Prisma] Failed to connect to database', { error: errorMessage });
      logger.error('[Prisma] DATABASE_URL', { status: process.env.DATABASE_URL ? 'SET' : 'NOT SET' });
    });
  }

  // SQLite production/dev: patch compatibility for older DBs missing columns
  void ensureSqliteBikeMileageColumn(prismaInstance, datasourceUrl);
} catch (error) {
  const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('[Prisma] Failed to initialize Prisma Client:', { error: errorMessage });
  logger.error('[Prisma] DATABASE_URL', { status: process.env.DATABASE_URL ? 'SET' : 'NOT SET' });
  prismaInstance = null;
}

export const prisma = prismaInstance as PrismaClient;

export default prisma;
