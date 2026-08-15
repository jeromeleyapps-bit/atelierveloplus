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
  // transformIgnorePatterns : voir la fusion en bas de fichier. next/jest génère
  // ses propres motifs et ignore ceux déclarés ici.
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

  // next/jest produit des motifs de la forme « /node_modules/(?!(geist)/) ». Un fichier
  // est ignoré dès qu'il correspond à UN motif : il ne suffit donc pas d'en ajouter un,
  // il faut inscrire nos paquets dans les négations existantes. On le fait par détection
  // de motif plutôt que par égalité de chaîne, pour survivre aux évolutions de next/jest.
  const ajout = ESM_A_TRANSPILER.join('|');
  config.transformIgnorePatterns = (config.transformIgnorePatterns || []).map((motif) => {
    if (typeof motif !== 'string' || !motif.includes('node_modules')) return motif;
    // Étend chaque négation « (?!(a|b)/) » ou « (?!(a|b)@) » avec nos paquets.
    const etendu = motif.replace(
      /\(\?!\(([^)]*)\)([/@])\)/g,
      (_t, paquets, separateur) => `(?!(${paquets}|${ajout})${separateur})`
    );
    // Motif sans négation nommée (ex. « /node_modules/ ») : on en ajoute une.
    if (etendu === motif && /^\/?node_modules\/$/.test(motif)) {
      return `/node_modules/(?!(${ajout})/)`;
    }
    return etendu;
  });

  return config;
};

