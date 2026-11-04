import { test, expect, type APIRequestContext } from '@playwright/test';
import { credentials, SEED_USER_COUNT, uniqueEmail } from '../../fixtures/test-data';

// These tests share one sandbox (see playwright.config.ts) and some of them
// count users, so run them in order rather than in parallel.
test.describe.configure({ mode: 'serial' });

async function getToken(request: APIRequestContext): Promise<string> {
  const res = await request.post('auth/login', { data: credentials });
  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(body.tokenType).toBe('Bearer');
  return body.token;
}

let auth: Record<string, string>;

test.beforeAll(async ({ request }) => {
  const reset = await request.post('reset');
  expect(reset.ok()).toBeTruthy();
  auth = { Authorization: `Bearer ${await getToken(request)}` };
});

test('health check reports ok for our sandbox', async ({ request }) => {
  const res = await request.get('health');
  expect(res.status()).toBe(200);
  expect(await res.json()).toMatchObject({ status: 'ok', sandbox: process.env.SANDBOX_ID });
});

test('login rejects bad credentials', async ({ request }) => {
  const res = await request.post('auth/login', { data: { username: credentials.username, password: 'wrong' } });
  expect(res.status()).toBe(401);
});

test('lists seed users with pagination', async ({ request }) => {
  const res = await request.get('users', { params: { page: 1, limit: 5 } });
  expect(res.status()).toBe(200);

  const body = await res.json();
  expect(body).toMatchObject({ page: 1, limit: 5, total: SEED_USER_COUNT, totalPages: 3 });
  expect(body.data).toHaveLength(5);
  expect(body.data[0]).toEqual(
    expect.objectContaining({ id: 1, name: 'Ana Silva', email: 'ana.silva@example.com', job: 'QA Engineer' }),
  );
});

test('searches users', async ({ request }) => {
  const res = await request.get('users', { params: { search: 'sdet' } });
  const body = await res.json();
  expect(body.total).toBe(2);
  for (const user of body.data) expect(user.job).toBe('SDET');
});

test('returns 404 for a missing user', async ({ request }) => {
  const res = await request.get('users/99999');
  expect(res.status()).toBe(404);
});

test('rejects writes without a token', async ({ request }) => {
  const res = await request.post('users', { data: { name: 'No Token', email: uniqueEmail() } });
  expect(res.status()).toBe(401);
});

test('validates input on create', async ({ request }) => {
  const res = await request.post('users', { headers: auth, data: { name: 'X', email: 'not-an-email' } });
  expect(res.status()).toBe(422);
  const body = await res.json();
  expect(body.fields).toMatchObject({
    name: 'Must be 2-60 characters.',
    email: 'Must be a valid email address.',
  });
});

test('create → read → update → delete', async ({ request }) => {
  const email = uniqueEmail();

  // Create
  const created = await request.post('users', { headers: auth, data: { name: 'Playwright Bot', email, job: 'SDET' } });
  expect(created.status()).toBe(201);
  const user = await created.json();
  expect(user).toMatchObject({ name: 'Playwright Bot', email, job: 'SDET' });
  expect(user.id).toEqual(expect.any(Number));

  // Duplicate email is refused
  const dupe = await request.post('users', { headers: auth, data: { name: 'Copy Cat', email } });
  expect(dupe.status()).toBe(409);

  // Read
  const read = await request.get(`users/${user.id}`);
  expect(await read.json()).toMatchObject({ id: user.id, email });

  // Partial update
  const patched = await request.patch(`users/${user.id}`, { headers: auth, data: { job: 'Lead SDET' } });
  expect(patched.status()).toBe(200);
  expect(await patched.json()).toMatchObject({ id: user.id, name: 'Playwright Bot', job: 'Lead SDET', updatedAt: expect.any(String) });

  // Delete, then confirm it's gone
  const deleted = await request.delete(`users/${user.id}`, { headers: auth });
  expect(deleted.status()).toBe(204);
  expect((await request.get(`users/${user.id}`)).status()).toBe(404);
});
