import { computed, ref, toValue, type MaybeRefOrGetter } from 'vue'
import { getBalance, readContract } from '@wagmi/core'
import type { Address } from 'viem'
import { useQueryClient } from '@tanstack/vue-query'
import { config as wagmiConfig } from '@/wagmi.config'
import { erc20Abi } from 'viem'
import { SUPPORTED_TOKENS } from '@/constant'
import { useTeamStore, useUserDataStore } from '@/stores'
import { classifyError } from '@/utils'
import { contractBalanceKeys } from '@/composables/useContractBalance'
import type { ContractKey } from '@/composables/contracts/errorCatalogs.types'
import { useOwnerWithdrawAllToBank as useCashOwnerWithdrawAll } from '@/composables/cashRemuneration/writes'
import { useOwnerWithdrawAllToBank as useExpenseOwnerWithdrawAll } from '@/composables/expenseAccount/writes'
import { useTransfer, useTransferToken } from '@/composables/bank/writes'
import type { CashOutPlanStep, CashOutStepKey } from './plan'

export type CashOutStepStatus = 'pending' | 'active' | 'success' | 'failed'

/**
 * Live, per-step state tracked while the sequence runs. One entry per planned
 * account; the Bank entry may internally emit several transactions (one per
 * held token), surfaced through `detail`.
 */
export interface CashOutRunStep {
  key: CashOutStepKey
  label: string
  status: CashOutStepStatus
  /** Sub-progress hint, e.g. the token currently being transferred. */
  detail: string
  /** User-facing message when `status === 'failed'`. */
  error: string
}

const CONTRACT_KEY: Record<CashOutStepKey, ContractKey> = {
  cashRemuneration: 'CashRemuneration',
  expense: 'ExpenseAccount',
  bank: 'Bank'
}

/**
 * The three accounts the sequence drains. Each defaults to the team's CURRENT
 * generation; pass explicit addresses to run the same sequence over the
 * contracts of an archived Officer generation.
 */
export interface CashOutSources {
  bank?: MaybeRefOrGetter<Address | undefined>
  cashRemuneration?: MaybeRefOrGetter<Address | undefined>
  expense?: MaybeRefOrGetter<Address | undefined>
}

export interface CashOutOptions {
  sources?: CashOutSources
  /**
   * Where the Bank step forwards the consolidated funds. Defaults to the
   * connected wallet (the "cash out to me" case); the legacy-generation flow
   * points it at the current generation's Bank instead, so the money stays in
   * the team treasury.
   */
  to?: MaybeRefOrGetter<Address | undefined>
}

/**
 * Orchestrates the "Cash out all" sequence.
 *
 * It is a state machine on top of the existing single-purpose contract
 * composables — it coordinates them but never wraps a contract call itself, so
 * each underlying composable stays single-purpose.
 *
 * Behaviour:
 *  - Steps run in the planned order; on the first failure the sequence STOPS
 *    with that step marked `failed`. `retry()` re-runs from the failed step.
 *  - Every step is idempotent on retry: the source sweeps simply re-run, and
 *    the Bank step re-reads live balances so already-emptied tokens are skipped.
 *  - The Bank step reads RAW on-chain balances at execution time (after the
 *    source accounts have consolidated into it) and forwards native + each held
 *    ERC-20 to `options.to` via `transfer` / `transferToken`.
 *
 * The source sweeps always land in the Bank of THEIR OWN generation: on-chain,
 * `ownerWithdrawAllToBank` resolves the Bank through the Officer the contract
 * was deployed by. Only the final Bank → recipient hop is configurable.
 */
export function useCashOutAll(options: CashOutOptions = {}) {
  const teamStore = useTeamStore()
  const userStore = useUserDataStore()
  const queryClient = useQueryClient()

  const bankAddress = computed(
    () =>
      toValue(options.sources?.bank) ??
      (teamStore.getContractAddressByType('Bank') as Address | undefined)
  )
  const recipient = computed(
    () => toValue(options.to) ?? (userStore.address as Address | undefined)
  )

  const cashWithdraw = useCashOwnerWithdrawAll(options.sources?.cashRemuneration)
  const expenseWithdraw = useExpenseOwnerWithdrawAll(options.sources?.expense)
  const bankTransfer = useTransfer(bankAddress)
  const bankTransferToken = useTransferToken(bankAddress)

  const steps = ref<CashOutRunStep[]>([])
  const currentIndex = ref(0)
  const isRunning = ref(false)

  const isComplete = computed(
    () => steps.value.length > 0 && steps.value.every((s) => s.status === 'success')
  )
  const failedStep = computed(() => steps.value.find((s) => s.status === 'failed') ?? null)
  const hasFailed = computed(() => failedStep.value !== null)

  /**
   * Bank step: forward everything the Bank now holds to the recipient. Reads
   * happen here (not up front) so they include what the source accounts just
   * consolidated.
   */
  async function executeBankStep(step: CashOutRunStep) {
    const bank = bankAddress.value
    const to = recipient.value
    if (!bank) throw new Error('Bank address is undefined')
    if (!to) throw new Error('Recipient address is undefined')

    // Native balance first.
    const native = await getBalance(wagmiConfig, { address: bank })
    if (native.value > 0n) {
      step.detail = `Transferring ${native.symbol}…`
      await bankTransfer.mutateAsync({ args: [to, native.value] })
    }

    // Then each supported ERC-20 the Bank holds.
    const erc20s = SUPPORTED_TOKENS.filter((token) => token.id !== 'native')
    for (const token of erc20s) {
      const balance = (await readContract(wagmiConfig, {
        address: token.address,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [bank]
      })) as bigint
      if (balance > 0n) {
        step.detail = `Transferring ${token.symbol}…`
        await bankTransferToken.mutateAsync({ args: [token.address, to, balance] })
      }
    }

    step.detail = ''
  }

  async function executeStep(step: CashOutRunStep) {
    switch (step.key) {
      case 'cashRemuneration':
        await cashWithdraw.mutateAsync({ args: [] })
        break
      case 'expense':
        await expenseWithdraw.mutateAsync({ args: [] })
        break
      case 'bank':
        await executeBankStep(step)
        break
    }
  }

  /**
   * One-shot refresh of every contract balance touched by the flow.
   *
   * The sequence moves funds between several contracts, so rather than name
   * each one we sweep the whole `balance` family plus the contract reads that
   * `useContractWritesV3` scopes to a single written address.
   */
  async function refreshBalances() {
    await queryClient.invalidateQueries({
      predicate: (query) => {
        const key = query.queryKey
        return (
          Array.isArray(key) && (key[0] === contractBalanceKeys.all[0] || key[0] === 'readContract')
        )
      }
    })
  }

  async function run() {
    isRunning.value = true
    try {
      while (currentIndex.value < steps.value.length) {
        const step = steps.value[currentIndex.value]
        if (!step) break
        step.status = 'active'
        step.error = ''
        try {
          await executeStep(step)
          step.status = 'success'
          currentIndex.value++
        } catch (error: unknown) {
          const classified = classifyError(error, { contract: CONTRACT_KEY[step.key] })
          step.status = 'failed'
          step.detail = ''
          step.error =
            classified.category === 'user_rejected'
              ? 'You rejected the request.'
              : classified.userMessage
          return
        }
      }
      await refreshBalances()
    } finally {
      isRunning.value = false
    }
  }

  /** Initialise the sequence from a plan and run it to the first failure. */
  async function start(plan: CashOutPlanStep[]) {
    steps.value = plan.map((step) => ({
      key: step.key,
      label: step.label,
      status: 'pending',
      detail: '',
      error: ''
    }))
    currentIndex.value = 0
    if (steps.value.length === 0) return
    await run()
  }

  /** Re-run from the currently failed step, then continue the sequence. */
  async function retry() {
    const step = steps.value[currentIndex.value]
    if (!step || step.status !== 'failed') return
    step.status = 'pending'
    step.error = ''
    await run()
  }

  function reset() {
    steps.value = []
    currentIndex.value = 0
    isRunning.value = false
  }

  return {
    steps,
    currentIndex,
    isRunning,
    isComplete,
    hasFailed,
    failedStep,
    start,
    retry,
    reset
  }
}
