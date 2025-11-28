/**
 * Smart Database Connection Manager
 * 
 * Automatically selects the right database based on environment:
 * - Development (local): Supabase PostgreSQL
 * - Production Web (Vercel): Supabase PostgreSQL
 * - Desktop (Electron): SQLite local
 * - Mobile (React Native): SQLite local
 */

import type { PrismaClient } from '@prisma/client';
import path from 'path';
import { logger } from './logger';

let prismaSingleton: PrismaClient | null = null;

/**
 * Detect current environment
 */
function detectEnvironment(): 'development' | 'production-web' | 'desktop' | 'mobile' {
  // Check if running in Electron
  if (typeof process !== 'undefined' && process.versions && process.versions.electron) {
    return 'desktop';
  }
  
  // Check if running in React Native
  if (typeof navigator !== 'undefined' && navigator.product === 'ReactNative') {
    return 'mobile';
  }
  
  // Check if running on Vercel
  if (process.env.VERCEL) {
    return 'production-web';
  }
  
  // Default: development
  return 'development';
}

/**
 * Get database provider based on environment
 */
function getDatabaseProvider(): 'postgresql' | 'sqlite' {
  const env = detectEnvironment();
  
  // Force provider from env var if set
  if (process.env.DATABASE_PROVIDER === 'sqlite') {
    return 'sqlite';
  }
  if (process.env.DATABASE_PROVIDER === 'postgresql') {
    return 'postgresql';
  }
  
  // Check if DATABASE_URL is SQLite format
  const dbUrl = process.env.DATABASE_URL || '';
  if (dbUrl.startsWith('file:')) {
    return 'sqlite';
  }
  
  // Auto-detect
  switch (env) {
    case 'desktop':
    case 'mobile':
      return 'sqlite';
    case 'development':
      // Development: Use SQLite by default (Electron-compatible)
      return 'sqlite';
    case 'production-web':
    default:
      return 'postgresql';
  }
}

/**
 * Get database URL based on provider
 */
function getDatabaseUrl(): string | undefined {
  const provider = getDatabaseProvider();
  const url = process.env.DATABASE_URL;
  
  if (provider === 'sqlite') {
    // SQLite: Use DATABASE_URL from environment (Electron passe chemin absolu)
    // Si pas défini, Prisma utilisera le schema.prisma par défaut
    if (url) {
      // Fix: Convertir chemins relatifs en absolus
      // Cause: Prisma ne résout pas correctement les chemins relatifs selon le CWD
      // Ref: https://github.com/prisma/prisma/issues/11626
      let resolvedUrl = url;
      if (url.startsWith('file:./') || url.startsWith('file:../')) {
        const relativePath = url.replace('file:', '');
        const absolutePath = path.resolve(process.cwd(), relativePath);
        resolvedUrl = `file:${absolutePath}`;
        logger.info('[DB] ✅ Converted relative → absolute', { relativePath, absolutePath });
      }
      logger.info('[DB] Using DATABASE_URL', { url: resolvedUrl.substring(0, 70) + '...' });
      return resolvedUrl;
    }
    logger.info('[DB] No DATABASE_URL set, using schema.prisma default');
    return undefined;
  } else {
    // PostgreSQL: Use Supabase or custom URL
    logger.info('[DB] DATABASE_URL from env', { url: url ? `${url.substring(0, 30)}...` : 'UNDEFINED' });
    if (!url) {
      logger.error('[DB] ERROR: DATABASE_URL is not defined in environment variables!');
      throw new Error('DATABASE_URL environment variable is required for PostgreSQL');
    }
    return url;
  }
}

/**
 * Get Prisma Client instance (Singleton pattern)
 * 
 * Automatically selects database provider based on environment:
 * - Desktop/Mobile: SQLite (file:./prisma/dev.db)
 * - Development: SQLite (Electron-compatible)
 * - Production Web: PostgreSQL (Supabase)
 * 
 * @returns {Promise<PrismaClient | null>} Prisma client instance or null if initialization fails
 * 
 * @example
 * ```typescript
 * const prisma = await getPrisma();
 * if (!prisma) {
 *   return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
 * }
 * const users = await prisma.user.findMany();
 * ```
 */
export async function getPrisma(): Promise<PrismaClient | null> {
  if (prismaSingleton) return prismaSingleton;
  
  try {
    const provider = getDatabaseProvider();
    const databaseUrl = getDatabaseUrl();
    
    logger.info(`[DB] Using ${provider} database`);
    logger.info(`[DB] Environment: ${detectEnvironment()}`);
    
    // Dynamically import to avoid build-time hard failure
    const mod = await import("@prisma/client");
    const { PrismaClient } = mod as { PrismaClient: typeof import('@prisma/client').PrismaClient };
    
    // Reuse in dev to avoid too many connections
    const g = globalThis as typeof globalThis & { __prisma__?: PrismaClient };
    if (!g.__prisma__) {
      const config: {
        log: Array<'query' | 'info' | 'warn' | 'error'>;
        datasources?: { db: { url: string } };
        __internal?: { engine: { binaryPath: string } };
      } = {
        log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error']
      };
      
      // Only override datasource URL if provided (for PostgreSQL)
      if (databaseUrl) {
        config.datasources = {
          db: { url: databaseUrl }
        };
      }
      
      // Electron production: Utiliser l'API interne pour spécifier le query engine path
      // Fix pour "Cannot find module '.prisma/client/default'" sur PC2
      if (process.env.PRISMA_QUERY_ENGINE_LIBRARY) {
        logger.info('[DB] Using Prisma internal API with query engine', { engine: process.env.PRISMA_QUERY_ENGINE_LIBRARY });
        config.__internal = {
          engine: {
            binaryPath: process.env.PRISMA_QUERY_ENGINE_LIBRARY
          }
        };
      }
      
      g.__prisma__ = new PrismaClient(config as unknown);
    }
    
    prismaSingleton = g.__prisma__;
    return prismaSingleton;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('[DB] Failed to initialize Prisma:', { error: errorMessage });
    return null;
  }
}

/**
 * Get current database info (for debugging)
 */
export function getDatabaseInfo() {
  return {
    environment: detectEnvironment(),
    provider: getDatabaseProvider(),
    url: getDatabaseUrl().replace(/:[^:@]+@/, ':****@') // Hide password
  };
}
