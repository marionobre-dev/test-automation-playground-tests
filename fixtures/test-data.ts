/**
 * The playground's public practice account (documented on the site itself).
 * Override with env vars if you ever point the suite at an environment
 * that uses different credentials.
 */
export const credentials = {
  username: process.env.APP_USERNAME ?? 'practice',
  password: process.env.APP_PASSWORD ?? 'SuperSecret123',
};

/** Seed data every API sandbox starts from (and returns to after POST /reset). */
export const SEED_USER_COUNT = 12;

/** An email that can't clash with seed data or with another test in the same run. */
export function uniqueEmail(prefix = 'pw'): string {
  return `${prefix}.${Date.now()}.${Math.random().toString(36).slice(2, 8)}@example.com`;
}
