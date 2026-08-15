import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import { logger } from './logger';
import {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  LicenseError,
  DatabaseError,
  ExternalServiceError,
} from './errors/AppError';

/**
 * Gérer les erreurs API de manière sécurisée
 * Ne jamais exposer de stack traces ou détails internes en production
 */
export function handleApiError(error: unknown, context?: string): NextResponse {
  // Logger l'erreur complète côté serveur
  logger.error(`API Error${context ? ` - ${context}` : ''}`, {
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
    context,
  });

  // Gestion des erreurs custom
  if (error instanceof AppError) {
    return NextResponse.json(
      {
        error: error.code,
        message: error.message,
        ...(process.env.NODE_ENV !== 'production' && error.meta ? { meta: error.meta } : {}),
      },
      { status: error.statusCode }
    );
  }

  // Gestion des erreurs Prisma
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'CONFLICT', message: 'Cette ressource existe déjà' },
        { status: 409 }
      );
    }
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'NOT_FOUND', message: 'Ressource non trouvée' },
        { status: 404 }
      );
    }
    logger.error('Prisma error', { code: error.code, meta: error.meta });
    return NextResponse.json(
      { error: 'DATABASE_ERROR', message: 'Erreur base de données' },
      { status: 500 }
    );
  }

  // Gestion des erreurs Zod (validation)
  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        error: 'VALIDATION_ERROR',
        message: 'Données invalides',
        // Zod 4 : `issues` remplace `errors`.
        ...(process.env.NODE_ENV !== 'production' ? { details: error.issues } : {}),
      },
      { status: 400 }
    );
  }

  // Erreur générique
  const errorObj = error instanceof Error ? error : new Error(String(error));
  
  // En production: retourner uniquement un message générique
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'Une erreur est survenue' },
      { status: 500 }
    );
  }

  // En développement: retourner les détails de l'erreur
  return NextResponse.json(
    {
      error: 'INTERNAL_ERROR',
      message: errorObj.message,
      stack: errorObj.stack,
    },
    { status: 500 }
  );
}

/**
 * Créer une réponse d'erreur avec validation
 */
export function validationError(message: string, details?: Record<string, unknown>): NextResponse {
  return NextResponse.json(
    {
      error: 'validation_error',
      message,
      ...(process.env.NODE_ENV !== 'production' && details ? { details } : {}),
    },
    { status: 400 }
  );
}

/**
 * Créer une réponse d'erreur d'authentification
 */
export function unauthorizedError(message: string = 'Authentication required'): NextResponse {
  return NextResponse.json(
    { error: 'unauthorized', message },
    { status: 401 }
  );
}

/**
 * Créer une réponse d'erreur de permission
 */
export function forbiddenError(message: string = 'Access denied'): NextResponse {
  return NextResponse.json(
    { error: 'forbidden', message },
    { status: 403 }
  );
}

// Export des classes d'erreurs pour utilisation dans l'app
export {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  LicenseError,
  DatabaseError,
  ExternalServiceError,
};
