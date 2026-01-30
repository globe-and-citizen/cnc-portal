<!-- BankBalanceSection.vue -->
<template>
  <CardComponent title="Balance">
    <div class="flex justify-between items-start">
      <div>
        <div class="flex items-baseline gap-2">
          <span class="text-4xl font-bold">
            <span class="inline-block min-w-16 h-10">
              <span
                data-test="loading-spinner"
                class="loading loading-spinner loading-lg"
                v-if="isLoading"
              ></span>
              <span v-else>{{ total['USD']?.formated ?? 0 }}</span>
            </span>
          </span>
          <span class="text-gray-600">USD</span>
        </div>
        <div class="text-sm text-gray-500 mt-1">
          ≈ {{ total[currency.code]?.formated ?? 0 }} {{ currency.code }}
        </div>
        <div class="text-sm text-red-500 mt-1 flex gap-2">
          <IconifyIcon icon="heroicons-outline:lock-closed" class="w-4 h-4" />
          {{ dividendsTotal['USD']?.formated ?? 0 }} USD
          <span class="text-xs">(dividends)</span>
        </div>
      </div>
      <div class="flex flex-col items-end gap-4">
        <div class="flex gap-2">
          <DepositModal v-if="bankAddress" :bank-address="bankAddress" />

          <TransferModal v-if="bankAddress" :bank-address="bankAddress" />
        </div>
        <div class="flex items-center gap-2" v-if="bankAddress">
          <div class="text-sm text-gray-600">Contract Address:</div>
          <AddressToolTip :address="bankAddress" />
        </div>
      </div>
    </div>
  </CardComponent>
</template>

<script setup lang="ts">
import AddressToolTip from '@/components/AddressToolTip.vue'
import CardComponent from '@/components/CardComponent.vue'
import { useStorage } from '@vueuse/core'
import { type Address } from 'viem'
import { useContractBalance } from '@/composables/useContractBalance'
import { Icon as IconifyIcon } from '@iconify/vue'
import TransferModal from '@/components/forms/TransferModal.vue'
import DepositModal from '@/components/forms/DepositModal.vue'

const props = defineProps<{
  bankAddress: Address
}>()

const currency = useStorage('currency', {
  code: 'USD',
  name: 'US Dollar',
  symbol: '$'
})

// Use the contract balance composable
const { total, dividendsTotal, isLoading } = useContractBalance(props.bankAddress)
</script>
