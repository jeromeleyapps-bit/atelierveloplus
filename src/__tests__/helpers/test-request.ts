/**
 * Helper pour créer des requêtes mockées pour les tests API
 * Évite les problèmes avec NextRequest dans l'environnement Jest
 * 
 * NOTE: Ce fichier n'est pas un test, c'est un helper
 * Il est exclu des tests via jest.config.js
 */

export function createMockRequest(url: string, options: {
  method?: string;
  headers?: Record<string, string>;
  body?: any;
} = {}): Request {
  const { method = 'GET', headers = {}, body } = options;
  
  // Créer un objet Request mocké
  // Request est disponible via undici dans jest.setup.js (global.Request)
  // Utiliser global.Request directement car il est défini dans jest.setup.js
  const RequestConstructor = (global as any).Request;
  const HeadersConstructor = (global as any).Headers;
  
  if (!RequestConstructor || !HeadersConstructor) {
    throw new Error('Request/Response polyfills not loaded. Check jest.setup.js');
  }
  
  const mockHeaders = new HeadersConstructor();
  Object.entries(headers).forEach(([key, value]) => {
    mockHeaders.set(key, value);
  });

  const requestInit: RequestInit = {
    method,
    headers: mockHeaders,
  };

  if (body) {
    requestInit.body = typeof body === 'string' ? body : JSON.stringify(body);
  }

  return new RequestConstructor(url, requestInit);
}

