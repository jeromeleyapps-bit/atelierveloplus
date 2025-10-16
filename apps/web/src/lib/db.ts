/**
 * Smart Database Connection Manager
 * 
 * Automatically selects the right database based on environment:
 * - Development (local): Supabase PostgreSQL
 * - Production Web (Vercel): Supabase PostgreSQL
 * - Desktop (Electron): SQLite local
 * - Mobile (React Native): SQLite local
 */

let prismaSingleton: any | null = null;

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
  
  // Auto-detect
  switch (env) {
    case 'desktop':
    case 'mobile':
      return 'sqlite';
    case 'development':
    case 'production-web':
    default:
      return 'postgresql';
  }
}

/**
 * Get database URL based on provider
 */
function getDatabaseUrl(): string {
  const provider = getDatabaseProvider();
  
  if (provider === 'sqlite') {
    // SQLite: Use schema.prisma URL (don't override it)
    // Return undefined to let Prisma use the schema.prisma datasource URL
    return undefined as any;
  } else {
    // PostgreSQL: Use Supabase or custom URL
    const url = process.env.DATABASE_URL;
    console.log('[DB] DATABASE_URL from env:', url ? `${url.substring(0, 30)}...` : 'UNDEFINED');
    if (!url) {
      console.error('[DB] ERROR: DATABASE_URL is not defined in environment variables!');
      throw new Error('DATABASE_URL environment variable is required for PostgreSQL');
    }
    return url;
  }
}

/**
 * Get Prisma Client instance
 * Automatically selects PostgreSQL (Supabase) or SQLite based on environment
 */
export async function getPrisma() {
  if (prismaSingleton) return prismaSingleton;
  
  try {
    const provider = getDatabaseProvider();
    const databaseUrl = getDatabaseUrl();
    
    console.log(`[DB] Using ${provider} database`);
    console.log(`[DB] Environment: ${detectEnvironment()}`);
    
    // Dynamically import to avoid build-time hard failure
    const mod = await import("@prisma/client");
    const { PrismaClient } = mod as any;
    
    // Reuse in dev to avoid too many connections
    const g = globalThis as any;
    if (!g.__prisma__) {
      const config: any = {
        log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error']
      };
      
      // Only override datasource URL if provided (for PostgreSQL)
      if (databaseUrl) {
        config.datasources = {
          db: { url: databaseUrl }
        };
      }
      
      g.__prisma__ = new PrismaClient(config);
    }
    
    prismaSingleton = g.__prisma__;
    return prismaSingleton;
  } catch (error) {
    console.error('[DB] Failed to initialize Prisma:', error);
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
