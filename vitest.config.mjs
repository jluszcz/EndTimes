import { cloudflareTest } from '@cloudflare/vitest-pool-workers';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [cloudflareTest({
    // Load production wrangler configuration
    wrangler: { configPath: './wrangler.toml' },
    // Test-specific environment bindings (isolated from production)
    miniflare: {
      bindings: {
        // Mock API key for testing - not used in actual TMDB calls due to mocked fetch
        TMDB_API_KEY: process.env.TMDB_API_KEY || 'test-mock-api-key',
      },
    },
  })],
  test: {
    globals: true,
    include: ['test/**/*.test.js'],
  },
});
