import { NextResponse } from 'next/server';

/**
 * Gérer les erreurs API de manière sécurisée
 * Ne jamais exposer de stack traces ou détails internes en production
 */
export function handleApiError(error: any, context?: string): NextResponse {
  // Logger l'erreur complète côté serveur (pour debugging)
  console.error(`[API Error${context ? ` - ${context}` : ''}]:`, {
    message: error.message,
    stack: error.stack,
    code: error.code,
    name: error.name,
  });

  // En production: retourner uniquement un message générique
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'internal_server_error' },
      { status: 500 }
    );
  }

  // En développement: retourner le message d'erreur (mais jamais la stack)
  return NextResponse.json(
    { 
      error: 'internal_server_error',
      message: error.message,
      code: error.code,
    },
    { status: 500 }
  );
}

/**
 * Créer une réponse d'erreur avec validation
 */
export function validationError(message: string, details?: any): NextResponse {
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
