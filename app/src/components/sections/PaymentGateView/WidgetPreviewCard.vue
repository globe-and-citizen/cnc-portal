<template>
  <PaymentGateWidgetView
    network-name="Polygon"
    :token-symbol="selectedToken"
    :token-symbol-raw="selectedToken"
    :order="{ amount, factureId }"
    :state="{
      pane,
      paymentStep,
      confirmedStatus: 'success',
      txHash: pane === 'confirmed' ? mockTxHash : undefined
    }"
    @pay="simulate"
  />
</template>

<script setup lang="ts">
import { ref } from 'vue'
import PaymentGateWidgetView, {
  type WidgetPane,
  type WidgetPaymentStep
} from './PaymentGateWidgetView.vue'

const { selectedToken } = defineProps<{ selectedToken: 'USDC' | 'USDCe' | 'POL' }>()

const pane = ref<WidgetPane>('review')
const paymentStep = ref<WidgetPaymentStep>('connecting')

const amount = '128'
const factureId = 'order_8842'
const mockTxHash = '0x4f2a1234567890abcdef1234567890abcdef1234567890abcdef1234567890c91b'

const STEP_DELAY_MS = 500

/**
 * Plays through the same connecting -> approving -> paying sequence the real
 * widget goes through, purely on a timer (there's no wallet or chain behind
 * this preview), always landing on success.
 */
function simulate() {
  pane.value = 'paying'
  paymentStep.value = 'connecting'

  setTimeout(() => (paymentStep.value = 'approving'), STEP_DELAY_MS)
  setTimeout(() => (paymentStep.value = 'paying'), STEP_DELAY_MS * 2)
  setTimeout(() => (pane.value = 'confirmed'), STEP_DELAY_MS * 3)
}
</script>
