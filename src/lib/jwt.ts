import { SignJWT, jwtVerify } from 'jose';
import { logger } from './logger';

const JWT_EXPIRES_IN = '7d'; // 7 jours

export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
}

/**
 * Get JWT secret with production validation
 */
function getJWTSecret(): string {
  const secret = process.env.JWT_SECRET;
  const isProduction = process.env.NODE_ENV === 'production';
  
  if (!secret) {
    if (isProduction) {
      // CRITICAL: Never use default secret in production
      throw new Error(
        'JWT_SECRET must be set in production environment. ' +
        'Generate one with: node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))"'
      );
    }
    // Development: Use default secret (NOT for production!)
    console.warn('⚠️ JWT_SECRET not set, using default secret (DEV ONLY)');
    return 'dev-secret-CHANGE-IN-PRODUCTION-IMMEDIATELY';
  }
  
  return secret;
}

// Convertir le secret en Uint8Array pour jose
const getSecretKey = () => new TextEncoder().encode(getJWTSecret());

/**
 * Générer un token JWT (compatible Edge Runtime)
 */
export async function generateToken(payload: JWTPayload): Promise<string> {
  const secret = getSecretKey();
  
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuedAt()
    .setIssuer('atelier-velo')
    .setExpirationTime(JWT_EXPIRES_IN)
    .sign(secret);
}

/**
 * Vérifier et décoder un token JWT (compatible Edge Runtime)
 */
export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const secret = getSecretKey();
    const { payload } = await jwtVerify(token, secret, {
      issuer: 'atelier-velo',
    });
    
    // Vérifier que le payload contient les champs requis
    if (!payload.userId || !payload.email || !payload.role) {
      return null;
    }
    
    return payload as unknown as JWTPayload;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('[JWT] Token verification failed', { error: errorMessage });
    return null;
  }
}

/**
 * Extraire le token depuis les headers
 */
export function extractToken(req: Request): string | null {
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7); // Remove "Bearer "
}

/**
 * Récupérer l'utilisateur depuis le token ou les headers (mode Electron local)
 */
export async function getUserFromToken(req: Request): Promise<JWTPayload | null> {
  // 1. Essayer avec le JWT
  const token = extractToken(req);
  if (token) {
    const user = await verifyToken(token);
    if (user) return user;
  }
  
  // 2. Fallback: Mode Electron local (headers x-user-id et x-user-role)
  const userId = req.headers.get('x-user-id');
  const userRole = req.headers.get('x-user-role');
  
  if (userId && userRole === 'admin') {
    // Mode Electron local: retourner un user fictif
    // Les APIs feront le vrai lookup dans la DB si nécessaire
    return {
      userId,
      email: 'electron-local',
      role: 'admin'
    };
  }
  
  return null;
}
