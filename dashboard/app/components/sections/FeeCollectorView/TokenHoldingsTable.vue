<template>
  <UCard>
    <template #header>
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <h3 class="text-lg font-semibold">
            Token Holdings
          </h3>
          <UBadge v-if="isOwner" color="success">
            Owner
          </UBadge>
        </div>

        <div class="flex items-center gap-2">
          <AddTokenSupportModal />
          <WithdrawModal />
        </div>
      </div>
    </template>

    <UTable
      :data="tableRows"
      :columns="columns"
      :loading="isLoading"
    >
      <template #empty>
        <div class="flex flex-col items-center justify-center py-8">
          <UIcon name="i-heroicons-circle-stack-20-solid" class="w-12 h-12 text-gray-400 mb-3" />
          <p class="text-gray-500">
            No tokens available
          </p>
        </div>
      </template>

      <template #rank-cell="{ row }">
        <span class="text-gray-500 dark:text-gray-400">
          {{ row.original.rank }}
        </span>
      </template>

      <template #symbol-cell="{ row }">
        <div class="flex items-center gap-3">
          <UAvatar
            :alt="row.original.symbol"
            size="sm"
          >
            <template #fallback>
              <span class="text-sm font-semibold">
                {{ row.original.symbol.charAt(0) }}
              </span>
            </template>
          </UAvatar>
          <span class="font-semibold whitespace-nowrap">
            {{ row.original.symbol }}
          </span>
        </div>
      </template>

      <template #shortAddress-cell="{ row }">
        <UBadge variant="subtle" color="neutral">
          <span class="font-mono text-xs">
            {{ row.original.shortAddress }}
          </span>
        </UBadge>
      </template>

      <template #formattedBalance-cell="{ row }">
        <div>
          <div v-if="row.original.formattedBalance" class="font-medium whitespace-nowrap">
            {{ row.original.formattedBalance }} {{ row.original.symbol }}
          </div>
          <div v-if="row.original.formattedValue" class="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
            {{ row.original.formattedValue }}
          </div>
        </div>
      </template>

      <template #actions-cell="{ row }">
        <UButton
          v-if="isOwner && !isNative(row.original)"
          icon="i-heroicons-trash"
          size="xs"
          color="error"
          variant="ghost"
          aria-label="Remove token support"
          @click="openRemove(row.original)"
        />
      </template>
    </UTable>

    <RemoveTokenSupportModal
      v-model:model-value="isRemoveModalOpen"
      :token="tokenToRemove"
      @close="tokenToRemove = null"
    />
  </UCard>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { zeroAddress } from 'viem'
import { useFeeCollector } from '@/composables/useFeeCollector'
import type { TokenDisplay } from '@/types/token'
import { isFeeCollectorOwner } from '~/composables/FeeCollector/read'
import WithdrawModal from './WithdrawModal.vue'
import AddTokenSupportModal from './AddTokenSupportModal.vue'
import RemoveTokenSupportModal from './RemoveTokenSupportModal.vue'

interface TableRow extends TokenDisplay {
  rank: number
}

const isOwner = isFeeCollectorOwner()

const { tokens, isLoading } = useFeeCollector()

const columns = [
  { accessorKey: 'rank', header: 'RANK' },
  { accessorKey: 'symbol', header: 'Token' },
  { accessorKey: 'shortAddress', header: 'Address' },
  { accessorKey: 'formattedBalance', header: 'Amount' },
  { id: 'actions', header: '' }
]

const tableRows = computed<TableRow[]>(() =>
  tokens.value.map((token, index) => ({ ...token, rank: index + 1 }))
)

// Native rows can't be "unsupported" — the FeeCollector always receives native
// via its receive() hook, and removeTokenSupport would revert on zeroAddress.
function isNative(token: TokenDisplay): boolean {
  return token.address === zeroAddress
}

// Remove-support flow: a single modal instance is reused with whichever row
// the user clicks, avoiding N modals in the DOM.
const isRemoveModalOpen = ref(false)
const tokenToRemove = ref<TokenDisplay | null>(null)
function openRemove(token: TokenDisplay) {
  tokenToRemove.value = token
  isRemoveModalOpen.value = true
}
</script>
