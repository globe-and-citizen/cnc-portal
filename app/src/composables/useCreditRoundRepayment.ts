import { computed, ref, type ComputedRef } from 'vue'
import { useQueryClient } from '@tanstack/vue-query'
import { formatUnits, parseUnits, zeroAddress } from 'viem'
import { useBankAddress, useBankOwner } from '@/composables/bank/reads'
import { useFundFixedReturnRepayment } from '@/composables/bank/writes'
import { useErc20BalanceOf } from '@/composables/erc20/reads'
import { useUserDataStore } from '@/stores'
import {
  classifyError,
  decimalsForFixedReturnToken,
  isBankOwner,
  roundToDisplayPrecision
} from '@/utils'
import type { CreditRound, LendingOfferStruct, RoundStatus } from '@/types'
import type { RepayBreakdownRow } from '@/components/sections/CommunityCreditView/CreditRepayBreakdownTable.vue'

interface CreditRoundOfferQuery {
  offer: ComputedRef<LendingOfferStruct | undefined>
  refetch: () => void
}

interface UseCreditRoundRepaymentOptions {
  offerId: ComputedRef<bigint>
  round: ComputedRef<CreditRound | undefined>
  repaymentRows: ComputedRef<RepayBreakdownRow[]>
  offerQuery: CreditRoundOfferQuery
}

interface CreditRoundRepaymentOutcome {
  amount: number
  isFullRepayment: boolean
}

const REPAYABLE_STATUSES: RoundStatus[] = ['funded', 'active', 'overdue']

/**
 * Reactive Bank/FixedReturn repayment boundary for one already-resolved credit round.
 * The caller retains route ownership and decides how a successful outcome is presented.
 */
export function useCreditRoundRepayment({
  offerId,
  round,
  repaymentRows,
  offerQuery
}: UseCreditRoundRepaymentOptions) {
  const queryClient = useQueryClient()
  const userStore = useUserDataStore()
  const bankAddress = useBankAddress()
  const { data: bankOwner } = useBankOwner()
  const repayResult = useFundFixedReturnRepayment()
  const errorMessage = ref<string | null>(null)
  const decimals = computed(() =>
    offerQuery.offer.value ? (decimalsForFixedReturnToken(offerQuery.offer.value.token) ?? 6) : 6
  )
  const outstanding = computed(() => {
    const total = repaymentRows.value.reduce((sum, lender) => sum + lender.total, 0)
    const repaid = offerQuery.offer.value
      ? Number(formatUnits(offerQuery.offer.value.totalRepaidByIssuer, decimals.value))
      : 0
    return Math.max(0, roundToDisplayPrecision(total - repaid))
  })
  const tokenAddress = computed(() => offerQuery.offer.value?.token ?? zeroAddress)
  const { data: treasuryBalanceRaw, refetch: refetchTreasuryBalance } = useErc20BalanceOf(
    tokenAddress,
    computed(() => bankAddress.value ?? zeroAddress)
  )
  const treasuryBalance = computed(() =>
    typeof treasuryBalanceRaw.value === 'bigint'
      ? Number(formatUnits(treasuryBalanceRaw.value, decimals.value))
      : null
  )
  const canRepayViaBank = computed(() => isBankOwner(bankOwner.value, userStore.address))
  const submission = computed(() => ({
    isSubmitting: repayResult.isPending.value,
    errorMessage: errorMessage.value
  }))
  const presentation = computed(() => ({
    outstanding: outstanding.value,
    treasuryBalance: treasuryBalance.value,
    canRepayViaBank: canRepayViaBank.value,
    submission: submission.value
  }))
  const isRepayable = computed(
    () => !!round.value && REPAYABLE_STATUSES.includes(round.value.status)
  )

  async function repay(amount: string): Promise<CreditRoundRepaymentOutcome | null> {
    if (!bankAddress.value || !round.value || !isRepayable.value || !canRepayViaBank.value) {
      return null
    }

    let amountUnits: bigint
    try {
      amountUnits = parseUnits(amount, decimals.value)
    } catch {
      return null
    }
    if (amountUnits <= 0n) return null

    errorMessage.value = null
    const numericAmount = Number(amount)

    try {
      await repayResult.mutateAsync({ args: [offerId.value, amountUnits] })
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['fixedReturnAllOffers'] }),
        queryClient.invalidateQueries({ queryKey: ['fixedReturnOfferLenders'] }),
        queryClient.invalidateQueries({ queryKey: ['fixedReturnMyLenderPositions'] }),
        queryClient.invalidateQueries({ queryKey: ['fixed-return-events-logs'] })
      ])
      offerQuery.refetch()
      refetchTreasuryBalance()
      return {
        amount: numericAmount,
        isFullRepayment: numericAmount >= outstanding.value
      }
    } catch (error) {
      errorMessage.value = classifyError(error, { contract: 'Bank' }).userMessage
      return null
    }
  }

  return { presentation, repay }
}
