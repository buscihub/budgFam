import pg from 'pg';
import { getEnv } from './env';
import { removeFixtures, seedFixtures } from './fixtures';

// Fixtures are committed once for the whole run; each test then works inside
// a transaction that is always rolled back (see helpers.ts), so tests can't
// disturb each other.
async function withSuperuser(fn: (db: pg.Client) => Promise<void>) {
  const client = new pg.Client({ connectionString: getEnv().dbUrl });
  await client.connect();
  try {
    await fn(client);
  } finally {
    await client.end();
  }
}

export async function setup() {
  await withSuperuser(seedFixtures);
}

export async function teardown() {
  await withSuperuser(removeFixtures);
}
