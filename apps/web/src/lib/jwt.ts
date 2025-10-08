import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-CHANGE-IN-PRODUCTION-IMMEDIATELY';
const JWT_EXPIRES_IN = '7d'; // 7 jours

export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
}

/**
 * Générer un token JWT
 */
export function generateToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
    issuer: 'atelier-velo',
  });
}

/**
 * Vérifier et décoder un token JWT
 */
export function verifyToken(token: string): JWTPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: 'atelier-velo',
    }) as JWTPayload;
    return decoded;
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
export function getUserFromToken(req: Request): JWTPayload | null {
  const token = extractToken(req);
  if (!token) return null;
  return verifyToken(token);
}
