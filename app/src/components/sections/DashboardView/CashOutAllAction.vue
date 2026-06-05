<template>
  <div v-if="isOwner" class="flex justify-end">
    <TeamArchivedTooltip v-slot="{ disabled: archivedDisabled }">
      <UButton
        color="warning"
        icon="i-heroicons-banknotes"
        :disabled="!hasAnyBalance || cashOut.isRunning.value || archivedDisabled"
        data-test="cash-out-all-button"
        label="Cash out all"
        @click="openModal"
      />
    </TeamArchivedTooltip>

    <UModal
      v-if="modal.mount"
      v-model:open="modal.show"
      title="Cash out all accounts"
      :description="
        phase === 'review'
          ? 'Review what will be withdrawn before signing.'
          : 'Each account is a separate transaction to confirm in your wallet.'
      "
      :close="phase === 'progress' && cashOut.isRunning.value ? false : { onClick: closeModal }"
    >
      <template #body>
        <!-- Review phase -->
        <div v-if="phase === 'review'" class="space-y-4" data-test="cash-out-review">
          <UAlert
            color="warning"
            variant="soft"
            icon="i-heroicons-exclamation-triangle"
            title="This empties your treasury to your wallet."
            description="Cash Remuneration and Expense funds are first moved into the Bank, then the whole Bank balance is sent to your connected wallet. You will sign one transaction per account (the Bank may need one signature per token)."
          />

          <div
            class="divide-y divide-gray-100 rounded-lg border border-gray-200 dark:divide-gray-800 dark:border-gray-800"
          >
            <div
              v-for="row in reviewRows"
              :key="row.label"
              class="flex items-center justify-between px-3 py-2 text-sm"
              :data-test="`cash-out-review-${row.key}`"
            >
              <span class="text-gray-500 dark:text-gray-400">{{ row.label }}</span>
              <span class="font-medium">{{ row.value }}</span>
            </div>
            <div
              class="flex items-center justify-between px-3 py-2 text-sm"
              data-test="cash-out-review-bank"
            >
              <span class="font-medium">Bank → your wallet</span>
              <span class="font-semibold">~{{ projectedBankFormatted }}</span>
            </div>
          </div>

          <p class="text-xs text-gray-500 dark:text-gray-400">
            The Bank charges a small transfer fee, so the received amount is slightly lower.
          </p>

          <div class="flex justify-end gap-2">
            <UButton
              color="neutral"
              variant="outline"
              data-test="cash-out-all-cancel"
              @click="closeModal"
            >
              Cancel
            </UButton>
            <UButton
              color="warning"
              :disabled="!hasAnyBalance"
              data-test="cash-out-all-confirm"
              label="Cash out all"
              @click="confirm"
            />
          </div>
        </div>

        <!-- Progress phase -->
        <div v-else class="space-y-4" data-test="cash-out-progress">
          <ul class="space-y-2">
            <li
              v-for="step in cashOut.steps.value"
              :key="step.key"
              class="flex items-start gap-3 rounded-lg border border-gray-200 px-3 py-2 dark:border-gray-800"
              :data-test="`cash-out-step-${step.key}`"
            >
              <UIcon
                :name="stepIcon(step.status)"
                :class="['mt-0.5 size-5 shrink-0', stepIconClass(step.status)]"
              />
              <div class="min-w-0 flex-1">
                <p class="font-medium">{{ step.label }}</p>
                <p v-if="step.status === 'active' && step.detail" class="text-xs text-gray-500">
                  {{ step.detail }}
                </p>
                <p
                  v-if="step.status === 'failed' && step.error"
                  class="text-error text-xs"
                  :data-test="`cash-out-error-${step.key}`"
                >
                  {{ step.error }}
                </p>
              </div>
            </li>
          </ul>

          <UAlert
            v-if="cashOut.isComplete.value"
            color="success"
            variant="soft"
            icon="i-heroicons-check-circle"
            title="Cash out complete"
            description="All available funds were sent to your wallet."
            data-test="cash-out-complete"
          />

          <div class="flex justify-end gap-2">
            <UButton
              v-if="cashOut.hasFailed.value"
              color="warning"
              :loading="cashOut.isRunning.value"
              data-test="cash-out-all-retry"
              label="Retry"
              @click="retry"
            />
            <UButton
              color="neutral"
              variant="outline"
              :disabled="cashOut.isRunning.value"
              data-test="cash-out-all-done"
              :label="cashOut.isComplete.value ? 'Done' : 'Close'"
              @click="closeModal"
            />
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Address } from 'viem'
import { useContractBalance } from '@/composables'
import { useBankOwner } from '@/composables/bank/reads'
import { buildCashOutPlan, useCashOutAll } from '@/composables/cashOut'
import type { CashOutStepStatus } from '@/composables/cashOut'
import { useCurrencyStore, useTeamStore, useUserDataStore } from '@/stores'
import { formatCurrencyShort } from '@/utils/currencyUtil'
import TeamArchivedTooltip from '@/components/TeamArchivedTooltip.vue'

const teamStore = useTeamStore()
const userStore = useUserDataStore()
const currencyStore = useCurrencyStore()
const toast = useToast()

const bankAddress = computed(() => teamStore.getContractAddressByType('Bank'))
const cashRemAddress = computed(() => teamStore.getContractAddressByType('CashRemunerationEIP712'))
const expenseAddress = computed(() => teamStore.getContractAddressByType('ExpenseAccountEIP712'))

const bankBalance = useContractBalance(bankAddress as unknown as Address)
const cashRemBalance = useContractBalance(cashRemAddress as unknown as Address)
const expenseBalance = useContractBalance(expenseAddress as unknown as Address)

const { data: bankOwner } = useBankOwner()

const currencyCode = computed(() => currencyStore.localCurrency.code)
const fiat = (balance: ReturnType<typeof useContractBalance>) =>
  balance.total.value[currencyCode.value]?.value ?? 0
const fiatFormatted = (balance: ReturnType<typeof useContractBalance>) =>
  balance.total.value[currencyCode.value]?.formated ?? '—'

const isOwner = computed(() => {
  if (!bankOwner.value || !userStore.address) return false
  return String(bankOwner.value).toLowerCase() === userStore.address.toLowerCase()
})

const balancesFiat = computed(() => ({
  cashRemuneration: fiat(cashRemBalance),
  expense: fiat(expenseBalance),
  bank: fiat(bankBalance)
}))

const plan = computed(() => buildCashOutPlan(balancesFiat.value))
const hasAnyBalance = computed(() => plan.value.length > 0)

const projectedBankFormatted = computed(() =>
  formatCurrencyShort(
    balancesFiat.value.cashRemuneration + balancesFiat.value.expense + balancesFiat.value.bank,
    currencyCode.value
  )
)

const reviewRows = computed(() => {
  const rows: { key: string; label: string; value: string }[] = []
  if (balancesFiat.value.cashRemuneration > 0)
    rows.push({
      key: 'cashRemuneration',
      label: 'Cash Remuneration',
      value: fiatFormatted(cashRemBalance)
    })
  if (balancesFiat.value.expense > 0)
    rows.push({ key: 'expense', label: 'Expense Account', value: fiatFormatted(expenseBalance) })
  return rows
})

const cashOut = useCashOutAll()

const modal = ref({ mount: false, show: false })
const phase = ref<'review' | 'progress'>('review')

const openModal = () => {
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
    toast.add({ title: 'Cash out complete', color: 'success' })
  }
}

const retry = () => cashOut.retry()

const stepIcon = (status: CashOutStepStatus) =>
  ({
    pending: 'i-heroicons-clock',
    active: 'i-heroicons-arrow-path',
    success: 'i-heroicons-check-circle',
    failed: 'i-heroicons-x-circle'
  })[status]

const stepIconClass = (status: CashOutStepStatus) =>
  ({
    pending: 'text-gray-400',
    active: 'animate-spin text-warning',
    success: 'text-success',
    failed: 'text-error'
  })[status]
</script>
