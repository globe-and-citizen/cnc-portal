<template>
  <Toaster />
  <CardComponent title="Your Trades" data-test="trades-table">
    <template #card-action>
      <!-- Trading Input in card-action slot -->
      <div class="flex gap-4 w-full">
        <div class="relative flex-1 min-w-[400px] max-w-[900px]">
          <icon
            icon="heroicons:magnifying-glass"
            class="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
          />
          <input
            type="text"
            placeholder="Paste Polymarket event or market URL..."
            v-model="marketUrl"
            @keydown.enter="handleTrade"
            class="input input-bordered w-full pl-12 h-14 text-lg focus:border-primary focus:ring-1 focus:ring-primary"
            data-test="market-url-input"
          />
        </div>
        <button
          @click="handleTrade"
          :disabled="!marketUrl.trim()"
          class="btn btn-primary h-14 px-8 text-lg"
          data-test="trade-button"
        >
          Trade
          <icon icon="heroicons:arrow-right" class="w-5 h-5 ml-2" />
        </button>
      </div>
    </template>

    <!-- Your Trades Table Component -->
    <YourTradesTable
      :trades="trades || []"
      :loading="loading || isLoadingTrades"
      @sell="handleSell"
      @withdraw="handleWithdraw"
    />

    <!-- Trading Modal -->
    <ModalComponent
      v-model="tradingModal.show"
      modal-width="w-1/3 max-w-4xl"
      v-if="tradingModal.mount"
      @reset="handleModalClose"
    >
      <TradingModal
        v-if="tradingModal.mount"
        :market-url="marketUrl"
        @close="handleModalClose"
        @order-placed="handleOrderPlaced"
      />
    </ModalComponent>

    <!-- Optional: Add a confirmation modal if needed -->
    <!-- <ModalComponent v-model="confirmationModal">
      <OrderConfirmation
        v-if="confirmationModal"
        :order-details="orderDetails"
        @confirm="confirmOrder"
        @close="confirmationModal = false"
      />
    </ModalComponent> -->
  </CardComponent>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { Icon } from '@iconify/vue'
import CardComponent from '@/components/CardComponent.vue'
import ModalComponent from '@/components/ModalComponent.vue'
import YourTradesTable from './YourTradesTable.vue'
import TradingModal from './TradingModal.vue'
// import OrderConfirmation from './OrderConfirmation.vue' // Optional
import type { Trade, OrderDetails } from '@/types/trading'
import { Toaster, toast } from 'vue-sonner'
import { log, parseError } from '@/utils'
import 'vue-sonner/style.css'
import { useUserPositions, useRedeemPosition, useSafeDeployment } from '@/composables/trading'

// Props
interface Props {
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  loading: false
})

// Emits
const emit = defineEmits<{
  sell: [trade: Trade]
  withdraw: [trade: Trade]
  'order-placed': [order: OrderDetails]
}>()

// State
const marketUrl = ref('')
const tradingModal = ref({ mount: false, show: false })

// Use TanStack Query states
const { data: trades, isLoading: isLoadingTrades /*, refetch */ } = useUserPositions()
const { proposeRedemption } = useRedeemPosition()
const { derivedSafeAddressFromEoa } = useSafeDeployment()

watch(
  trades,
  (newData) => {
    if (newData) {
      // trades.value = newData
      console.log('Fetched trades:', newData)
    }
  },
  { immediate: true }
)

// Mock trades data (in real app, this would come from props or store)
// const trades = ref<Trade[]>([
//   {
//     id: '1',
//     market: 'Will Bitcoin reach $150,000 by end of 2025?',
//     outcome: 'Yes',
//     type: 'buy',
//     shares: 500,
//     entryPrice: 0.42,
//     currentPrice: 0.58,
//     status: 'open',
//     pnl: 80.0,
//     date: '2024-12-20'
//   },
//   {
//     id: '2',
//     market: 'Will the Fed cut rates in January 2025?',
//     outcome: 'No',
//     type: 'buy',
//     shares: 1000,
//     entryPrice: 0.67,
//     currentPrice: 0.72,
//     status: 'open',
//     pnl: 50.0,
//     date: '2024-12-18'
//   },
//   {
//     id: '3',
//     market: 'Will Ethereum ETF be approved by Q1 2025?',
//     outcome: 'Yes',
//     type: 'buy',
//     shares: 250,
//     entryPrice: 0.78,
//     currentPrice: 1.0,
//     status: 'resolved',
//     result: 'won',
//     pnl: 55.0,
//     date: '2024-12-15'
//   },
//   {
//     id: '4',
//     market: 'Will Apple release AR glasses in 2024?',
//     outcome: 'Yes',
//     type: 'buy',
//     shares: 300,
//     entryPrice: 0.35,
//     currentPrice: 0.0,
//     status: 'resolved',
//     result: 'lost',
//     pnl: -105.0,
//     date: '2024-12-10'
//   },
//   {
//     id: '5',
//     market: 'Will SpaceX Starship reach orbit in 2024?',
//     outcome: 'Yes',
//     type: 'buy',
//     shares: 800,
//     entryPrice: 0.55,
//     currentPrice: 1.0,
//     status: 'resolved',
//     result: 'won',
//     pnl: 360.0,
//     date: '2024-12-05'
//   }
// ])

// Methods
const handleTrade = () => {
  if (marketUrl.value.trim()) {
    tradingModal.value = { mount: true, show: true }
  }
}

const handleModalClose = () => {
  tradingModal.value = { mount: false, show: false }
  marketUrl.value = '' // Clear the input after modal closes
}

const handleSell = (trade: Trade) => {
  try {
    // Add your sell logic here
    console.log('Selling trade:', trade)
    toast.success(`Selling ${trade.shares} shares of "${trade.market}"`)
    emit('sell', trade)
  } catch (error) {
    toast.error('Failed to sell trade')
    log.error('Sell error:', parseError(error))
  }
}

const handleWithdraw = async (trade: Trade) => {
  try {
    console.log('Withdrawing from trade:', trade)
    if (trade.conditionId === undefined || trade.outcomeIndex === undefined) {
      throw new Error('Position not redeemable')
    }
    if (!derivedSafeAddressFromEoa.value) {
      throw new Error('Safe address not available')
    }

    // Add your withdraw logic here
    await proposeRedemption({
      safeAddress: derivedSafeAddressFromEoa.value,
      conditionId: trade.conditionId,
      outcomeIndex: trade.outcomeIndex
    })
    toast.success(`Withdrawing $${Math.abs(trade.pnl).toFixed(2)} from "${trade.market}"`)
    emit('withdraw', trade)
  } catch (error) {
    toast.error('Failed to withdraw')
    log.error('Withdraw error:', parseError(error))
  }
}

const handleOrderPlaced = (order: OrderDetails) => {
  try {
    console.log('Order placed:', order)

    // Show success message
    toast.success('Order placed successfully!')

    // Emit to parent
    emit('order-placed', order)

    // Close the modal
    handleModalClose()

    // Optional: Show confirmation modal
    // orderDetails.value = order
    // confirmationModal.value = true

    // In a real app, you would update the trades list here
    // or trigger a refetch of trades data
  } catch (error) {
    toast.error('Failed to place order')
    log.error('Order placement error:', parseError(error))
  }
}

// Optional: Watch for errors or other side effects
watch(
  () => props.loading,
  (isLoading, wasLoading) => {
    if (!isLoading && wasLoading) {
      // Data finished loading
      console.log('Trades data loaded')
    }
  }
)
</script>

<style scoped>
/* Add any component-specific styles here */
</style>
