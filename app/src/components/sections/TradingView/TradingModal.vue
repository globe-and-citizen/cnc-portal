<template>
  <div v-if="isOpen" class="modal modal-open">
    <div class="modal-box max-w-lg p-0 overflow-hidden bg-base-100 border border-base-300">
      <!-- Header -->
      <div class="p-6 pb-0">
        <div class="flex items-start justify-between">
          <h3 class="text-xl font-semibold pr-8">
            {{ market.title }}
          </h3>
          <button @click="onClose" class="btn btn-ghost btn-sm btn-circle absolute right-4 top-4">
            <icon icon="heroicons:x-mark" class="w-5 h-5" />
          </button>
        </div>
        <p class="text-sm text-gray-500 mt-2 line-clamp-2">
          {{ market.description }}
        </p>
      </div>

      <div class="p-6 space-y-6">
        <!-- Outcome Selection -->
        <div class="space-y-2">
          <label class="text-sm text-gray-500">Select Outcome</label>
          <div class="grid grid-cols-2 gap-3">
            <button
              v-for="(outcome, index) in market.outcomes"
              :key="outcome.name"
              @click="setSelectedOutcome(index)"
              :class="[
                'p-4 rounded-xl border transition-all duration-200 text-left',
                selectedOutcome === index
                  ? 'border-primary bg-primary/10'
                  : 'border-base-300 bg-base-200 hover:border-primary/50'
              ]"
            >
              <span class="font-semibold">{{ outcome.name }}</span>
              <p class="font-mono text-lg text-primary mt-1">
                {{ (outcome.buyPrice * 100).toFixed(0) }}¢
              </p>
            </button>
          </div>
        </div>

        <!-- Order Type Toggle -->
        <div class="space-y-2">
          <label class="text-sm text-gray-500">Order Type</label>
          <div class="grid grid-cols-2 gap-3">
            <button
              @click="setOrderType('market')"
              :class="[
                'h-14 rounded-lg flex items-center px-4 transition-all duration-200',
                orderType === 'market' ? 'btn btn-primary' : 'btn btn-ghost border border-base-300'
              ]"
            >
              <icon icon="heroicons:arrow-trending-up" class="w-5 h-5 mr-2" />
              <div class="text-left">
                <div>Market</div>
                <div class="text-xs opacity-80">Instant execution</div>
              </div>
            </button>
            <button
              @click="setOrderType('limit')"
              :class="[
                'h-14 rounded-lg flex items-center px-4 transition-all duration-200',
                orderType === 'limit' ? 'btn btn-primary' : 'btn btn-ghost border border-base-300'
              ]"
            >
              <icon icon="heroicons:arrow-trending-down" class="w-5 h-5 mr-2" />
              <div class="text-left">
                <div>Limit</div>
                <div class="text-xs opacity-80">Set your price</div>
              </div>
            </button>
          </div>
        </div>

        <!-- Shares Input -->
        <div class="space-y-2">
          <label class="text-sm text-gray-500">Number of Shares</label>
          <input
            type="number"
            placeholder="Enter amount"
            v-model="shares"
            class="input input-bordered w-full font-mono text-lg h-14"
            min="0"
            step="1"
          />
        </div>

        <!-- Limit Price Input - Only shown for Limit orders -->
        <div v-if="orderType === 'limit'" class="space-y-2">
          <label class="text-sm text-gray-500">Limit Price</label>
          <input
            type="number"
            placeholder="Enter limit price"
            class="input input-bordered w-full font-mono text-lg h-14"
            min="0"
            step="0.01"
          />
        </div>

        <!-- Order Summary -->
        <div class="bg-base-200 p-4 rounded-xl space-y-3">
          <div class="flex justify-between text-sm">
            <span class="text-gray-500">Price per share</span>
            <span class="font-mono">${{ price.toFixed(2) }}</span>
          </div>
          <div class="flex justify-between text-sm">
            <span class="text-gray-500">Shares</span>
            <span class="font-mono">{{ shares || '0' }}</span>
          </div>
          <div class="divider my-1"></div>
          <div class="flex justify-between">
            <span class="font-medium">Total Cost</span>
            <span class="font-mono text-lg text-primary"> ${{ total.toFixed(2) }} USDC </span>
          </div>
        </div>

        <!-- Place Order Button -->
        <button
          @click="handlePlaceOrder"
          :disabled="!shares || parseFloat(shares) <= 0 || isPlacingOrder"
          :class="['btn w-full h-14 text-lg', isPlacingOrder ? 'btn-disabled' : 'btn-primary']"
        >
          <icon
            v-if="isPlacingOrder"
            icon="heroicons:arrow-path"
            class="w-5 h-5 animate-spin mr-2"
          />
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
    </div>
    <div class="modal-backdrop" @click="onClose"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { Icon } from '@iconify/vue'

interface MarketData {
  title: string
  description: string
  endDate: string
  volume: string
  liquidity: string
  outcomes: {
    name: string
    buyPrice: number
    sellPrice: number
  }[]
}

interface Props {
  isOpen: boolean
  marketUrl: string
}

const props = defineProps<Props>()
const emit = defineEmits<{
  close: []
}>()

// Reactive state
const selectedOutcome = ref(0)
const orderType = ref<'market' | 'limit'>('market')
const shares = ref('')
const isPlacingOrder = ref(false)

// Dummy market data
const dummyMarket: MarketData = {
  title: 'Will Bitcoin reach $150,000 by end of 2025?',
  description:
    'This market resolves to YES if the price of Bitcoin reaches or exceeds $150,000 USD on any major exchange before December 31, 2025.',
  endDate: 'Dec 31, 2025',
  volume: '$2.4M',
  liquidity: '$890K',
  outcomes: [
    { name: 'Yes', buyPrice: 0.42, sellPrice: 0.41 },
    { name: 'No', buyPrice: 0.58, sellPrice: 0.57 }
  ]
}

const market = dummyMarket

// Computed properties
const outcome = computed(() => market.outcomes[selectedOutcome.value])
const price = computed(() => outcome.value?.buyPrice || 0)
const total = computed(() => (shares.value ? parseFloat(shares.value) * price.value : 0))

// Methods
const onClose = () => {
  emit('close')
}

const setSelectedOutcome = (index: number) => {
  selectedOutcome.value = index
}

const setOrderType = (type: 'market' | 'limit') => {
  orderType.value = type
}

const handlePlaceOrder = async () => {
  if (!shares.value || parseFloat(shares.value) <= 0) return

  isPlacingOrder.value = true

  try {
    // Simulate order placement
    await new Promise((resolve) => setTimeout(resolve, 2000))

    // Here you would call your actual order placement logic
    console.log('Placing order:', {
      outcome: outcome.value?.name,
      shares: parseFloat(shares.value),
      orderType: orderType.value,
      total: total.value
    })

    // Close modal after successful order
    onClose()
  } catch (error) {
    console.error('Failed to place order:', error)
    // You could add error toast here
  } finally {
    isPlacingOrder.value = false
  }
}
</script>

<style scoped>
.line-clamp-2 {
  overflow: hidden;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}
</style>
