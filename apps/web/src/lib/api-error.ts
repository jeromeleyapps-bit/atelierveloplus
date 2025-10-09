import { NextResponse } from "next/server";

/**
 * Gestion sécurisée des erreurs API
 * Masque les détails techniques en production
 */
export function handleApiError(error: unknown, context?: string): NextResponse {
  const isDev = process.env.NODE_ENV === 'development';
  
  // Log serveur (toujours visible dans les logs)
  console.error(`[API Error${context ? ` - ${context}` : ''}]`, error);
  
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
export function validateRequired(data: any, fields: string[]): void {
  for (const field of fields) {
    if (data[field] === undefined || data[field] === null || data[field] === '') {
      throw new Error(`validation_error: ${field} is required`);
    }
  }
}

/**
 * Validation de types
 */
export function validateTypes(data: any, schema: Record<string, 'string' | 'number' | 'boolean'>): void {
  for (const [field, expectedType] of Object.entries(schema)) {
    if (data[field] !== undefined && typeof data[field] !== expectedType) {
      throw new Error(`validation_error: ${field} must be a ${expectedType}`);
    }
  }
}
