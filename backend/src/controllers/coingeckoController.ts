import { Request, Response } from 'express';
import { CoinGeckoRequest, getCoinGeckoData, MarketDataError } from '../services/coingeckoService';

async function respond(res: Response, request: CoinGeckoRequest) {
  res.set('Cache-Control', 'no-store');
  try {
    res.json(await getCoinGeckoData(request));
  } catch (error) {
    const failure =
      error instanceof MarketDataError
        ? error
        : new MarketDataError(503, 'Market data is unavailable');
    if (failure.retryAfter) res.set('Retry-After', String(failure.retryAfter));
    res.status(failure.status).json({ message: failure.message });
  }
}

export const getCoinMarket = (req: Request, res: Response) =>
  respond(res, { kind: 'coin', coinId: req.params.coinId });
export const getContractMarket = (req: Request, res: Response) =>
  respond(res, { kind: 'contract', address: req.params.address });
export const getCoinHistory = (req: Request, res: Response) =>
  respond(res, { kind: 'history', coinId: req.params.coinId, date: req.query.date as string });
export const getSimplePrices = (req: Request, res: Response) =>
  respond(res, { kind: 'simple', ids: req.query.ids as string });
