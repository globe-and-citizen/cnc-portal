<template>
  <div class="space-y-3 md:hidden" data-test="safe-transactions-mobile-list">
    <article
      v-for="item in transactions"
      :key="item.transaction.safeTxHash"
      class="rounded-xl border border-gray-200 p-4 dark:border-gray-800"
      data-test="safe-transaction-mobile-card"
    >
      <div class="flex items-start justify-between gap-3">
        <div class="min-w-0">
          <p class="truncate font-medium">{{ getSafeTransactionMethod(item.transaction) }}</p>
          <p class="mt-1 text-xs text-gray-500">Nonce {{ item.transaction.nonce }}</p>
        </div>
        <UBadge
          :color="item.state.color"
          variant="soft"
          size="sm"
          data-test="safe-transaction-mobile-state"
        >
          {{ item.state.label }}
        </UBadge>
      </div>

      <dl class="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt class="text-xs text-gray-500">Value</dt>
          <dd class="mt-1 font-medium">
            {{
              formatSafeTransactionValue(
                item.transaction.value.toString(),
                item.transaction.dataDecoded ?? undefined,
                item.transaction.to
              )
            }}
          </dd>
        </div>
        <div>
          <dt class="text-xs text-gray-500">Approvals</dt>
          <dd class="mt-1 font-medium">
            {{ item.transaction.confirmations?.length || 0 }} /
            {{ item.requiredConfirmations }}
          </dd>
        </div>
      </dl>

      <div class="mt-4 flex items-center justify-between gap-3 text-xs text-gray-500">
        <span
          >{{ item.transaction.confirmations?.length || 0 }} of
          {{ item.requiredConfirmations }} approvals</span
        >
        <span>{{ formatDateRelative(item.transaction.modified) }}</span>
      </div>

      <div
        class="mt-2 h-1.5 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800"
        role="progressbar"
        :aria-label="`Transaction approval progress: ${item.transaction.confirmations?.length || 0} of ${item.requiredConfirmations}`"
        :aria-valuenow="item.transaction.confirmations?.length || 0"
        aria-valuemin="0"
        :aria-valuemax="item.requiredConfirmations"
      >
        <div
          class="bg-primary h-full rounded-full transition-all"
          :style="{ width: item.confirmationProgress }"
        />
      </div>

      <p class="mt-3 text-sm text-gray-600 dark:text-gray-300">
        {{ item.state.nextStep }}
      </p>

      <div class="mt-4 border-t pt-4 dark:border-gray-800">
        <SafeTransactionActions
          v-bind="item.permissions"
          :is-approving="item.isApproving"
          :is-executing="item.isExecuting"
          :actions-disabled="actionsDisabled"
          @view="emit('view', item.transaction)"
          @approve="emit('approve', item.transaction)"
          @execute="emit('execute', item.transaction)"
        />
      </div>
    </article>
  </div>
</template>

<script setup lang="ts">
import SafeTransactionActions from './SafeTransactionActions.vue'
import { formatSafeTransactionValue, getSafeTransactionMethod } from '@/utils/safe/model'
import { formatDateRelative } from '@/utils/format'
import type { SafeTransaction } from '@/types/safe'
import type { SafeTransactionQueueRow } from '@/utils/safe/transactionState'

interface Props {
  transactions: SafeTransactionQueueRow[]
  actionsDisabled?: boolean
}

withDefaults(defineProps<Props>(), { actionsDisabled: false })

const emit = defineEmits<{
  view: [transaction: SafeTransaction]
  approve: [transaction: SafeTransaction]
  execute: [transaction: SafeTransaction]
}>()
</script>
