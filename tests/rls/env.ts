import { execSync } from 'node:child_process';

export type LocalEnv = {
  dbUrl: string;
  apiUrl: string;
  anonKey: string;
  serviceRoleKey: string;
};

let cached: LocalEnv | undefined;

// URLs and keys come from the running local stack (`supabase status`), never
// from the repository (CLAUDE.md rules 6 and 10). Env vars override them.
export function getEnv(): LocalEnv {
  if (cached) return cached;

  let status: Record<string, string> = {};
  if (!process.env.SUPABASE_DB_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    let out: string;
    try {
      out = execSync('supabase status -o json', {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
      });
    } catch {
      throw new Error('Local Supabase is not running. Start it with `supabase start`.');
    }
    status = JSON.parse(out.slice(out.indexOf('{'))) as Record<string, string>;
  }

  const env: LocalEnv = {
    dbUrl: process.env.SUPABASE_DB_URL ?? status.DB_URL ?? '',
    apiUrl: process.env.SUPABASE_URL ?? status.API_URL ?? '',
    anonKey: process.env.SUPABASE_ANON_KEY ?? status.ANON_KEY ?? '',
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? status.SERVICE_ROLE_KEY ?? '',
  };

  // These tests delete and rewrite data: never let them near a real database.
  for (const url of [env.dbUrl, env.apiUrl]) {
    const host = new URL(url).hostname;
    if (!['127.0.0.1', 'localhost', '[::1]'].includes(host)) {
      throw new Error(`Refusing to run RLS tests against a non-local host: ${host}`);
    }
  }

  cached = env;
  return env;
}
