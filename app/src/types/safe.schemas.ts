import { isAddress } from 'viem'
import { z } from 'zod'
import { isValidPositiveTokenAmount, isSupportedTokenId } from '@/utils/constantUtil'
import type { TokenId } from '@/constant'

export const deploySafeSchema = z
  .object({
    owners: z
      .array(z.string().refine((value) => isAddress(value), { message: 'Invalid owner address' }))
      .min(1, { message: 'At least one owner required' }),
    threshold: z.number().int().positive()
  })
  .refine(({ owners, threshold }) => threshold <= owners.length, {
    message: 'Threshold must not exceed owner count',
    path: ['threshold']
  })

export const transferFromSafeSchema = z.object({
  pathParams: z.object({
    safeAddress: z.string().refine((value) => isAddress(value), { message: 'Invalid Safe address' })
  }),
  body: z.object({
    options: z
      .object({
        to: z
          .string()
          .refine((value) => isAddress(value), { message: 'Invalid recipient address' }),
        amount: z
          .string()
          .refine((value) => value.trim().length > 0, { message: 'Invalid transfer amount' }),
        tokenId: z
          .string()
          .optional()
          .refine((value) => value === undefined || isSupportedTokenId(value), {
            message: 'Invalid token'
          })
          .transform((value) => value as TokenId | undefined)
      })
      .refine(({ amount, tokenId = 'native' }) => isValidPositiveTokenAmount(amount, tokenId), {
        message: 'Invalid transfer amount',
        path: ['amount']
      })
  })
})
