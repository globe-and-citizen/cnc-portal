<template>
  <div class="p-6 pb-0">
    <div class="flex items-start justify-between">
      <h3 class="text-xl font-semibold pr-8">
        {{ market?.question }}
      </h3>
    </div>
    <p class="text-sm text-gray-500 mt-2 line-clamp-2">
      {{ market?.description }}
    </p>
  </div>

  <div class="p-6 space-y-6">
    <outcome-selection
      :outcomes="outcomes"
      :selected-outcome="selectedOutcome"
      @set-selected-outcome="setSelectedOutcome"
    />

    <order-type-toggle :order-type="orderType" @set-order-type="setOrderType" />

    <trading-inputs
      :order-type="orderType"
      :v$="v$"
      v-model:shares="shares"
      v-model:limit-price="limitPrice"
    />

    <order-summary :price="price" :shares="shares" :total="total" />

    <!-- Place Order Button -->
    <button
      @click="handlePlaceOrder"
      :disabled="!shares || parseFloat(shares) <= 0 || isPlacingOrder"
      :class="['btn w-full h-14 text-lg', isPlacingOrder ? 'btn-disabled' : 'btn-primary']"
    >
      <icon v-if="isPlacingOrder" icon="heroicons:arrow-path" class="w-5 h-5 animate-spin mr-2" />
      {{
        isPlacingOrder
          ? 'Placing Order...'
          : `Place ${orderType === 'market' ? 'Market' : 'Limit'} Order`
      }}
    </button>

    <!-- Market Link -->
    <a
      :href="marketUrl || 'https://polymarket.com'"
      target="_blank"
      rel="noopener noreferrer"
      class="flex items-center justify-center gap-2 text-sm text-gray-500 hover:text-primary transition-colors"
    >
      View on Polymarket
      <icon icon="heroicons:arrow-top-right-on-square" class="w-4 h-4" />
    </a>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Icon } from '@iconify/vue'
import {
  useClobOrder,
  useClobClient,
  useSafeDeployment,
  useTradingSession
} from '@/composables/trading/'
import type { PolymarketMarket } from '@/types'
import { useGetMarketDataQuery } from '@/queries/polymarket.queries'
import { toast } from 'vue-sonner'
import { log } from '@/utils'
import { useVuelidate } from '@vuelidate/core'
import { required, helpers } from '@vuelidate/validators'
import OutcomeSelection from './TradingModal/OutcomeSelection.vue'
import OrderTypeToggle from './TradingModal/OrderTypeToggle.vue'
import TradingInputs from './TradingModal/TradingInputs.vue'
import OrderSummary from './TradingModal/OrderSummary.vue'

const props = defineProps<{ marketUrl: string; traderBalance: number }>()
const emit = defineEmits(['close', 'place-order'])

const parsePolymarketUrl = (url: string) => {
  const match = url.match(/polymarket\.com\/(market|event)\/([^?#]+)/)
  if (!match) return null
  return { type: match[1], slug: match[2] }
}

// State
const market = ref<PolymarketMarket | null>(null)
const selectedOutcome = ref(0)
const orderType = ref<'market' | 'limit'>('market')
const shares = ref('')
const limitPrice = ref('')
const isPlacingOrder = ref(false)
const endpoint = computed(() => {
  const parsed = parsePolymarketUrl(props.marketUrl)
  if (!parsed) return null
  return parsed.type === 'market' ? `/markets/slug/${parsed.slug}` : `/events/slug/${parsed.slug}`
})

// Composables
const { data: marketData } = useGetMarketDataQuery({
  queryParams: { url: endpoint }
})
const { derivedSafeAddressFromEoa } = useSafeDeployment()
const { clobClient } = useClobClient()
const { submitOrder, error: clobOrderError } = useClobOrder(
  clobClient,
  derivedSafeAddressFromEoa.value || undefined
)
const { initializeTradingSession } = useTradingSession()

// Helper to calculate required shares for a target dollar amount
const getMinSharesForTarget = (targetAmount: number) => {
  if (orderType.value === 'market') {
    return price.value > 0 ? (targetAmount / price.value).toFixed(2) : '0'
  } else {
    const p = parseFloat(limitPrice.value) || 0
    return p > 0 ? (targetAmount / p).toFixed(2) : '0'
  }
}

const rules = computed(() => ({
  shares: {
    required,
    nonZero: helpers.withMessage(
      'Shares must be greater than 0',
      (value: string) => parseFloat(value) > 0
    ),
    spendableBalance: helpers.withMessage(
      () =>
        `Total cost exceeds available balance $${props.traderBalance.toFixed(2)} (max. ${getMinSharesForTarget(props.traderBalance)} shares)`,
      (value: string) => {
        return (parseFloat(value) || 0) * price.value <= props.traderBalance
      }
    ),
    // Dynamic Market Validation
    marketMinimum: helpers.withMessage(
      () => `Total cost must be at least $1.00 (min. ${getMinSharesForTarget(1)} shares)`,
      (value: string) => {
        if (orderType.value !== 'market') return true
        return (parseFloat(value) || 0) * price.value >= 1.0
      }
    ),
    // Dynamic Limit Validation
    limitMinimum: helpers.withMessage(
      () => `Total cost must be at least $5.00 (min. ${getMinSharesForTarget(5)} shares)`,
      (value: string) => {
        if (orderType.value !== 'limit') return true
        const p = parseFloat(limitPrice.value) || 0
        return (parseFloat(value) || 0) * p >= 5.0
      }
    )
  },
  limitPrice: {
    requiredIfLimit: helpers.withMessage('Limit price is required', (value: string) =>
      orderType.value === 'limit' ? parseFloat(value) > 0 : true
    )
  }
}))

const v$ = useVuelidate(rules, { shares, limitPrice })

// Computed mappings for real Gamma API response
const outcomes = computed(() => {
  if (!market.value) return []
  // Gamma returns outcomes as a JSON string or array depending on the endpoint
  const names = parseIfString(market.value.outcomes) as string[]
  const prices = parseIfString(market.value.outcomePrices) as string[]
  const clobIds = parseIfString(market.value.clobTokenIds) as string[]

  return names.map((name: string, i: number) => ({
    name,
    buyPrice: parseFloat(prices[i] ?? '0') || 0,
    tokenId: clobIds[i] || ''
  }))
})

const parseIfString = (value: string | string[] | undefined) => {
  return typeof value === 'string' ? JSON.parse(value) : value
}

const outcome = computed(() => outcomes.value[selectedOutcome.value])
const price = computed(() => outcomes.value[selectedOutcome.value]?.buyPrice || 0)
const total = computed(() => (parseFloat(shares.value) || 0) * price.value)

const setSelectedOutcome = (index: number | string) => {
  selectedOutcome.value = Number(index)
}

const setOrderType = (type: 'market' | 'limit') => {
  orderType.value = type
}

const handlePlaceOrder = async () => {
  const isFormValid = await v$.value.$validate()
  if (!isFormValid) {
    toast.error('Please fix the validation errors')
    return
  }
  if (!shares.value || parseFloat(shares.value) <= 0) return

  isPlacingOrder.value = true

  try {
    await initializeTradingSession()

    const result = await submitOrder({
      tokenId: outcome.value?.tokenId || '',
      side: 'BUY',
      size: parseFloat(shares.value),
      isMarketOrder: orderType.value === 'market',
      negRisk: (market.value?.negRisk as boolean) || false,
      price: orderType.value === 'limit' ? parseFloat(limitPrice.value) : undefined
    })

    emit('place-order', result)
  } catch (error) {
    console.error('Failed to place order:', error)
    // You could add error toast here
  } finally {
    isPlacingOrder.value = false
  }
}

watch(clobOrderError, (newError) => {
  if (newError) {
    toast.error(newError.message || 'Failed to place order')
    log.error('CLOB Order Error:', newError)
  }
})

watch(
  marketData,
  (newData) => {
    if (newData) {
      if (typeof newData === 'object' && newData !== null && 'markets' in newData) {
        const marketArray = (newData as { markets: PolymarketMarket[] }).markets
        market.value = marketArray[0] || null
      } else {
        market.value = (newData as PolymarketMarket) || null
      }
    }
  },
  { immediate: true }
)
</script>

<style scoped>
.line-clamp-2 {
  overflow: hidden;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}
</style>
