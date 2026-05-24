import { describe, expect, it } from 'vitest'
import { deploySafeSchema, transferFromSafeSchema } from '../safe.schemas'

const SAFE_ADDRESS = '0x0000000000000000000000000000000000000001'
const OWNER_ADDRESS = '0x0000000000000000000000000000000000000002'
const RECIPIENT_ADDRESS = '0x0000000000000000000000000000000000000003'

describe('safe.schemas', () => {
  describe('deploySafeSchema', () => {
    it('accepts a valid payload', () => {
      const parsed = deploySafeSchema.parse({
        owners: [SAFE_ADDRESS, OWNER_ADDRESS],
        threshold: 2
      })

      expect(parsed).toEqual({
        owners: [SAFE_ADDRESS, OWNER_ADDRESS],
        threshold: 2
      })
    })

    it('rejects invalid owner addresses', () => {
      const result = deploySafeSchema.safeParse({
        owners: ['not-an-address'],
        threshold: 1
      })

      expect(result.success).toBe(false)
      expect(result.error?.issues[0]?.message).toBe('Invalid owner address')
    })

    it('rejects thresholds above owner count', () => {
      const result = deploySafeSchema.safeParse({
        owners: [SAFE_ADDRESS],
        threshold: 2
      })

      expect(result.success).toBe(false)
      expect(result.error?.issues[0]?.message).toBe('Threshold must not exceed owner count')
      expect(result.error?.issues[0]?.path).toEqual(['threshold'])
    })
  })

  describe('transferFromSafeSchema', () => {
    const basePayload = {
      pathParams: { safeAddress: SAFE_ADDRESS },
      body: {
        options: {
          to: RECIPIENT_ADDRESS,
          amount: '1'
        }
      }
    }

    it('parses valid payloads and keeps the tokenId transform aligned', () => {
      const parsed = transferFromSafeSchema.parse({
        ...basePayload,
        body: {
          options: {
            ...basePayload.body.options,
            tokenId: 'usdc'
          }
        }
      })

      expect(parsed.body.options.tokenId).toBe('usdc')
    })

    it('rejects invalid safe addresses', () => {
      const result = transferFromSafeSchema.safeParse({
        ...basePayload,
        pathParams: { safeAddress: 'bad-address' }
      })

      expect(result.success).toBe(false)
      expect(result.error?.issues[0]?.message).toBe('Invalid Safe address')
    })

    it('rejects invalid recipient addresses', () => {
      const result = transferFromSafeSchema.safeParse({
        ...basePayload,
        body: {
          options: {
            ...basePayload.body.options,
            to: 'bad-address'
          }
        }
      })

      expect(result.success).toBe(false)
      expect(result.error?.issues[0]?.message).toBe('Invalid recipient address')
    })

    it('rejects blank amounts before numeric validation', () => {
      const result = transferFromSafeSchema.safeParse({
        ...basePayload,
        body: {
          options: {
            ...basePayload.body.options,
            amount: '   '
          }
        }
      })

      expect(result.success).toBe(false)
      expect(result.error?.issues[0]?.message).toBe('Invalid transfer amount')
    })

    it('rejects unsupported token ids', () => {
      const result = transferFromSafeSchema.safeParse({
        ...basePayload,
        body: {
          options: {
            ...basePayload.body.options,
            tokenId: 'invalid-token'
          }
        }
      })

      expect(result.success).toBe(false)
      expect(result.error?.issues[0]?.message).toBe('Invalid token')
    })

    it('rejects non-positive or non-parseable token amounts', () => {
      const zeroAmount = transferFromSafeSchema.safeParse({
        ...basePayload,
        body: {
          options: {
            ...basePayload.body.options,
            amount: '0'
          }
        }
      })

      expect(zeroAmount.success).toBe(false)
      expect(zeroAmount.error?.issues[0]?.message).toBe('Invalid transfer amount')
      expect(zeroAmount.error?.issues[0]?.path).toEqual(['body', 'options', 'amount'])

      const invalidPrecision = transferFromSafeSchema.safeParse({
        ...basePayload,
        body: {
          options: {
            ...basePayload.body.options,
            amount: '0.0000001',
            tokenId: 'usdc'
          }
        }
      })

      expect(invalidPrecision.success).toBe(false)
      expect(invalidPrecision.error?.issues[0]?.message).toBe('Invalid transfer amount')
    })
  })
})
