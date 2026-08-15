// Learn more: https://github.com/testing-library/jest-dom
require('@testing-library/jest-dom')

// Polyfills for Node.js globals (required by undici and Next.js)
const { TextEncoder, TextDecoder } = require('util');
if (typeof global.TextEncoder === 'undefined') {
  global.TextEncoder = TextEncoder;
  global.TextDecoder = TextDecoder;
}

// Polyfill ReadableStream (required by undici)
if (typeof global.ReadableStream === 'undefined') {
  try {
    const { ReadableStream } = require('stream/web');
    global.ReadableStream = ReadableStream;
  } catch (e) {
    // Fallback: minimal ReadableStream polyfill
    console.warn('[jest.setup] Could not load ReadableStream from stream/web');
  }
}

// Polyfills for Next.js Request/Response (required for API route tests)
// Node 20+ has native fetch, but Jest/jsdom needs polyfills
//
// ⚠️ undici est une dépendance de test indispensable, même si les outils d'analyse
// statique la signalent comme inutilisée : elle n'est référencée que dans ce fichier
// de configuration, jamais dans src/. Ne pas la retirer sans exécuter la suite.
try {
  const undici = require('undici');
  const { Request, Response, Headers } = undici;
  
  // Make Request/Response available globally for Next.js API route tests
  // Force assignment even if already defined (override)
  global.Request = Request;
  global.Response = Response;
  global.Headers = Headers;
  
  // Vérification que les polyfills sont bien chargés
  if (typeof global.Request === 'undefined') {
    throw new Error('Failed to set global.Request from undici');
  }
} catch (e) {
  // Log l'erreur pour debug
  console.error('[jest.setup] Error loading undici polyfills:', e.message);
  console.error('[jest.setup] Stack:', e.stack);
  throw e; // Fail fast si les polyfills ne peuvent pas être chargés
}

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
      pathname: '/',
      query: {},
      asPath: '/',
    }
  },
  usePathname() {
    return '/'
  },
  useSearchParams() {
    return new URLSearchParams()
  },
}))

// Mock window.matchMedia (only in jsdom environment)
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(), // deprecated
      removeListener: jest.fn(), // deprecated
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  })

  // Mock window.location to prevent navigation errors in jsdom
  // Note: This is a workaround for jsdom's navigation limitations
  try {
    delete window.location;
    window.location = {
      href: '',
      pathname: '/',
      search: '',
      hash: '',
      assign: jest.fn(),
      replace: jest.fn(),
      reload: jest.fn(),
      toString: jest.fn(() => ''),
    };
  } catch (e) {
    // Location may not be deletable, that's ok
  }
}

// Suppress console errors in tests (optional - comment out if you want to see them)
global.console = {
  ...console,
  error: jest.fn(),
  warn: jest.fn(),
}

