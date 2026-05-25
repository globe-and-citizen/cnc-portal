import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import sentryTunnelRoute from '../sentryTunnelRoute';

// Mock global fetch
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

const DSN_HOST = 'o4504664101552128.ingest.us.sentry.io';
const PROJECT_ID = '4510019171450880';
const VALID_DSN = `https://pubkey@${DSN_HOST}/${PROJECT_ID}`;

function makeEnvelope(dsn: string | undefined): string {
  const header = dsn ? JSON.stringify({ dsn }) : JSON.stringify({});
  return `${header}\n{"type":"session"}\n{}`;
}

function buildApp() {
  const app = express();
  app.use('/api/sentry-tunnel', sentryTunnelRoute);
  return app;
}

describe('sentryTunnelRoute', () => {
  beforeEach(() => {
    mockFetch.mockResolvedValue({ status: 200 });
    vi.stubEnv('SENTRY_FRONTEND_PROJECT_ID', PROJECT_ID);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it('forwards a valid envelope to Sentry and returns 200', async () => {
    const app = buildApp();
    const res = await request(app)
      .post('/api/sentry-tunnel')
      .set('Content-Type', 'application/x-sentry-envelope')
      .send(makeEnvelope(VALID_DSN));

    expect(res.status).toBe(200);
    expect(mockFetch).toHaveBeenCalledWith(
      `https://${DSN_HOST}/api/${PROJECT_ID}/envelope/`,
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('returns 400 when DSN is missing from envelope header', async () => {
    const app = buildApp();
    const res = await request(app)
      .post('/api/sentry-tunnel')
      .set('Content-Type', 'application/x-sentry-envelope')
      .send(makeEnvelope(undefined));

    expect(res.status).toBe(400);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('returns 400 when DSN host is not a sentry.io domain', async () => {
    const app = buildApp();
    const evilDsn = `https://key@evil.com/${PROJECT_ID}`;
    const res = await request(app)
      .post('/api/sentry-tunnel')
      .set('Content-Type', 'application/x-sentry-envelope')
      .send(makeEnvelope(evilDsn));

    expect(res.status).toBe(400);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('returns 403 when project ID does not match SENTRY_FRONTEND_PROJECT_ID', async () => {
    const app = buildApp();
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
    const app = buildApp();
    const res = await request(app)
      .post('/api/sentry-tunnel')
      .set('Content-Type', 'application/x-sentry-envelope')
      .send(makeEnvelope(VALID_DSN));

    expect(res.status).toBe(200);
  });

  it('skips project ID check when SENTRY_FRONTEND_PROJECT_ID is not set', async () => {
    vi.unstubAllEnvs();
    const app = buildApp();
    const res = await request(app)
      .post('/api/sentry-tunnel')
      .set('Content-Type', 'application/x-sentry-envelope')
      .send(makeEnvelope(VALID_DSN));

    expect(res.status).toBe(200);
    expect(mockFetch).toHaveBeenCalled();
  });
});
