import { defineWorkersConfig } from '@cloudflare/vitest-pool-workers/config';

export default defineWorkersConfig({
  test: {
    globals: true,
    include: ['test/**/*.test.js'],
    poolOptions: {
      workers: {
        // Load production wrangler configuration
        wrangler: { configPath: './wrangler.toml' },
        // Test-specific environment bindings (isolated from production)
        miniflare: {
          bindings: {
            // Mock API key for testing - not used in actual TMDB calls due to mocked fetch
            TMDB_API_KEY: process.env.TMDB_API_KEY || 'test-mock-api-key',
          },
        },
      },
    },
  },
});
