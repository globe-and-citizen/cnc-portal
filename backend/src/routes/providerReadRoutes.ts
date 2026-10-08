import express, { Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { safeReads, marketReads } from '../services/providerReads';
import { ProviderReadError } from '../services/providerReads/store';
import { requireAdmin } from '../middleware/roleMiddleware';
import { prisma } from '../utils/dependenciesUtil';

const routes = express.Router();
// Authentication is installed at the server boundary; quotas are per authenticated caller.
routes.use(rateLimit({ windowMs: 60_000, max: 120, keyGenerator: (req) => req.address }));

/**
 * @openapi
 * /external/metrics:
 *   get:
 *     summary: Inspect shared provider request counters and cooldowns
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Provider budgets without keys or lease tokens }
 *       403: { description: Administrator role required }
 */
routes.get('/metrics', requireAdmin, (_req, res) =>
  respond(res, () =>
    prisma.providerReadBudget.findMany({
      select: {
        provider: true,
        requestCount: true,
        limitedCount: true,
        nextRequestAt: true,
        blockedUntil: true,
        lastRequestAt: true,
      },
    })
  )
);

/**
 * @openapi
 * /external/safe/{chainId}/cache/{address}:
 *   delete:
 *     summary: Invalidate public read caches after a completed Safe operation
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: chainId, required: true, schema: { type: integer } }
 *       - { in: path, name: address, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Read cache invalidated; no transaction is executed }
 *       400: { description: Invalid network or address }
 */
routes.delete('/safe/:chainId/cache/:address', (req, res) =>
  respond(res, async () => {
    if (!/^\d+$/.test(req.params.chainId) || !/^0x[0-9a-fA-F]{40}$/.test(req.params.address)) {
      throw new ProviderReadError(400, 0, 'invalid-safe-identity');
    }
    await safeReads.invalidate(Number(req.params.chainId), req.params.address);
    return { invalidated: true };
  })
);

const queryParams = (req: Request) => {
  const result = new URLSearchParams();
  for (const [key, value] of Object.entries(req.query)) {
    if (typeof value !== 'string' || value.length > 1000)
      throw new ProviderReadError(400, 0, 'invalid-query');
    result.set(key, value);
  }
  return result;
};

async function respond(res: Response, work: () => Promise<unknown>) {
  res.set('Cache-Control', 'private, no-store');
  res.append('Access-Control-Expose-Headers', 'Retry-After');
  try {
    res.json(await work());
  } catch (error) {
    const failure = error instanceof ProviderReadError ? error : new ProviderReadError(503, 2);
    if (failure.retryAfter) res.set('Retry-After', String(failure.retryAfter));
    res.status(failure.status).json({ error: failure.reason, retryAfter: failure.retryAfter });
  }
}

/**
 * @openapi
 * /external/safe/{chainId}/{resource}:
 *   get:
 *     summary: Read an allowlisted public Safe resource through the coordinated backend cache
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: chainId, required: true, schema: { type: integer } }
 *       - { in: path, name: resource, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Complete cached Safe response }
 *       400: { description: Unsupported network, path or query }
 *       429: { description: Provider quota or cooldown; observe Retry-After }
 *       503: { description: Read pending or coordination unavailable }
 */
routes.get('/safe/:chainId/*', (req, res) =>
  respond(res, async () => {
    if (!/^\d+$/.test(req.params.chainId)) throw new ProviderReadError(400, 0, 'invalid-network');
    return safeReads.read(
      Number(req.params.chainId),
      (req.params as Record<string, string>)['0'],
      queryParams(req)
    );
  })
);

/**
 * @openapi
 * /external/market/{resource}:
 *   get:
 *     summary: Read batched current prices, contract metadata or immutable historical USD prices
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: resource, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Provider market data }
 *       400: { description: Unsupported resource or invalid query }
 *       404: { description: Provider has no matching resource; temporarily negative-cached }
 *       429: { description: Provider quota or cooldown; observe Retry-After }
 */
routes.get('/market/*', (req, res) =>
  respond(res, () =>
    marketReads.read((req.params as Record<string, string>)['0'], queryParams(req))
  )
);

export default routes;
