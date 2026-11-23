<template>
  <span
    v-if="isLoading"
    class="inline-flex items-center"
    data-test="contract-balance-loading"
    aria-label="Loading balance"
  >
    <USkeleton class="h-5 w-20" />
  </span>

  <UTooltip
    v-else-if="error"
    text="The balance could not be loaded. Refresh the contract data to try again."
  >
    <span
      class="text-error inline-flex cursor-help items-center gap-1 text-sm font-medium"
      data-test="contract-balance-error"
      tabindex="0"
    >
      <UIcon name="i-lucide-triangle-alert" class="size-4" />
      Unavailable
    </span>
  </UTooltip>

  <UTooltip v-else-if="isEmpty" text="No balance data is available for this contract yet.">
    <span class="text-muted cursor-help text-sm" data-test="contract-balance-empty" tabindex="0">
      —
    </span>
  </UTooltip>

  <UPopover
    v-else
    mode="hover"
    :open-delay="150"
    :close-delay="100"
    :content="{ side: 'top', align: 'center' }"
    :ui="{ content: 'w-72 p-3' }"
    arrow
  >
    <span
      class="decoration-muted cursor-help font-medium underline decoration-dotted underline-offset-4"
      :data-test="isZero ? 'contract-balance-zero' : 'contract-balance-value'"
      tabindex="0"
      :aria-label="`${formattedTotal}. Hover or focus to view the balance breakdown.`"
    >
      {{ formattedTotal }}
    </span>

    <template #content>
      <div class="space-y-2 text-sm" data-test="contract-balance-details">
        <div>
          <p class="font-semibold">Balance breakdown</p>
          <p class="text-dimmed mt-0.5 text-xs">Supported assets held by this contract</p>
        </div>

        <dl class="space-y-1.5">
          <div
            v-for="tokenBalance in balance!.balances"
            :key="tokenBalance.token.id"
            class="flex items-center justify-between gap-4"
          >
            <dt class="text-muted">{{ formatTokenAmount(tokenBalance) }}</dt>
            <dd class="font-medium">{{ tokenBalance.value.local.formatted }}</dd>
          </div>
        </dl>

        <div class="border-default flex items-center justify-between border-t pt-2 font-semibold">
          <span>Total value</span>
          <span>{{ formattedTotal }}</span>
        </div>
      </div>
    </template>
  </UPopover>
</template>

<script setup lang="ts">
import { computed, toRef } from 'vue'
import type { Address } from 'viem'
import { useContractBalance } from '@/composables/useContractBalance'
import type { TokenBalance } from '@/types'
import { formatToken } from '@/utils/format'

const props = defineProps<{ address: Address }>()

const { data: balance, isLoading, error } = useContractBalance(toRef(props, 'address'))

const isEmpty = computed(() => !balance.value?.balances.length)
const isZero = computed(() => balance.value?.total.local.value === 0)
const formattedTotal = computed(() => balance.value?.total.local.formatted ?? '—')
const formatTokenAmount = (tokenBalance: TokenBalance) =>
  formatToken(tokenBalance.amount, tokenBalance.token.symbol, { maxDecimals: 6 })
</script>
