import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import {
  getCoinMarket,
  getContractMarket,
  getCoinHistory,
  getSimplePrices,
} from '../controllers/coingeckoController';
import { validateParamsAndQuery, validateQuery } from '../validation/middleware/validate';
import {
  coinParams,
  contractParams,
  emptyMarketQuery,
  historyQuery,
  simplePriceQuery,
} from '../validation/schemas/coingecko';

const router = Router();
// Market data also powers pre-login currency display; quota admission is shared in Redis.
router.use(
  rateLimit({ windowMs: 60000, limit: 120, standardHeaders: 'draft-7', legacyHeaders: false })
);

router.get('/simple/price', validateQuery(simplePriceQuery), getSimplePrices);
router.get(
  '/coins/polygon-pos/contract/:address',
  validateParamsAndQuery(contractParams, emptyMarketQuery),
  getContractMarket
);
router.get(
  '/coins/:coinId/history',
  validateParamsAndQuery(coinParams, historyQuery),
  getCoinHistory
);
router.get('/coins/:coinId', validateParamsAndQuery(coinParams, emptyMarketQuery), getCoinMarket);

export default router;
