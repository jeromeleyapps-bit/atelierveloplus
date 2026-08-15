/**
 * Configuration ESLint « plate » (flat config).
 *
 * ESLint 8 est en fin de vie ; à partir d'ESLint 9 le format .eslintrc n'est plus
 * lu par défaut. Ce fichier reprend à l'identique les règles de l'ancien
 * .eslintrc.json : préréglage Next, avertissement sur les console.* (sauf warn et
 * error), signalement des commentaires fixme/xxx/hack, et tolérance des console.*
 * dans les fichiers de tests.
 */
// eslint-config-next 16 exporte directement une configuration plate : on l'utilise
// telle quelle. Le pont FlatCompat, lui, échoue sous ESLint 10 (structure circulaire
// dans le plugin react au moment de la validation de l'ancien format).
import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';

export default [
  {
    // Reprend l'ancien .eslintignore, que ESLint 9+ ne lit plus.
    ignores: [
      'node_modules/**',
      '.next/**',
      'out/**',
      'build/**',
      'dist/**',
      'dist-electron/**',
      'electron-resources/**',
      'coverage/**',
      'archives/**',
      'archives-md-old/**',
      'archives-scripts-old/**',
      'backups/**',
      // Process principal Electron et scripts : CommonJS, require() y est légitime.
      'electron/**',
      'scripts/**',
      '**/*.backup.js',
      'workers/node_modules/**',
      'pages-tarifs/**',
      'next-env.d.ts',
    ],
  },

  ...nextCoreWebVitals,

  {
    rules: {
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'no-warning-comments': [
        'warn',
        { terms: ['fixme', 'xxx', 'hack'], location: 'anywhere' },
      ],
    },
  },

  {
    files: [
      '**/__tests__/**',
      '**/*.test.ts',
      '**/*.test.tsx',
      '**/test/**',
      'e2e/**',
    ],
    rules: {
      'no-console': 'off',
    },
  },
];
