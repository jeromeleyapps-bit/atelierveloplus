/**
 * Classes d'Erreurs Custom - Atelier Vélo+
 * 
 * Hiérarchie d'erreurs pour gestion uniforme
 * 
 * @module lib/errors
 */

/**
 * Erreur de base de l'application
 */
export class AppError extends Error {
  constructor(
    public message: string,
    public code: string,
    public statusCode: number = 500,
    public meta?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AppError';
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      meta: this.meta,
    };
  }
}

/**
 * Erreur de validation (400)
 */
export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 'VALIDATION_ERROR', 400, { details });
    this.name = 'ValidationError';
  }
}

/**
 * Erreur d'authentification (401)
 */
export class AuthenticationError extends AppError {
  constructor(message: string = 'Non authentifié') {
    super(message, 'AUTHENTICATION_ERROR', 401);
    this.name = 'AuthenticationError';
  }
}

/**
 * Erreur d'autorisation (403)
 */
export class AuthorizationError extends AppError {
  constructor(message: string = 'Non autorisé') {
    super(message, 'AUTHORIZATION_ERROR', 403);
    this.name = 'AuthorizationError';
  }
}

/**
 * Erreur ressource non trouvée (404)
 */
export class NotFoundError extends AppError {
  constructor(resource: string, id?: string) {
    const message = id 
      ? `${resource} avec l'ID ${id} non trouvé`
      : `${resource} non trouvé`;
    super(message, 'NOT_FOUND', 404, { resource, id });
    this.name = 'NotFoundError';
  }
}

/**
 * Erreur de conflit (409)
 */
export class ConflictError extends AppError {
  constructor(message: string, field?: string) {
    super(message, 'CONFLICT', 409, { field });
    this.name = 'ConflictError';
  }
}

/**
 * Erreur de licence (402)
 */
export class LicenseError extends AppError {
  constructor(message: string, tier?: string) {
    super(message, 'LICENSE_ERROR', 402, { tier });
    this.name = 'LicenseError';
  }
}

/**
 * Erreur de base de données (500)
 */
export class DatabaseError extends AppError {
  constructor(message: string, operation?: string) {
    super(message, 'DATABASE_ERROR', 500, { operation });
    this.name = 'DatabaseError';
  }
}

/**
 * Erreur externe (502)
 */
export class ExternalServiceError extends AppError {
  constructor(service: string, message: string) {
    super(`Erreur ${service}: ${message}`, 'EXTERNAL_SERVICE_ERROR', 502, { service });
    this.name = 'ExternalServiceError';
  }
}
