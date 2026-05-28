import crypto from 'crypto';
import { SignJWT, jwtVerify } from 'jose';
import { logger } from './logger';

const JWT_EXPIRES_IN = '7d';
const MIN_SECRET_BYTES = 32;

export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
}

let cachedDevSecret: string | null = null;

function getJWTSecret(): string {
  const secret = process.env.JWT_SECRET;
  const isProduction = process.env.NODE_ENV === 'production';

  if (secret && secret.length >= MIN_SECRET_BYTES) {
    return secret;
  }

  if (isProduction) {
    throw new Error(
      `JWT_SECRET must be set with at least ${MIN_SECRET_BYTES} characters in production. ` +
      `Generate one with: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`
    );
  }

  if (!cachedDevSecret) {
    cachedDevSecret = crypto.randomBytes(64).toString('hex');
    logger.warn(
      `[JWT] JWT_SECRET missing or too short (<${MIN_SECRET_BYTES} chars). ` +
      `Using a random per-process secret for development. Existing tokens will be invalid on restart.`
    );
  }
  return cachedDevSecret;
}

const getSecretKey = () => new TextEncoder().encode(getJWTSecret());

export async function generateToken(payload: JWTPayload): Promise<string> {
  const secret = getSecretKey();

  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuedAt()
    .setIssuer('atelier-velo')
    .setExpirationTime(JWT_EXPIRES_IN)
    .sign(secret);
}

export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const secret = getSecretKey();
    const { payload } = await jwtVerify(token, secret, {
      issuer: 'atelier-velo',
    });

    if (!payload.userId || !payload.email || !payload.role) {
      return null;
    }

    return payload as unknown as JWTPayload;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const isExpirationError = errorMessage.includes('exp') || errorMessage.includes('expired');
    const isDevelopment = process.env.NODE_ENV !== 'production';

    if (!isDevelopment || !isExpirationError) {
      logger.error('[JWT] Token verification failed', { error: errorMessage });
    } else {
      logger.debug('[JWT] Token expired (development)', { error: errorMessage });
    }

    return null;
  }
}

export function extractToken(req: Request): string | null {
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7);
}

/**
 * Validates the per-session Electron auth token.
 * Only the Electron main process knows ELECTRON_AUTH_TOKEN; other local processes can't forge it.
 */
function isValidElectronSession(req: Request): boolean {
  const expected = process.env.ELECTRON_AUTH_TOKEN;
  if (!expected) return false;
  const provided = req.headers.get('x-electron-auth-token');
  if (!provided || provided.length !== expected.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(provided), Buffer.from(expected));
  } catch {
    return false;
  }
}

export async function getUserFromToken(req: Request): Promise<JWTPayload | null> {
  const token = extractToken(req);
  if (token) {
    const user = await verifyToken(token);
    if (user) return user;
  }

  // Electron local fallback — only honoured when the request carries the per-session token
  // injected by the main process. Closes the cross-process bypass.
  if (isValidElectronSession(req)) {
    const userId = req.headers.get('x-user-id');
    const userRole = req.headers.get('x-user-role');
    if (userId && userRole === 'admin') {
      return {
        userId,
        email: 'electron-local',
        role: 'admin',
      };
    }
  }

  return null;
}
