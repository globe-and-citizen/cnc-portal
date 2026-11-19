import type {
  coinParams,
  contractParams,
  historyQuery,
  simplePriceQuery,
} from '../validation/schemas/coingecko';
import type { z } from 'zod';
import { Request, Response } from 'express';
import { CoinGeckoRequest, getCoinGeckoData, MarketDataError } from '../services/coingeckoService';
import { captureBackendException } from '../utils';

type CoinParams = z.infer<typeof coinParams>;
type ContractParams = z.infer<typeof contractParams>;
type HistoryQuery = z.infer<typeof historyQuery>;
type SimplePriceQuery = z.infer<typeof simplePriceQuery>;

async function respond(res: Response, request: CoinGeckoRequest) {
  res.set('Cache-Control', 'no-store');
  try {
    res.json(await getCoinGeckoData(request));
  } catch (error) {
    const failure =
      error instanceof MarketDataError
        ? error
        : new MarketDataError(503, 'Market data is unavailable');
    if (failure.status >= 500) {
      captureBackendException(error, {
        operation: request.kind,
        source: 'coingeckoController',
        status: failure.status,
      });
    }
    if (failure.retryAfter) res.set('Retry-After', String(failure.retryAfter));
    res.status(failure.status).json({ message: failure.message });
  }
}

export const getCoinMarket = (req: Request<CoinParams>, res: Response) =>
  respond(res, { kind: 'coin', coinId: req.params.coinId });
export const getContractMarket = (req: Request<ContractParams>, res: Response) =>
  respond(res, { kind: 'contract', address: req.params.address });
export const getCoinHistory = (req: Request<CoinParams>, res: Response) =>
  respond(res, {
    kind: 'history',
    coinId: req.params.coinId,
    date: (res.locals.validatedQuery as HistoryQuery).date,
  });
export const getSimplePrices = (req: Request, res: Response) =>
  respond(res, {
    kind: 'simple',
    ids: (res.locals.validatedQuery as SimplePriceQuery).ids,
  });
