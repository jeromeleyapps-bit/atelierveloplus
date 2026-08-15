const nextJest = require('next/jest')

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files in your test environment
  dir: './',
})

// Add any custom config to be passed to Jest
const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  // Use node environment for API route tests
  testEnvironmentOptions: {
    customExportConditions: [''],
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@src/(.*)$': '<rootDir>/src/$1',
  },
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{js,jsx,ts,tsx}',
    '!src/**/__tests__/**',
    '!src/**/__mocks__/**',
  ],
  coverageThreshold: {
    global: {
      branches: 10,
      functions: 7,  // Ajusté: 7.6% actuel, objectif 10% pour Phase 3
      lines: 10,
      statements: 10,
    },
  },
  testMatch: [
    '**/__tests__/**/*.[jt]s?(x)',
    '**/?(*.)+(spec|test).[jt]s?(x)',
  ],
  // Exclure les helpers des tests
  testPathIgnorePatterns: [
    '/node_modules/',
    '/.next/',
    '/dist-electron/',
    '/electron-resources/',
    '/out/',
    // (août 2026) Ces tests étaient écrits pour Vitest et exclus d'ici, alors que
    // Vitest n'avait ni configuration ni script npm : ils n'ont jamais tourné depuis
    // novembre 2025, tout en couvrant crypto, jwt et la tarification. Convertis vers
    // Jest et réintégrés.
    // Exclure les helpers
    '/src/__tests__/helpers/',
    // Exclure les tests E2E (Playwright)
    '/e2e/',
    'e2e/',
  ],
  modulePathIgnorePatterns: [
    '/dist-electron/',
    '/electron-resources/',
  ],
  transformIgnorePatterns: [
    // jose est publié en ESM pur : sans transpilation, tout test qui charge
    // réellement src/lib/jwt.ts échoue sur « Unexpected token 'export' ».
    'node_modules/(?!(date-fns|jose)/)',
  ],
}

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
//
// next/jest impose ses propres `transformIgnorePatterns` et écrase ceux fournis ci-dessus.
// On récupère donc la configuration résolue pour y remplacer l'exclusion globale de
// node_modules par une exclusion qui laisse passer les paquets publiés en ESM pur —
// sans quoi tout test chargeant réellement src/lib/jwt.ts échoue sur un `export`
// inattendu venant de jose.
const ESM_A_TRANSPILER = ['jose', 'date-fns'];

module.exports = async () => {
  const config = await createJestConfig(customJestConfig)();
  config.transformIgnorePatterns = (config.transformIgnorePatterns || []).map((motif) =>
    motif === '/node_modules/' || motif === 'node_modules/'
      ? `/node_modules/(?!(${ESM_A_TRANSPILER.join('|')})/)`
      : motif
  );
  return config;
};

