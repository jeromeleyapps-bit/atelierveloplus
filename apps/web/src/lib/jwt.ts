import { SignJWT, jwtVerify } from 'jose';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-CHANGE-IN-PRODUCTION-IMMEDIATELY';
const JWT_EXPIRES_IN = '7d'; // 7 jours

export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
}

// Convertir le secret en Uint8Array pour jose
const getSecretKey = () => new TextEncoder().encode(JWT_SECRET);

/**
 * Générer un token JWT (compatible Edge Runtime)
 */
export async function generateToken(payload: JWTPayload): Promise<string> {
  const secret = getSecretKey();
  
  return await new SignJWT(payload as any)
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
    console.error('[JWT] Token verification failed:', error instanceof Error ? error.message : 'Unknown error');
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
 * Récupérer l'utilisateur depuis le token
 */
export async function getUserFromToken(req: Request): Promise<JWTPayload | null> {
  const token = extractToken(req);
  if (!token) return null;
  return await verifyToken(token);
}
