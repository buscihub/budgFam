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
    // Test files share one database, and some tests (create_household) empty
    // the whole instance inside a rolled-back transaction. Run files one at a
    // time so those row locks can never deadlock with another file's writes.
    fileParallelism: false,
  },
});
