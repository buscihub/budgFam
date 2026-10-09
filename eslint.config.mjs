import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import eslintConfigPrettier from 'eslint-config-prettier';

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  eslintConfigPrettier,
  {
    // src/domain must stay pure: no framework/DB/AI SDK imports (CLAUDE.md,
    // non-negotiable rule 3), so it can be tested without mocks.
    files: ['src/domain/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            { group: ['next', 'next/*'], message: 'src/domain must be pure: no Next.js imports.' },
            {
              group: ['@supabase/*'],
              message: 'src/domain must be pure: use src/data for database access.',
            },
            {
              group: ['@anthropic-ai/*'],
              message: 'src/domain must be pure: call the AI client from src/data.',
            },
          ],
        },
      ],
    },
  },
  {
    // Database access lives in src/data only (CLAUDE.md, non-negotiable rule 2):
    // components and routes go through it, they never import a Supabase client.
    // src/domain is excluded here because the block above already covers it.
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/data/**', 'src/domain/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@supabase/*'],
              message: 'Only src/data may talk to Supabase: call a function from src/data instead.',
            },
          ],
        },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
    // Static design snapshots, not maintained app code.
    'docs/design/mockups/**',
  ]),
]);

export default eslintConfig;
