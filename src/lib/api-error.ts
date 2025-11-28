import { NextResponse } from "next/server";
import { logger } from '@/lib/logger';

/**
 * Gestion sécurisée des erreurs API avec masquage automatique en production
 * 
 * Convertit les erreurs en réponses HTTP appropriées:
 * - En développement: Expose tous les détails (message, stack trace)
 * - En production: Masque les détails techniques, expose uniquement les erreurs métier
 * 
 * @param {unknown} error - Erreur capturée (Error, string, ou autre)
 * @param {string} [context] - Contexte de l'erreur pour les logs (e.g., "users/GET")
 * @returns {NextResponse} Réponse HTTP avec code approprié (400, 401, 403, 404, 409, 500)
 * 
 * @example
 * ```typescript
 * try {
 *   const user = await prisma.user.findUnique({ where: { id } });
 *   if (!user) throw new Error('not_found');
 * } catch (error) {
 *   return handleApiError(error, 'users/GET');
 * }
 * ```
 */
export function handleApiError(error: unknown, context?: string): NextResponse {
  const isDev = process.env.NODE_ENV === 'development';
  
  // Log serveur (toujours visible dans les logs)
  const errorMessage = error instanceof Error ? error.message : String(error);
  logger.error(`[API Error${context ? ` - ${context}` : ''}]`, { error: errorMessage });
  
  // Déterminer le message d'erreur
  let errorMessage = 'internal_error';
  let statusCode = 500;
  
  if (error instanceof Error) {
    // En dev: montrer le message d'erreur
    // En prod: message générique sauf pour les erreurs métier connues
    if (isDev) {
      errorMessage = error.message;
    } else {
      // Liste blanche des erreurs métier à exposer
      const safeErrors = [
        'unauthorized',
        'forbidden',
        'not_found',
        'invalid_payload',
        'validation_error',
        'duplicate_entry',
        'no_user_in_database',
        'no_user_found',
      ];
      
      if (safeErrors.some(safe => error.message.toLowerCase().includes(safe))) {
        errorMessage = error.message;
      }
    }
    
    // Déterminer le code HTTP approprié
    if (error.message.includes('unauthorized') || error.message.includes('token')) {
      statusCode = 401;
    } else if (error.message.includes('forbidden')) {
      statusCode = 403;
    } else if (error.message.includes('not_found') || error.message.includes('no_user')) {
      statusCode = 404;
    } else if (error.message.includes('invalid') || error.message.includes('validation')) {
      statusCode = 400;
    } else if (error.message.includes('duplicate')) {
      statusCode = 409;
    }
  }
  
  return NextResponse.json(
    { 
      error: errorMessage,
      ...(isDev && error instanceof Error && { stack: error.stack })
    },
    { status: statusCode }
  );
}

/**
 * Validation simple des payloads (alternative légère à Zod)
 */
export function validateRequired(data: Record<string, unknown>, fields: string[]): void {
  for (const field of fields) {
    if (data[field] === undefined || data[field] === null || data[field] === '') {
      throw new Error(`validation_error: ${field} is required`);
    }
  }
}

/**
 * Validation de types
 */
export function validateTypes(data: Record<string, unknown>, schema: Record<string, 'string' | 'number' | 'boolean'>): void {
  for (const [field, expectedType] of Object.entries(schema)) {
    if (data[field] !== undefined && typeof data[field] !== expectedType) {
      throw new Error(`validation_error: ${field} must be a ${expectedType}`);
    }
  }
}
