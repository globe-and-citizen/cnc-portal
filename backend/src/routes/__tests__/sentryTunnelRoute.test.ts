import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';

// Mock global fetch
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

const DSN_HOST = 'o4504664101552128.ingest.us.sentry.io';
const PROJECT_ID = '4510019171450880';
const VALID_DSN = `https://pubkey@${DSN_HOST}/${PROJECT_ID}`;
const EXPECTED_INGEST_URL = `https://${DSN_HOST}/api/${PROJECT_ID}/envelope/`;

function makeEnvelope(dsn: string | undefined): string {
  const header = dsn ? JSON.stringify({ dsn }) : JSON.stringify({});
  return `${header}\n{"type":"session"}\n{}`;
}

// Re-import the route after env vars are set so the module-level SENTRY_INGEST_URL
// is computed with the right values.
async function buildApp(frontendDsn: string | undefined, projectId: string | undefined) {
  vi.unstubAllEnvs();
  if (frontendDsn) vi.stubEnv('SENTRY_FRONTEND_DSN', frontendDsn);
  if (projectId) vi.stubEnv('SENTRY_FRONTEND_PROJECT_ID', projectId);

  vi.resetModules();
  const { default: sentryTunnelRoute } = await import('../sentryTunnelRoute');
  const app = express();
  app.use('/api/sentry-tunnel', sentryTunnelRoute);
  return app;
}

describe('sentryTunnelRoute', () => {
  beforeEach(() => {
    mockFetch.mockResolvedValue({ status: 200 });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('forwards a valid envelope to Sentry and returns 200', async () => {
    const app = await buildApp(VALID_DSN, PROJECT_ID);
    const res = await request(app)
      .post('/api/sentry-tunnel')
      .set('Content-Type', 'application/x-sentry-envelope')
      .send(makeEnvelope(VALID_DSN));

    expect(res.status).toBe(200);
    expect(mockFetch).toHaveBeenCalledWith(
      EXPECTED_INGEST_URL,
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('returns 200 silently when SENTRY_FRONTEND_DSN is not set', async () => {
    const app = await buildApp(undefined, undefined);
    const res = await request(app)
      .post('/api/sentry-tunnel')
      .set('Content-Type', 'application/x-sentry-envelope')
      .send(makeEnvelope(VALID_DSN));

    expect(res.status).toBe(200);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('returns 400 when DSN is missing from envelope header', async () => {
    const app = await buildApp(VALID_DSN, PROJECT_ID);
    const res = await request(app)
      .post('/api/sentry-tunnel')
      .set('Content-Type', 'application/x-sentry-envelope')
      .send(makeEnvelope(undefined));

    expect(res.status).toBe(400);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('returns 403 when envelope project ID does not match SENTRY_FRONTEND_PROJECT_ID', async () => {
    const app = await buildApp(VALID_DSN, PROJECT_ID);
    const otherDsn = `https://key@${DSN_HOST}/9999999999`;
    const res = await request(app)
      .post('/api/sentry-tunnel')
      .set('Content-Type', 'application/x-sentry-envelope')
      .send(makeEnvelope(otherDsn));

    expect(res.status).toBe(403);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('returns 200 even when Sentry fetch throws (fail silently)', async () => {
    mockFetch.mockRejectedValue(new Error('network error'));
    const app = await buildApp(VALID_DSN, PROJECT_ID);
    const res = await request(app)
      .post('/api/sentry-tunnel')
      .set('Content-Type', 'application/x-sentry-envelope')
      .send(makeEnvelope(VALID_DSN));

    expect(res.status).toBe(200);
  });

  it('skips project ID check when SENTRY_FRONTEND_PROJECT_ID is not set', async () => {
    const app = await buildApp(VALID_DSN, undefined);
    const otherDsn = `https://key@${DSN_HOST}/9999999999`;
    const res = await request(app)
      .post('/api/sentry-tunnel')
      .set('Content-Type', 'application/x-sentry-envelope')
      .send(makeEnvelope(otherDsn));

    expect(res.status).toBe(200);
    expect(mockFetch).toHaveBeenCalledWith(EXPECTED_INGEST_URL, expect.anything());
  });

  it('never uses client-provided host in the fetch URL', async () => {
    const app = await buildApp(VALID_DSN, PROJECT_ID);
    // Envelope contains a different (attacker-controlled) DSN host
    const attackerDsn = `https://key@${DSN_HOST}/${PROJECT_ID}`;
    await request(app)
      .post('/api/sentry-tunnel')
      .set('Content-Type', 'application/x-sentry-envelope')
      .send(makeEnvelope(attackerDsn));

    // Fetch must always target the server-side configured URL, never the client's host
    expect(mockFetch).toHaveBeenCalledWith(EXPECTED_INGEST_URL, expect.anything());
  });
});
