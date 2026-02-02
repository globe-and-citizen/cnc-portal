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
          <div class="text-error text-xs mt-1">
            <div v-for="error in v$.marketUrl.$errors" :key="error.$uid">
              {{ error.$message }}
            </div>
          </div>
        </div>
        <button
          @click="handleTrade"
          :disabled="v$.marketUrl.$invalid || !marketUrl.trim() || !isSelectedSafeTrader"
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
        @place-order="handleOrderPlaced"
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
import { computed, ref, watch } from 'vue'
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
import { parseUnits } from 'viem'
import { useTeamSafes } from '@/composables/safe'
import { useVuelidate } from '@vuelidate/core'
import { required, helpers } from '@vuelidate/validators'

// Props
interface Props {
  loading?: boolean
}

withDefaults(defineProps<Props>(), {
  loading: false
})

// Emits
const emit = defineEmits<{
  sell: [trade: Trade]
  withdraw: [trade: Trade]
  'order-placed': [order: OrderDetails]
}>()

const isPolymarketUrl = (value: string) => {
  if (!value) return true // Let 'required' handle empty state
  return /polymarket\.com\/(market|event)\/([^?#]+)/.test(value)
}

// State
const marketUrl = ref('')
const tradingModal = ref({ mount: false, show: false })

// Use TanStack Query states
const { proposeRedemption } = useRedeemPosition()
const { derivedSafeAddressFromEoa } = useSafeDeployment()
const { selectedSafe, isSelectedSafeTrader } = useTeamSafes()
const selectedSafeAddress = computed(() => selectedSafe.value?.address)
const { data: trades, isLoading: isLoadingTrades, refetch } = useUserPositions(selectedSafeAddress)
const rules = {
  marketUrl: {
    required,
    isPolymarket: helpers.withMessage(
      'Please enter a valid Polymarket market or event URL',
      isPolymarketUrl
    )
  }
}

const v$ = useVuelidate(rules, { marketUrl })

// Methods
const handleTrade = async () => {
  const isValid = await v$.value.$validate()

  if (!isValid) {
    toast.error('Invalid Polymarket URL')
    return
  }
  if (marketUrl.value.trim()) {
    tradingModal.value = { mount: true, show: true }
  }
}

const handleModalClose = () => {
  tradingModal.value = { mount: false, show: false }
  marketUrl.value = '' // Clear the input after modal closes
  v$.value.$reset() // Reset validation state
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

    const rawSize = BigInt(parseUnits(trade.shares.toString(), 6))

    // Add your withdraw logic here
    await proposeRedemption({
      safeAddress: derivedSafeAddressFromEoa.value,
      conditionId: trade.conditionId,
      amounts: trade.negativeRisk
        ? [trade.outcomeIndex === 0 ? rawSize : 0n, trade.outcomeIndex === 1 ? rawSize : 0n]
        : undefined,
      outcomeIndex: trade.negativeRisk ? undefined : trade.outcomeIndex
    })
    toast.success(`Withdrawing $${Math.abs(trade.pnl).toFixed(2)} from "${trade.market}"`)
    emit('withdraw', trade)
  } catch (error) {
    toast.error('Failed to withdraw')
    log.error('Withdraw error:', parseError(error))
  }
}

const handleOrderPlaced = async (result: { success: boolean; orderId: string | number }) => {
  try {
    // console.log('Order placed:', order)

    // Show success message
    if (result.success) toast.success('Order placed successfully!')
    else throw new Error('Order placement failed')

    // Emit to parent
    // emit('order-placed', order)

    // Close the modal
    handleModalClose()

    // Optional: Show confirmation modal
    // orderDetails.value = order
    // confirmationModal.value = true

    // In a real app, you would update the trades list here
    // or trigger a refetch of trades data
    await refetch()
  } catch (error) {
    toast.error('Failed to place order')
    log.error('Order placement error:', parseError(error))
  }
}

// Optional: Watch for errors or other side effects
watch(selectedSafeAddress, (newAddress) => {
  if (newAddress) {
    refetch()
  }
})
</script>

<style scoped>
/* Add any component-specific styles here */
</style>
