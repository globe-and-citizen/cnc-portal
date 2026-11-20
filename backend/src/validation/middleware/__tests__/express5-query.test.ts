import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { validateQuery, validateRequest } from '../validate';

const query = z.object({ page: z.coerce.number().int().positive().default(1) });
const app = express();
app.get('/query', validateQuery(query), (req, res) =>
  res.json({ validated: res.locals.validatedQuery, original: req.query })
);
app.get('/combined', validateRequest(z.object({ query })), (req, res) =>
  res.json({ validated: res.locals.validatedQuery, original: req.query })
);

describe.each(['/query', '/combined'])('validated query on %s', (path) => {
  it('passes coerced and defaulted values to the handler', async () => {
    expect((await request(app).get(path).query({ page: '2', ignored: 'x' })).body).toEqual({
      validated: { page: 2 },
      original: { page: '2', ignored: 'x' },
    });
    expect((await request(app).get(path)).body).toEqual({ validated: { page: 1 }, original: {} });
  });

  it('rejects invalid values', async () => {
    expect((await request(app).get(path).query({ page: '0' })).status).toBe(400);
  });
});

it('uses the Express 5 simple query parser', async () => {
  const parserApp = express();
  parserApp.get('/', (req, res) => res.json(req.query));
  expect((await request(parserApp).get('/?filter[status]=active')).body).toEqual({
    'filter[status]': 'active',
  });
});
