<!--
  Pure presentational widget UI — the Review / Paying / Confirmed panes,
  driven entirely by props. Shared by two very different consumers that both
  live under `src/` and get pulled into two independent Vite builds:

    - `WidgetPreviewCard.vue` (main app, `vite.config.ts`): the in-app mockup
      shown on the Payment Gate Setup page — feeds it fake/simulated state.
    - `src/widget/WidgetApp.vue` (`vite.widget.config.ts`): the real
      embeddable widget — feeds it real state from `payment.ts`.

  One source of markup means a design change only has to happen once and
  both builds pick it up automatically, instead of two hand-maintained
  copies silently drifting apart.

  Kept intentionally free of any Pinia store / vue-router / composable that
  isn't plain and portable — anything main-app-specific pulled in here would
  leak into the widget's standalone bundle the same way an `@/utils` barrel
  import once did (see `src/widget/main.ts`'s comment on that).
-->
<template>
  <UCard data-test="cnc-pay-widget">
    <template #header>
      <div class="flex items-center justify-between gap-3">
        <div class="flex items-center gap-2 font-semibold">
          <span class="bg-primary inline-block h-4 w-4 rounded"></span>
          CNC Pay
        </div>
        <UBadge v-if="tokenSymbol" color="info" variant="subtle" size="sm"
          >{{ networkName }} · {{ tokenSymbol }}</UBadge
        >
      </div>
    </template>

    <UAlert
      v-if="!tokenSymbol"
      color="error"
      variant="soft"
      :description="`Unsupported payment token '${tokenSymbolRaw}'.`"
    />

    <template v-else>
      <div class="bg-elevated mb-4 flex w-full gap-1 rounded-lg p-1 text-sm font-medium">
        <div
          v-for="item in paneItems"
          :key="item.value"
          class="flex grow items-center justify-center rounded-md px-3 py-1.5 transition-colors"
          :class="state.pane === item.value ? 'bg-primary text-inverted shadow-xs' : 'text-muted'"
        >
          {{ item.label }}
        </div>
      </div>

      <!-- Review -->
      <div v-if="state.pane === 'review'" class="space-y-4">
        <div class="border-default divide-default divide-y border-b text-sm">
          <div class="flex justify-between py-2">
            <span class="text-muted">Amount</span>
            <span class="font-semibold">{{ amountLabel }}</span>
          </div>
          <div class="flex justify-between py-2">
            <span class="text-muted">Facture ID</span>
            <span class="font-mono text-xs">{{ order.factureId }}</span>
          </div>
        </div>
        <UButton
          block
          color="primary"
          :label="`Pay ${amountLabel}`"
          data-test="cnc-pay-widget-pay-button"
          @click="emit('pay')"
        />
      </div>

      <!-- Paying -->
      <div v-else-if="state.pane === 'paying'" class="space-y-4">
        <div class="space-y-3 text-sm">
          <div
            v-for="(step, index) in PAYMENT_STEPS"
            :key="step.key"
            class="flex items-center gap-2"
            :class="index > currentStepIndex ? 'text-muted' : ''"
          >
            <UIcon v-if="index < currentStepIndex" name="i-lucide-check" class="text-primary" />
            <UIcon
              v-else-if="index === currentStepIndex"
              name="i-lucide-loader-circle"
              class="animate-spin"
            />
            <UIcon v-else name="i-lucide-circle" class="text-muted h-3 w-3" />
            {{ step.label }}
          </div>
        </div>
        <UCard variant="subtle" :ui="{ body: 'space-y-1 px-3 py-2 text-xs' }">
          <div class="flex justify-between">
            <span class="text-muted">Amount</span>
            <span class="font-mono">{{ amountLabel }}</span>
          </div>
        </UCard>
      </div>

      <!-- Confirmed -->
      <div v-else class="space-y-3 text-center">
        <template v-if="state.confirmedStatus === 'success'">
          <UIcon name="i-lucide-check-circle" class="text-primary mx-auto h-10 w-10" />
          <div class="font-semibold">Payment captured</div>
          <p class="text-muted text-sm">Settled — funds are in this Bank now.</p>
        </template>
        <template v-else>
          <UIcon name="i-lucide-circle-x" class="text-error mx-auto h-10 w-10" />
          <div class="font-semibold">Payment failed</div>
          <p class="text-muted text-sm">
            {{ state.errorMessage || 'The transaction reverted on-chain — nothing was charged.' }}
          </p>
        </template>
        <UCard variant="subtle" :ui="{ body: 'space-y-1 px-3 py-2 text-left text-xs' }">
          <div class="flex justify-between">
            <span class="text-muted">Amount</span>
            <span class="font-mono">{{ amountLabel }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-muted">Facture ID</span>
            <span class="font-mono">{{ order.factureId }}</span>
          </div>
          <div v-if="state.txHash" class="flex justify-between">
            <span class="text-muted">Tx</span>
            <span class="font-mono">{{ shortTxHash }}</span>
          </div>
        </UCard>
      </div>
    </template>
  </UCard>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { formatToken, formatTxHash } from '@/utils/format'

export type WidgetPane = 'review' | 'paying' | 'confirmed'
export type WidgetPaymentStep = 'connecting' | 'approving' | 'paying'
export type WidgetConfirmedStatus = 'success' | 'failed'

export interface WidgetOrder {
  amount: string
  factureId: string
}

export interface WidgetPaymentState {
  pane: WidgetPane
  /** Which step is current while `pane === 'paying'`. */
  paymentStep: WidgetPaymentStep
  confirmedStatus: WidgetConfirmedStatus
  errorMessage?: string
  txHash?: string
}

const props = defineProps<{
  networkName: string
  /** `undefined` renders the "unsupported token" alert instead of the normal panes. */
  tokenSymbol?: string
  /** Raw requested token symbol, shown only in the unsupported-token message. */
  tokenSymbolRaw: string
  order: WidgetOrder
  state: WidgetPaymentState
}>()

const emit = defineEmits<{ pay: [] }>()

const paneItems: { label: string; value: WidgetPane }[] = [
  { label: '1 · Review', value: 'review' },
  { label: '2 · Paying', value: 'paying' },
  { label: '3 · Confirmed', value: 'confirmed' }
]

const PAYMENT_STEPS: { key: WidgetPaymentStep; label: string }[] = [
  { key: 'connecting', label: 'Connecting wallet' },
  { key: 'approving', label: 'Approving token spend' },
  { key: 'paying', label: 'Waiting for confirmation' }
]
const currentStepIndex = computed(() =>
  PAYMENT_STEPS.findIndex((step) => step.key === props.state.paymentStep)
)

const amountLabel = computed(() =>
  props.tokenSymbol ? formatToken(props.order.amount, props.tokenSymbol) : props.order.amount
)
const shortTxHash = computed(() => (props.state.txHash ? formatTxHash(props.state.txHash) : ''))
</script>
