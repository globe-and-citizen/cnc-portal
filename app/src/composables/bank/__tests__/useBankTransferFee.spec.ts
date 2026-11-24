import { type Address, zeroAddress } from 'viem'
import { describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import { useBankTransferFee } from '@/composables/bank/useBankTransferFee'
import { useReadContractFn } from '@/tests/mocks'

const USDC_ADDRESS: Address = '0xA3492D046095AFFE351cFac15de9b86425E235dB'

/** What the Bank contract delivers for `gross`: Solidity rounds the fee down. */
const deliveredAfterFee = (gross: bigint, feeBps: number) =>
  gross - (gross * BigInt(feeBps)) / 10_000n

const mockOfficerReads = (feeBps: number, isFeeCollectorToken: boolean) =>
  useReadContractFn.mockImplementation(({ functionName }: { functionName: string }) => ({
    data: ref(functionName === 'getFeeFor' ? feeBps : isFeeCollectorToken),
    error: ref(null),
    refetch: vi.fn()
  }))

const withNativeFee = (feeBps: number) => {
  mockOfficerReads(feeBps, false)
  return useBankTransferFee(zeroAddress)
}

describe('useBankTransferFee', () => {
  it('adds the exact fee so 225 arrives in full at 0.5 %', () => {
    const { grossUpForTransferFee } = withNativeFee(50)

    const gross = grossUpForTransferFee(225_000_000n)

    expect(gross).toBe(226_130_653n)
    expect(deliveredAfterFee(gross, 50)).toBe(225_000_000n)
  })

  it('returns the amount unchanged when the Bank charges no fee', () => {
    const { hasTransferFee, grossUpForTransferFee } = withNativeFee(0)

    expect(hasTransferFee.value).toBe(false)
    expect(grossUpForTransferFee(225_000_000n)).toBe(225_000_000n)
  })

  it('charges an ERC-20 transfer when the FeeCollector supports the token', () => {
    mockOfficerReads(50, true)

    expect(useBankTransferFee(USDC_ADDRESS).feeBps.value).toBe(50)
  })

  it('[AC-US-BANK-002-03] charges nothing on an ERC-20 the FeeCollector does not support', () => {
    mockOfficerReads(50, false)
    const { hasTransferFee, grossUpForTransferFee } = useBankTransferFee(USDC_ADDRESS)

    expect(hasTransferFee.value).toBe(false)
    expect(grossUpForTransferFee(225_000_000n)).toBe(225_000_000n)
  })

  it('delivers the net amount exactly, with nothing missing or left over, across rates', () => {
    for (const feeBps of [1, 7, 50, 99, 250, 1_000, 3_333, 9_999]) {
      const { grossUpForTransferFee } = withNativeFee(feeBps)
      for (let net = 0n; net < 2_000n; net++) {
        expect(deliveredAfterFee(grossUpForTransferFee(net), feeBps)).toBe(net)
      }
    }
  })

  it('finds the largest amount whose fee still fits in the balance', () => {
    const { largestNetWithinBalance, grossUpForTransferFee } = withNativeFee(50)

    const maxNet = largestNetWithinBalance(3_510_377n)

    expect(maxNet).toBe(3_492_826n)
    expect(grossUpForTransferFee(maxNet)).toBe(3_510_377n)
  })

  it('never lets a larger amount fit than the one it returns, across rates', () => {
    for (const feeBps of [1, 50, 250, 3_333, 9_999]) {
      const { largestNetWithinBalance, grossUpForTransferFee } = withNativeFee(feeBps)
      for (let balance = 0n; balance < 1_000n; balance++) {
        const maxNet = largestNetWithinBalance(balance)
        expect(grossUpForTransferFee(maxNet)).toBeLessThanOrEqual(balance)
        expect(grossUpForTransferFee(maxNet + 1n)).toBeGreaterThan(balance)
      }
    }
  })

  it('leaves the whole balance available when the Bank charges no fee', () => {
    expect(withNativeFee(0).largestNetWithinBalance(3_510_377n)).toBe(3_510_377n)
  })

  it('exposes the rate as a ratio for display', () => {
    expect(withNativeFee(50).feeRatio.value).toBe(0.005)
  })
})
