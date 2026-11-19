import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import { zeroAddress, type Address } from 'viem'
import { useOfficerFeeBps, useOfficerIsFeeCollectorToken } from '@/composables/officer/reads'

/** 100 % expressed in basis points — the denominator of every on-chain fee rate. */
const BPS_DENOMINATOR = 10_000n

/**
 * The fee the Bank charges when it transfers `tokenAddress`, and the exact amounts around
 * it. Shared by the transfer and the deposit ("Add fee"), so both compute the same figure.
 *
 * The Bank keeps `fee = amount * feeBps / 10_000`, rounded down like Solidity, on every
 * native transfer and on ERC-20 transfers of FeeCollector-supported tokens only.
 */
export function useBankTransferFee(tokenAddress: MaybeRefOrGetter<Address | undefined>) {
  const { data: feeBpsData } = useOfficerFeeBps('BANK')
  const { data: isFeeCollectorToken } = useOfficerIsFeeCollectorToken(tokenAddress)

  const isTokenCharged = computed(
    () => toValue(tokenAddress) === zeroAddress || isFeeCollectorToken.value === true
  )
  const feeBps = computed(() => (isTokenCharged.value ? Number(feeBpsData.value ?? 0) : 0))
  const hasTransferFee = computed(() => feeBps.value > 0)
  const feeRatio = computed(() => feeBps.value / Number(BPS_DENOMINATOR))
  /** Share of a transfer that reaches the recipient, in basis points. */
  const netShareBps = computed(() => BPS_DENOMINATOR - BigInt(feeBps.value))

  /**
   * Gross amount to transfer so the recipient receives exactly `netAmount`. The floor
   * never falls short, because the fee rounds down, and never overshoots by one unit.
   */
  const grossUpForTransferFee = (netAmount: bigint) =>
    (netAmount * BPS_DENOMINATOR) / netShareBps.value

  /** Largest net amount whose gross-up still fits in `balance`: the inverse of the above. */
  const largestNetWithinBalance = (balance: bigint) =>
    ((balance + 1n) * netShareBps.value - 1n) / BPS_DENOMINATOR

  return { feeBps, hasTransferFee, feeRatio, grossUpForTransferFee, largestNetWithinBalance }
}
