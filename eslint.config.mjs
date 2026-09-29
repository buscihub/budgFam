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
