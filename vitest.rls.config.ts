import { defineConfig } from 'vitest/config';

// RLS integration tests run against the local Supabase (`supabase start`),
// so they live apart from the unit tests in vitest.config.ts: `pnpm test`
// must keep working without Docker.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/rls/**/*.test.ts'],
    globalSetup: ['tests/rls/global-setup.ts'],
    setupFiles: ['tests/rls/setup-file.ts'],
    testTimeout: 15_000,
  },
});
