import { PrismaClient } from "@prisma/client";
import path from "path";
import { logger } from "./logger";

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
    logger.info('[Prisma] ✅ Converted relative → absolute', { relativePath, absolutePath });
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
      logger.error('[Prisma] Failed to connect to database:', err);
      logger.error('[Prisma] DATABASE_URL:', process.env.DATABASE_URL ? 'SET' : 'NOT SET');
    });
  }
} catch (error) {
  logger.error('[Prisma] Failed to initialize Prisma Client:', error);
  logger.error('[Prisma] DATABASE_URL:', process.env.DATABASE_URL ? 'SET' : 'NOT SET');
  prismaInstance = null;
}

export const prisma = prismaInstance as PrismaClient;

export default prisma;
