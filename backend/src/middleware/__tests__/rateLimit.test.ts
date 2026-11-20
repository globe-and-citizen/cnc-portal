import express from 'express';
import rateLimit from 'express-rate-limit';
import request from 'supertest';
import { describe, expect, it } from 'vitest';

const makeApp = () => {
  const app = express();
  app.use((req, _res, next) => {
    Object.defineProperty(req, 'ip', { value: req.get('x-test-ip') });
    next();
  });
  app.use(
    rateLimit({ windowMs: 60_000, limit: 1, standardHeaders: 'draft-7', legacyHeaders: false })
  );
  app.get('/', (_req, res) => res.sendStatus(200));
  return app;
};

describe('HTTP rate limiting', () => {
  it('returns 429 after the limit and exposes standard headers', async () => {
    const app = makeApp();
    const first = await request(app).get('/').set('x-test-ip', '192.0.2.1');
    const second = await request(app).get('/').set('x-test-ip', '192.0.2.1');

    expect(first.status).toBe(200);
    expect(second.status).toBe(429);
    expect(second.headers.ratelimit).toBeDefined();
  });

  it('shares the limit across IPv6 addresses in the same /56 subnet', async () => {
    const app = makeApp();
    const first = await request(app).get('/').set('x-test-ip', '2001:db8:1234:5601::1');
    const sameSubnet = await request(app).get('/').set('x-test-ip', '2001:db8:1234:56ff::2');
    const otherSubnet = await request(app).get('/').set('x-test-ip', '2001:db8:1234:5700::1');

    expect(first.status).toBe(200);
    expect(sameSubnet.status).toBe(429);
    expect(otherSubnet.status).toBe(200);
  });
});
