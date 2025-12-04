<template>
  <UCard>
    <template #header>
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <h3 class="text-lg font-semibold">
            Token Holdings
          </h3>
          <UBadge v-if="isFeeCollectorOwner" color="success">
            Owner
          </UBadge>
        </div>

        <UButton
          v-if="isFeeCollectorOwner"
          color="primary"
          size="sm"
          icon="i-heroicons-arrow-down-tray"
          @click="$emit('openBatchModal')"
        >
          Withdraw
        </UButton>
      </div>
    </template>

    <div class="overflow-x-auto">
      <table class="w-full">
        <thead>
          <tr class="border-b border-gray-200 dark:border-gray-700">
            <th class="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400 w-20">
              RANK
            </th>
            <th class="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">
              Token
            </th>
            <th class="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">
              Address
            </th>
            <th class="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">
              Amount
            </th>
          </tr>
        </thead>

        <tbody>
          <!-- Loading -->
          <tr v-if="isLoading">
            <td colspan="4" class="text-center py-8">
              <UIcon name="i-heroicons-arrow-path" class="w-6 h-6 animate-spin inline-block" />
            </td>
          </tr>

          <!-- Rows -->
          <tr
            v-for="(token, index) in tokens"
            :key="token.address"
            class="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <!-- RANK -->
            <td class="px-4 py-4 text-gray-500 dark:text-gray-400 w-20">
              {{ index + 1 }}
            </td>

            <!-- Token -->
            <td class="px-4 py-4">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center flex-shrink-0">
                  <span class="text-sm font-semibold text-blue-600 dark:text-blue-400">
                    {{ token.symbol.charAt(0) }}
                  </span>
                </div>
                <p class="font-semibold whitespace-nowrap">
                  {{ token.symbol }}
                </p>
              </div>
            </td>

            <!-- Address -->
            <td class="px-4 py-4">
              <p class="text-sm text-gray-600 dark:text-gray-400 font-mono whitespace-nowrap">
                {{ token.shortAddress }}
              </p>
            </td>

            <!-- Amount -->
            <td class="px-4 py-4">
              <div class="font-medium whitespace-nowrap">
                {{ formatAmount(token.formattedBalance) }} {{ token.symbol }}
              </div>
              <div v-if="getTokenUSD(token, token.formattedBalance)" class="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                {{ getTokenUSD(token, token.formattedBalance) }}
              </div>
            </td>
          </tr>

          <tr v-if="!isLoading && tokens.length === 0">
            <td colspan="4" class="text-center py-8 text-gray-500">
              No tokens available
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </UCard>
</template>

<script setup lang="ts">
import { useFeeCollector } from '@/composables/useFeeCollector'
import { useTokenPrices } from '@/composables/useTokenPrices'
import type { TokenDisplay } from '@/types/token'

defineEmits<{
  openBatchModal: []
}>()

// Get data directly from composables
const { tokens, isLoading, isFeeCollectorOwner } = useFeeCollector()
const { prices, isLoading: isLoadingPrices, getCoinGeckoId } = useTokenPrices()

// Get token price
const getTokenPrice = (token: TokenDisplay): number => {
  if (isLoadingPrices.value) return 0

  // Native token - use CoinGecko ID based on network
  if (token.isNative) {
    const coinGeckoId = getCoinGeckoId()
    return prices.value[coinGeckoId as keyof typeof prices.value] || 0
  }

  // Stablecoins
  const symbol = token.symbol.toUpperCase()
  if (symbol === 'USDC') return prices.value['usd-coin'] || 1
  if (symbol === 'USDT') return prices.value['tether'] || 1

  return 0
}

// Format amount with appropriate decimals
const formatAmount = (amount: string): string => {
  const num = parseFloat(amount)
  if (isNaN(num)) return '0'

  // Show more decimals for small amounts
  if (num < 0.01) return num.toFixed(6)
  if (num < 1) return num.toFixed(4)
  return num.toFixed(2)
}

// Calculate USD value
const getTokenUSD = (token: TokenDisplay, formattedAmount: string): string => {
  const amount = parseFloat(formattedAmount)
  if (isNaN(amount) || amount === 0) return ''

  const price = getTokenPrice(token)
  if (price === 0) return ''

  const usdValue = amount * price

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(usdValue)
}
</script>
