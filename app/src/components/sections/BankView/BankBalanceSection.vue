<!-- BankBalanceSection.vue -->
<template>
  <div class="card bg-base-100 shadow-sm mb-4">
    <div class="card-body">
      <div class="flex justify-between items-start">
        <div>
          <h2 class="text-lg font-medium mb-1">Balance</h2>
          <div class="flex items-baseline gap-2">
            <span class="text-4xl font-bold">
              <span class="inline-block min-w-16 h-10">
                <span
                  class="loading loading-spinner loading-lg"
                  v-if="balanceLoading || isLoadingUsdcBalance"
                ></span>
                <span v-else>{{ teamBalance?.formatted }}</span>
              </span>
            </span>
            <span class="text-gray-600">{{ NETWORK.currencySymbol }}</span>
          </div>
          <div class="text-sm text-gray-500 mt-1">≈ $ 1.28</div>
          <div class="mt-2">
            {{ usdcBalance ? (Number(usdcBalance) / 1e6).toString() : '0' }}
          </div>
        </div>
        <div class="flex gap-2">
          <ButtonUI
            v-if="bankAddress"
            variant="secondary"
            class="flex items-center gap-2"
            @click="$emit('open-deposit')"
            data-test="deposit-button"
          >
            <PlusIcon class="w-5 h-5" />
            Deposit
          </ButtonUI>
          <ButtonUI
            v-if="bankAddress"
            variant="secondary"
            class="flex items-center gap-2"
            @click="$emit('open-transfer')"
            data-test="transfer-button"
          >
            <ArrowsRightLeftIcon class="w-5 h-5" />
            Transfer
          </ButtonUI>
        </div>
      </div>

      <div class="text-sm text-gray-600 mt-4">
        Contract Address:
        <span class="font-mono">{{ bankAddress }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { PlusIcon, ArrowsRightLeftIcon } from '@heroicons/vue/24/outline'
import ButtonUI from '@/components/ButtonUI.vue'
import { NETWORK } from '@/constant'
import type { Address } from 'viem'

defineProps<{
  teamBalance: { formatted: string } | null
  usdcBalance: bigint | null
  balanceLoading: boolean
  isLoadingUsdcBalance: boolean
  bankAddress: Address | undefined
}>()

defineEmits<{
  (e: 'open-deposit'): void
  (e: 'open-transfer'): void
}>()
</script>
