import { z } from 'zod';

const coinId = z
  .string()
  .min(1)
  .max(128)
  .regex(/^[a-zA-Z0-9_+.-]+$/)
  .refine((id) => id !== '.' && id !== '..', 'Coin ID cannot be a path segment')
  .transform((id) => id.toLowerCase());
export const coinParams = z.strictObject({ coinId });
export const contractParams = z.strictObject({
  address: z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/)
    .transform((address) => address.toLowerCase()),
});
export const emptyMarketQuery = z.strictObject({});
export const historyQuery = z.strictObject({
  date: z.iso
    .date()
    .refine(
      (date) => date <= new Date().toISOString().slice(0, 10),
      'Future historical dates are unavailable'
    ),
  localization: z.literal('false').optional(),
});
export const simplePriceQuery = z.strictObject({
  ids: z
    .string()
    .max(3200)
    .transform((ids) => ids.split(','))
    .pipe(z.array(coinId).min(1).max(25))
    .transform((ids) => [...new Set(ids)].sort().join(',')),
  vs_currencies: z.literal('usd'),
});
