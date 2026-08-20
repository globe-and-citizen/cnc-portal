<template>
  <div class="space-y-3 md:hidden" data-test="safe-transactions-mobile-list">
    <article
      v-for="transaction in transactions"
      :key="transaction.safeTxHash"
      class="rounded-xl border border-gray-200 p-4 dark:border-gray-800"
      data-test="safe-transaction-mobile-card"
    >
      <div class="flex items-start justify-between gap-3">
        <div class="min-w-0">
          <p class="truncate font-medium">{{ getSafeTransactionMethod(transaction) }}</p>
          <p class="mt-1 text-xs text-gray-500">Nonce {{ transaction.nonce }}</p>
        </div>
        <UBadge
          :color="getState(transaction).color"
          variant="soft"
          size="sm"
          data-test="safe-transaction-mobile-state"
        >
          {{ getState(transaction).label }}
        </UBadge>
      </div>

      <dl class="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt class="text-xs text-gray-500">Value</dt>
          <dd class="mt-1 font-medium">
            {{
              formatSafeTransactionValue(
                transaction.value.toString(),
                transaction.dataDecoded ?? undefined,
                transaction.to
              )
            }}
          </dd>
        </div>
        <div>
          <dt class="text-xs text-gray-500">Approvals</dt>
          <dd class="mt-1 font-medium">
            {{ transaction.confirmations?.length || 0 }} /
            {{ requiredConfirmations(transaction) }}
          </dd>
        </div>
      </dl>

      <div
        class="mt-4 h-1.5 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800"
        role="progressbar"
        :aria-label="`Transaction approval progress: ${transaction.confirmations?.length || 0} of ${requiredConfirmations(transaction)}`"
        :aria-valuenow="transaction.confirmations?.length || 0"
        aria-valuemin="0"
        :aria-valuemax="requiredConfirmations(transaction)"
      >
        <div
          class="bg-primary h-full rounded-full transition-all"
          :style="{ width: confirmationProgress(transaction) }"
        />
      </div>

      <p class="mt-3 text-sm text-gray-600 dark:text-gray-300">
        {{ getState(transaction).nextStep }}
      </p>

      <div class="mt-4 border-t pt-4 dark:border-gray-800">
        <SafeTransactionActions
          v-bind="getPermissions(transaction)"
          :is-approving="isTransactionLoading(transaction.safeTxHash, 'approve')"
          :is-executing="isTransactionLoading(transaction.safeTxHash, 'execute')"
          :actions-disabled="actionsDisabled"
          @view="emit('view', transaction)"
          @approve="emit('approve', transaction)"
          @execute="emit('execute', transaction)"
        />
      </div>
    </article>
  </div>
</template>

<script setup lang="ts">
import SafeTransactionActions from './SafeTransactionActions.vue'
import { formatSafeTransactionValue, getSafeTransactionMethod } from '@/utils'
import type { SafeTransaction } from '@/types/safe'
import type {
  SafeTransactionPermissions,
  SafeTransactionStateMeta
} from '@/utils/safeTransactionState'

interface Props {
  transactions: SafeTransaction[]
  getState: (transaction: SafeTransaction) => SafeTransactionStateMeta
  getPermissions: (transaction: SafeTransaction) => SafeTransactionPermissions
  requiredConfirmations: (transaction: SafeTransaction) => number
  confirmationProgress: (transaction: SafeTransaction) => string
  isTransactionLoading: (safeTxHash: string, operation: 'approve' | 'execute') => boolean
  actionsDisabled?: boolean
}

withDefaults(defineProps<Props>(), { actionsDisabled: false })

const emit = defineEmits<{
  view: [transaction: SafeTransaction]
  approve: [transaction: SafeTransaction]
  execute: [transaction: SafeTransaction]
}>()
</script>
