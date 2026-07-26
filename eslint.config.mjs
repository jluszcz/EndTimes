import js from '@eslint/js';
import globals from 'globals';

export default [
  {
    ignores: ['node_modules/', '.wrangler/'],
  },
  js.configs.recommended,
  {
    // Cloudflare Worker backend
    files: ['src/**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.serviceworker,
      },
    },
  },
  {
    // Browser frontend (ES modules)
    files: ['public/**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
      },
    },
  },
  {
    // Vitest tests and config
    files: ['test/**/*.js', '*.config.{js,mjs}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.node,
      },
    },
  },
  {
    // The frontend suite runs in happy-dom, so browser globals are real there.
    files: ['test/frontend/**/*.js'],
    languageOptions: {
      globals: {
        ...globals.browser,
      },
    },
  },
];
