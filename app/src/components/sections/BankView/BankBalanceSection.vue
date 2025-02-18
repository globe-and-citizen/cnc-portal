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
            {{ formattedUsdcBalance }}
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
import { NETWORK, USDC_ADDRESS } from '@/constant'
import { useBalance, useReadContract, useChainId } from '@wagmi/vue'
import { computed, watch } from 'vue'
import type { Address } from 'viem'
import ERC20ABI from '@/artifacts/abi/erc20.json'
import { useToastStore } from '@/stores/useToastStore'
import { log, parseError } from '@/utils'

const props = defineProps<{
  bankAddress: Address | undefined
}>()

const emit = defineEmits<{
  (e: 'open-deposit'): void
  (e: 'open-transfer'): void
  (e: 'error'): void
  (e: 'balance-updated'): void
}>()

const { addErrorToast } = useToastStore()
const chainId = useChainId()

// Balance fetching
const {
  data: teamBalance,
  isLoading: balanceLoading,
  error: balanceError,
  refetch: fetchBalance
} = useBalance({
  address: props.bankAddress,
  chainId
})

// USDC Balance
const {
  data: usdcBalance,
  isLoading: isLoadingUsdcBalance,
  refetch: fetchUsdcBalance,
  error: usdcBalanceError
} = useReadContract({
  address: USDC_ADDRESS as Address,
  abi: ERC20ABI,
  functionName: 'balanceOf',
  args: [props.bankAddress as Address]
})

// Computed properties
const formattedUsdcBalance = computed(() =>
  usdcBalance.value ? (Number(usdcBalance.value) / 1e6).toString() : '0'
)

// Watch for balance errors
watch(balanceError, () => {
  if (balanceError.value) {
    addErrorToast('Failed to fetch team balance')
    log.error('Failed to fetch team balance:', parseError(balanceError.value))
    emit('error')
  }
})

// Watch for balance updates
watch([teamBalance, usdcBalance], () => {
  emit('balance-updated')
})

// Watch for bank address changes
watch(
  () => props.bankAddress,
  async (newAddress) => {
    if (newAddress) {
      await Promise.all([fetchBalance(), fetchUsdcBalance()])
    }
  }
)

// Expose methods and data for parent component
defineExpose({
  teamBalance,
  formattedUsdcBalance,
  balanceError,
  usdcBalanceError,
  fetchBalance,
  fetchUsdcBalance
})
</script>
