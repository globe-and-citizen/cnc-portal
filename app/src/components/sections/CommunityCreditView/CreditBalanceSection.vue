<template>
  <UCard data-test="credit-balance-section">
    <template #header>
      <h3 class="text-lg font-semibold">Balance</h3>
    </template>

    <div class="flex items-start justify-between">
      <div>
        <div class="flex items-baseline gap-2">
          <span class="text-4xl font-bold">
            <span class="inline-block h-10 min-w-16">
              <USkeleton v-if="isLoading" class="h-10 w-16" data-test="loading-spinner" />
              <span v-else>{{ total['USD']?.formated ?? 0 }}</span>
            </span>
          </span>
          <span class="text-gray-600">USD</span>
        </div>
        <div class="mt-1 text-sm text-gray-500">
          ≈ {{ total[currency.code]?.formated ?? 0 }} {{ currency.code }}
        </div>
      </div>
      <div v-if="fixedReturnAddress" class="flex items-center gap-2">
        <div class="text-sm text-gray-600">Contract Address:</div>
        <AddressToolTip :address="fixedReturnAddress" />
      </div>
    </div>
  </UCard>
</template>

<script setup lang="ts">
import { useStorage } from '@vueuse/core'
import AddressToolTip from '@/components/AddressToolTip.vue'
import { useContractBalance } from '@/composables/useContractBalance'
import { useFixedReturnAddress } from '@/composables/fixedReturn/reads'

const fixedReturnAddress = useFixedReturnAddress()

const currency = useStorage('currency', {
  code: 'USD',
  name: 'US Dollar',
  symbol: '$'
})

const { total, isLoading } = useContractBalance(fixedReturnAddress)
</script>
