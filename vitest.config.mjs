import { cloudflareTest } from '@cloudflare/vitest-pool-workers';
import { defineConfig } from 'vitest/config';

// Two projects, because the Worker and the browser code need different runtimes.
// Everything used to run in workerd, where there is no document or localStorage,
// so the frontend suite could only import pure helpers — which is why the DOM
// half of public/script.js had no coverage at all.
export default defineConfig({
  test: {
    projects: [
      {
        plugins: [
          cloudflareTest({
            // Load production wrangler configuration
            wrangler: { configPath: './wrangler.toml' },
            // Test-specific environment bindings (isolated from production)
            miniflare: {
              bindings: {
                // Static mock token - never used in real TMDB calls because fetch is mocked
                TMDB_READ_ACCESS_TOKEN: 'test-mock-token',
              },
            },
          }),
        ],
        test: {
          name: 'worker',
          globals: true,
          include: ['test/worker/**/*.test.js'],
        },
      },
      {
        test: {
          name: 'frontend',
          globals: true,
          environment: 'happy-dom',
          include: ['test/frontend/**/*.test.js'],
        },
      },
    ],
  },
});
