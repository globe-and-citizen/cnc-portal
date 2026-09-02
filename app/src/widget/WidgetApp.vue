<template>
  <PaymentGateWidgetView
    :network-name="networkName"
    :token-symbol="token?.symbol"
    :token-symbol-raw="tokenSymbolRaw"
    :order="{ amount, factureId }"
    :state="{ pane, paymentStep, confirmedStatus, errorMessage, txHash }"
    @pay="runPayment"
    @retry="runPayment"
  />
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { parseUnits, type Address, type Hex } from 'viem'
import PaymentGateWidgetView, {
  type WidgetConfirmedStatus,
  type WidgetPane,
  type WidgetPaymentStep
} from '@/components/sections/PaymentGateView/PaymentGateWidgetView.vue'
import { describeWidgetError } from './errorMessage'
import { payWithWidget, type WidgetPaymentStatus } from './payment'
import { widgetChain } from './wagmiConfig'

export interface WidgetToken {
  address: Address
  symbol: string
  decimals: number
}

const props = defineProps<{
  bankAddress: Address
  /** `undefined` when the requested `data-token` isn't a supported payment token. */
  token?: WidgetToken
  /** Raw `data-token` value, used only for the unsupported-token message. */
  tokenSymbolRaw: string
  amount: string
  factureId: string
  onStatus?: (status: WidgetPaymentStatus, extra?: Record<string, unknown>) => void
}>()

const pane = ref<WidgetPane>('review')
const confirmedStatus = ref<WidgetConfirmedStatus>('success')
const paymentStep = ref<WidgetPaymentStep>('connecting')
const txHash = ref<Hex>()
const errorMessage = ref('')

const networkName = widgetChain.name

async function runPayment() {
  const token = props.token
  if (!token) return

  pane.value = 'paying'
  try {
    const amountUnits = parseUnits(props.amount, token.decimals)
    const { hash } = await payWithWidget(
      {
        bankAddress: props.bankAddress,
        tokenAddress: token.address,
        amount: amountUnits,
        factureId: props.factureId
      },
      (step) => {
        // `payWithWidget` reports 'connecting' | 'approving' | 'paying' | 'success' | 'failed'.
        // Only forward the first three here — the terminal ones are reported
        // once, with the full { hash, factureId } / { factureId, error }
        // payload, from the resolved/catch branches below. Forwarding them
        // here too would fire the merchant's callback twice per checkout.
        if (step === 'connecting' || step === 'approving' || step === 'paying') {
          paymentStep.value = step
          props.onStatus?.(step)
        }
      }
    )
    txHash.value = hash
    confirmedStatus.value = 'success'
    pane.value = 'confirmed'
    props.onStatus?.('success', { hash, factureId: props.factureId })
  } catch (error) {
    confirmedStatus.value = 'failed'
    errorMessage.value = describeWidgetError(error)
    pane.value = 'confirmed'
    props.onStatus?.('failed', { factureId: props.factureId, error: errorMessage.value })
  }
}
</script>
