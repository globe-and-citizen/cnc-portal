<template>
  <div class="space-y-3">
    <div class="flex items-center justify-end gap-2">
      <span class="text-muted text-xs">Preview outcome on Pay:</span>
      <USwitch
        v-model="previewFailure"
        data-test="payment-gate-preview-outcome-toggle"
        unchecked-icon="i-lucide-check"
        checked-icon="i-lucide-x"
        color="neutral"
      />
    </div>

    <PaymentGateWidgetView
      network-name="Polygon"
      :token-symbol="selectedToken"
      :token-symbol-raw="selectedToken"
      :amount="amount"
      :facture-id="factureId"
      :pane="pane"
      :payment-step="paymentStep"
      :confirmed-status="confirmedStatus"
      :tx-hash="pane === 'confirmed' && confirmedStatus === 'success' ? mockTxHash : undefined"
      @pay="simulate"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { usePaymentGateMockState } from '@/composables/usePaymentGateMockState'
import PaymentGateWidgetView, {
  type WidgetConfirmedStatus,
  type WidgetPane,
  type WidgetPaymentStep
} from './PaymentGateWidgetView.vue'

const { selectedToken } = usePaymentGateMockState()

const pane = ref<WidgetPane>('review')
const paymentStep = ref<WidgetPaymentStep>('connecting')
const confirmedStatus = ref<WidgetConfirmedStatus>('success')
/** Preview-only control (not part of the real widget): which outcome the next simulated pay ends in. */
const previewFailure = ref(false)

const amount = '128'
const factureId = 'order_8842'
const mockTxHash = '0x4f2a1234567890abcdef1234567890abcdef1234567890abcdef1234567890c91b'

const STEP_DELAY_MS = 500

/**
 * Plays through the same connecting -> approving -> paying sequence the
 * real widget goes through, purely on a timer (there's no wallet or chain
 * behind this preview), then lands on whichever outcome `previewFailure`
 * currently selects.
 */
function simulate() {
  pane.value = 'paying'
  paymentStep.value = 'connecting'

  setTimeout(() => (paymentStep.value = 'approving'), STEP_DELAY_MS)
  setTimeout(() => (paymentStep.value = 'paying'), STEP_DELAY_MS * 2)
  setTimeout(() => {
    confirmedStatus.value = previewFailure.value ? 'failed' : 'success'
    pane.value = 'confirmed'
  }, STEP_DELAY_MS * 3)
}
</script>
