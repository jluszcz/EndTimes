import { cloudflareTest } from '@cloudflare/vitest-pool-workers';
import { defineConfig } from 'vitest/config';

export default defineConfig({
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
    globals: true,
    include: ['test/**/*.test.js'],
  },
});
