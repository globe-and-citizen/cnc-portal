<template>
  <UTooltip :text="blockedReason">
    <UButton
      color="warning"
      variant="outline"
      size="sm"
      icon="i-heroicons-banknotes"
      :disabled="!!blockedReason"
      data-test="legacy-withdraw-button"
      label="Withdraw funds"
      @click="openModal"
    />
  </UTooltip>

  <UModal
    v-if="modal.mount"
    v-model:open="modal.show"
    title="Withdraw funds from this generation"
    :description="
      phase === 'review'
        ? 'Review what will be moved back into the current treasury before signing.'
        : 'Each account is a separate transaction to confirm in your wallet.'
    "
    :close="phase === 'progress' && cashOut.isRunning.value ? false : { onClick: closeModal }"
  >
    <template #body>
      <!-- Review phase -->
      <div v-if="phase === 'review'" class="space-y-4" data-test="legacy-withdraw-review">
        <UAlert
          v-if="canSweepSources"
          color="warning"
          variant="soft"
          icon="i-heroicons-exclamation-triangle"
          title="This empties the archived accounts into your current Bank."
          description="The old Cash Remuneration and Expense Account first sweep into the Bank of their own generation, then that Bank forwards everything to the Bank this team uses today. You will sign one transaction per account (the Bank may need one signature per token)."
        />
        <UAlert
          v-else
          color="warning"
          variant="soft"
          icon="i-heroicons-exclamation-triangle"
          title="Only this generation's Bank can be emptied automatically."
          :description="`Contracts from generation ${folder} predate the owner withdrawal added in V1, so the Expense Account and Cash Remuneration can only be emptied by hand — with a budget approval and a signed wage claim. The Bank forwards to the Bank this team uses today (one signature per token).`"
          data-test="legacy-withdraw-bank-only-notice"
        />

        <div
          class="divide-y divide-gray-100 rounded-lg border border-gray-200 dark:divide-gray-800 dark:border-gray-800"
        >
          <div
            v-for="row in reviewRows"
            :key="row.key"
            class="flex items-center justify-between px-3 py-2 text-sm"
            :data-test="`legacy-withdraw-review-${row.key}`"
          >
            <span class="text-gray-500 dark:text-gray-400">{{ row.label }}</span>
            <span class="font-medium">{{ row.value }}</span>
          </div>
          <div
            class="flex items-center justify-between px-3 py-2 text-sm"
            data-test="legacy-withdraw-review-destination"
          >
            <span class="font-medium">Old Bank → current Bank</span>
            <span class="font-semibold">~{{ projectedFormatted }}</span>
          </div>
        </div>

        <!-- What this run will NOT reach, so the owner does not read a green
             "complete" as "the generation is empty now". -->
        <div
          v-if="strandedRows.length"
          class="rounded-lg border border-dashed border-gray-300 px-3 py-2 dark:border-gray-700"
          data-test="legacy-withdraw-stranded"
        >
          <p class="mb-1 text-xs font-medium text-gray-500 dark:text-gray-400">
            Stays behind — move these by hand
          </p>
          <div
            v-for="row in strandedRows"
            :key="row.key"
            class="flex items-center justify-between py-1 text-sm"
            :data-test="`legacy-withdraw-stranded-${row.key}`"
          >
            <span class="text-gray-500 dark:text-gray-400">{{ row.label }}</span>
            <span class="font-medium">{{ row.value }}</span>
          </div>
        </div>

        <div class="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          <span>Destination</span>
          <AddressTooltip v-if="destination" :address="destination" class="text-xs" />
        </div>

        <p class="text-xs text-gray-500 dark:text-gray-400">
          The Bank charges a small transfer fee, so the received amount is slightly lower.
        </p>

        <div class="flex justify-end gap-2">
          <UButton
            color="neutral"
            variant="outline"
            data-test="legacy-withdraw-cancel"
            @click="closeModal"
          >
            Cancel
          </UButton>
          <UButton
            color="warning"
            :disabled="!hasAnyBalance"
            data-test="legacy-withdraw-confirm"
            label="Withdraw funds"
            @click="confirm"
          />
        </div>
      </div>

      <!-- Progress phase -->
      <div v-else class="space-y-4" data-test="legacy-withdraw-progress">
        <CashOutStepList :steps="cashOut.steps.value" test-prefix="legacy-withdraw" />

        <UAlert
          v-if="cashOut.isComplete.value"
          color="success"
          variant="soft"
          icon="i-heroicons-check-circle"
          title="Withdrawal complete"
          :description="completionDescription"
          data-test="legacy-withdraw-complete"
        />

        <div class="flex justify-end gap-2">
          <UButton
            v-if="cashOut.hasFailed.value"
            color="warning"
            :loading="cashOut.isRunning.value"
            data-test="legacy-withdraw-retry"
            label="Retry"
            @click="retry"
          />
          <UButton
            color="neutral"
            variant="outline"
            :disabled="cashOut.isRunning.value"
            data-test="legacy-withdraw-done"
            :label="cashOut.isComplete.value ? 'Done' : 'Close'"
            @click="closeModal"
          />
        </div>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Address } from 'viem'
import { useToast } from '@nuxt/ui/composables'
import AddressTooltip from '@/components/ui/AddressTooltip.vue'
import CashOutStepList from '@/components/CashOutStepList.vue'
import { useContractBalance } from '@/composables/useContractBalance'
import { useBankOwner } from '@/composables/bank/reads'
import {
  buildLegacyWithdrawPlan,
  legacyGenerationAddresses,
  supportsOwnerWithdrawAll,
  useCashOutAll
} from '@/composables/cashOut'
import { useOfficerBeaconFolderQuery } from '@/composables/contracts/useOfficerBeaconFolder'
import { TEAM_ARCHIVED_TOOLTIP, useTeamWriteGuard } from '@/composables/useTeamWriteGuard'
import { useCurrencyStore, useTeamStore, useUserDataStore } from '@/stores'
import { formatCurrencyShort } from '@/utils/currencyUtil'

/**
 * Drains the contracts of ONE archived Officer generation back into the team's
 * current Bank. Rendered per legacy generation card, so every instance owns its
 * own balances, version resolution and run state.
 */
const props = defineProps<{
  /** Officer that governs this generation — identifies it on-chain. */
  officerAddress: string
  /** Contracts this generation deployed, as returned by GET /contract/officers. */
  contracts: ReadonlyArray<{ address: string; type: string }>
}>()

const teamStore = useTeamStore()
const userStore = useUserDataStore()
const currencyStore = useCurrencyStore()
const { isWriteDisabled } = useTeamWriteGuard()
const toast = useToast()

const addresses = computed(() => legacyGenerationAddresses(props.contracts))
const bankAddress = computed(() => addresses.value.bank as Address | undefined)
const expenseAddress = computed(() => addresses.value.expense as Address | undefined)
const cashRemAddress = computed(() => addresses.value.cashRemuneration as Address | undefined)

/** Where the funds land: the Bank of the generation the team runs today. */
const destination = computed(
  () => teamStore.getContractAddressByType('Bank') as Address | undefined
)

// `ownerWithdrawAllToBank` only exists from V1 on, and a generation's proxies
// sit behind frozen beacons — so the generation, not the team, decides whether
// the source accounts can be swept. The Bank hop works on every generation.
const {
  folder,
  isPending: isResolvingVersion,
  isError: versionResolutionFailed
} = useOfficerBeaconFolderQuery(computed(() => props.officerAddress))

const canSweepSources = computed(() => supportsOwnerWithdrawAll(folder.value))

const bankBalance = useContractBalance(bankAddress)
const expenseBalance = useContractBalance(expenseAddress)
const cashRemBalance = useContractBalance(cashRemAddress)

const { data: bankOwner } = useBankOwner(bankAddress)

const currencyCode = computed(() => currencyStore.localCurrency.code)
const fiat = (balance: ReturnType<typeof useContractBalance>) =>
  balance.data.value?.total.local.value ?? 0
const fiatFormatted = (balance: ReturnType<typeof useContractBalance>) =>
  balance.data.value?.total.local.formatted ?? '—'

const isOwner = computed(() => {
  if (!bankOwner.value || !userStore.address) return false
  return String(bankOwner.value).toLowerCase() === userStore.address.toLowerCase()
})

const balancesFiat = computed(() => ({
  cashRemuneration: cashRemAddress.value ? fiat(cashRemBalance) : 0,
  expense: expenseAddress.value ? fiat(expenseBalance) : 0,
  bank: fiat(bankBalance)
}))

const plan = computed(() =>
  buildLegacyWithdrawPlan(balancesFiat.value, { canSweepSources: canSweepSources.value })
)
const hasAnyBalance = computed(() => plan.value.length > 0)

/**
 * Why the button is unavailable, or `undefined` when it is actionable. Doubles
 * as the tooltip text, so every disabled state explains itself instead of
 * leaving the owner guessing.
 */
const blockedReason = computed(() => {
  if (!bankAddress.value) return 'This generation has no Bank to withdraw through'
  if (!destination.value) return 'This team has no current Bank to receive the funds'
  if (destination.value.toLowerCase() === bankAddress.value.toLowerCase())
    return 'This generation already holds the current Bank'
  if (isResolvingVersion.value) return 'Checking which contract generation this is…'
  if (versionResolutionFailed.value) return 'Could not read this generation from the chain'
  if (!isOwner.value) return 'Only the owner of these contracts can withdraw'
  if (isWriteDisabled.value) return TEAM_ARCHIVED_TOOLTIP
  if (!hasAnyBalance.value)
    return canSweepSources.value
      ? 'These contracts hold no funds'
      : `Contracts from generation ${folder.value} can only have their Bank emptied, and it is empty`
  return undefined
})

const cashOut = useCashOutAll({
  sources: {
    bank: bankAddress,
    // A generation that cannot sweep its source accounts must not be handed
    // their addresses: the sequence would call a function their proxies do not
    // implement.
    expense: computed(() => (canSweepSources.value ? expenseAddress.value : undefined)),
    cashRemuneration: computed(() => (canSweepSources.value ? cashRemAddress.value : undefined))
  },
  to: destination
})

const modal = ref({ mount: false, show: false })
const phase = ref<'review' | 'progress'>('review')

/** The source accounts, whether or not this generation can sweep them. */
const sourceRows = computed(() => {
  const rows: { key: string; label: string; value: string; amount: number }[] = []
  if (balancesFiat.value.cashRemuneration > 0)
    rows.push({
      key: 'cashRemuneration',
      label: 'Cash Remuneration',
      value: fiatFormatted(cashRemBalance),
      amount: balancesFiat.value.cashRemuneration
    })
  if (balancesFiat.value.expense > 0)
    rows.push({
      key: 'expense',
      label: 'Expense Account',
      value: fiatFormatted(expenseBalance),
      amount: balancesFiat.value.expense
    })
  return rows
})

/** What this run moves — the Bank always, the source accounts when sweepable. */
const reviewRows = computed(() => {
  const rows = canSweepSources.value ? [...sourceRows.value] : []
  if (balancesFiat.value.bank > 0)
    rows.push({
      key: 'bank',
      label: 'Bank',
      value: fiatFormatted(bankBalance),
      amount: balancesFiat.value.bank
    })
  return rows
})

/** What this run leaves on-chain, so a green "complete" is never misread. */
const strandedRows = computed(() => (canSweepSources.value ? [] : sourceRows.value))

const completionDescription = computed(() =>
  strandedRows.value.length
    ? "This generation's Bank is now empty. Its Expense Account and Cash Remuneration still hold funds — move those by hand."
    : "Everything this generation still held is now in the team's current Bank."
)

const projectedFormatted = computed(() =>
  formatCurrencyShort(
    reviewRows.value.reduce((total, row) => total + row.amount, 0),
    currencyCode.value
  )
)

const openModal = () => {
  if (blockedReason.value) return
  cashOut.reset()
  phase.value = 'review'
  modal.value = { mount: true, show: true }
}

const closeModal = () => {
  modal.value = { mount: false, show: false }
  phase.value = 'review'
  cashOut.reset()
}

const confirm = async () => {
  phase.value = 'progress'
  await cashOut.start(plan.value)
  if (cashOut.isComplete.value) {
    toast.add({ title: 'Legacy funds moved to the current Bank', color: 'success' })
  }
}

const retry = () => cashOut.retry()
</script>
