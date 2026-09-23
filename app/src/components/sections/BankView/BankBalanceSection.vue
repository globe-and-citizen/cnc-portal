<!-- BankBalanceSection.vue -->
<template>
  <UCard>
    <template #header>
      <h3 class="text-lg font-semibold">Balance</h3>
    </template>

    <div class="flex items-start justify-between">
      <div>
        <div class="flex items-baseline gap-2">
          <span class="text-4xl font-bold">
            <span class="inline-block h-10 min-w-16">
              <USkeleton v-if="isLoading" class="h-10 w-16" data-test="loading-spinner" />
              <span v-else data-test="bank-total-usd">{{ totalUsd }}</span>
            </span>
          </span>
          <span class="text-gray-600">USD</span>
        </div>
        <div class="mt-1 text-sm text-gray-500" data-test="bank-total-local">
          ≈ {{ totalLocal }} {{ currency.code }}
        </div>
      </div>
      <div class="flex flex-col items-end gap-4">
        <div class="flex gap-2">
          <DepositModal v-if="bankAddress" :bank-address="bankAddress" />
          <TransferModal v-if="bankAddress" :bank-address="bankAddress" />
        </div>
        <div class="flex items-center gap-2" v-if="bankAddress" data-test="bank-contract-address">
          <div class="text-sm text-gray-600">Contract Address:</div>
          <AddressTooltip :address="bankAddress" />
        </div>
      </div>
    </div>
  </UCard>
</template>

<script setup lang="ts">
import AddressTooltip from '@/components/ui/AddressTooltip.vue'
import { useStorage } from '@vueuse/core'
import { computed } from 'vue'
import { type Address } from 'viem'
import { useContractBalance } from '@/composables/useContractBalance'
import TransferModal from '@/components/sections/BankView/forms/TransferModal.vue'
import DepositModal from '@/components/sections/BankView/forms/DepositModal.vue'
import { formatCurrency, formatUsd } from '@/utils/format'

const props = defineProps<{
  bankAddress: Address
}>()

const currency = useStorage('currency', {
  code: 'USD',
  name: 'US Dollar',
  symbol: '$'
})

// Use the contract balance composable
const { data: balance, isLoading } = useContractBalance(props.bankAddress)

const totalUsd = computed(() => formatUsd(balance.value?.total.usd.value))
const totalLocal = computed(() =>
  formatCurrency(balance.value?.total.local.value, { currency: currency.value.code })
)
</script>
