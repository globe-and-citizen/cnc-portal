import { type MaybeRefOrGetter, computed, ref, toValue } from 'vue'
import type { TokenConfig } from '@/constant'
import { parseUnits } from 'viem'
import { useBankTransferFee } from '@/composables/bank/useBankTransferFee'

const DECIMAL_AMOUNT = /^(?:\d+\.?\d*|\.\d+)$/

/**
 * Amount a Bank deposit of `token` sends on-chain, in the token's smallest unit.
 *
 * With "Add fee" on, the deposit is topped up with the exact fee the Bank will charge
 * when that same amount is later transferred out, so the transfer empties the deposit:
 * the recipient receives the entered amount, with nothing missing and nothing left over.
 */
export function useBankDepositFee(
  amount: MaybeRefOrGetter<string>,
  token: MaybeRefOrGetter<TokenConfig | undefined>
) {
  const { hasTransferFee, feeRatio, grossUpForTransferFee, largestNetWithinBalance } =
    useBankTransferFee(() => toValue(token)?.address)
  const shouldAddFee = ref(false)
  const isAddingFee = computed(() => shouldAddFee.value && hasTransferFee.value)

  const enteredAmount = computed(() =>
    toTokenUnits(toValue(amount), toValue(token)?.decimals ?? 18)
  )
  const feeAmount = computed(() =>
    isAddingFee.value ? grossUpForTransferFee(enteredAmount.value) - enteredAmount.value : 0n
  )
  const depositAmount = computed(() => enteredAmount.value + feeAmount.value)

  /** Largest amount the user can enter so the deposit, fee included, fits in `balance`. */
  const maxEnteredAmount = (balance: bigint) =>
    isAddingFee.value ? largestNetWithinBalance(balance) : balance

  return {
    shouldAddFee,
    hasTransferFee,
    feeRatio,
    enteredAmount,
    feeAmount,
    depositAmount,
    maxEnteredAmount
  }
}

/** A positive decimal such as `225`, `0.5` or `.5`, judged on the text before any rounding. */
export function isPositiveDecimal(value: string): boolean {
  const trimmed = value.trim()
  return DECIMAL_AMOUNT.test(trimmed) && /[1-9]/.test(trimmed)
}

function toTokenUnits(amount: string, decimals: number): bigint {
  const trimmed = amount.trim()
  return DECIMAL_AMOUNT.test(trimmed) ? parseUnits(trimmed, decimals) : 0n
}
