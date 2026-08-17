<template>
  <UCard data-test="payment-gate-widget-preview-card">
    <template #header>
      <div class="flex items-center justify-between gap-3">
        <div class="flex items-center gap-2 font-semibold">
          <span class="bg-primary inline-block h-4 w-4 rounded"></span>
          CNC Pay
        </div>
        <UBadge color="info" variant="subtle" size="sm">Polygon · USDC</UBadge>
      </div>
    </template>

    <UTabs v-model="pane" :items="paneItems" class="mb-4" />

    <!-- Review -->
    <div v-if="pane === 'review'" class="space-y-4">
      <div
        v-if="mode !== 'metered'"
        class="border-default divide-default divide-y border-b text-sm"
      >
        <div class="flex justify-between py-2">
          <span class="text-muted">One-time commission</span><span>$128.00</span>
        </div>
        <div class="flex justify-between py-2">
          <span class="text-muted">Amount due</span><span class="font-semibold">$128.00</span>
        </div>
      </div>

      <div v-else class="space-y-3">
        <div class="border-default divide-default divide-y border-b text-sm">
          <div class="flex justify-between py-2">
            <span class="text-muted">Rate</span><span>$0.08 / click</span>
          </div>
          <div class="flex justify-between py-2">
            <span class="text-muted">Fund balance</span
            ><span class="font-semibold">{{ formatUsd(fundAmount) }}</span>
          </div>
        </div>
        <div class="flex gap-2">
          <UButton
            v-for="amount in [25, 50, 100]"
            :key="amount"
            :color="fundAmount === amount ? 'primary' : 'neutral'"
            :variant="fundAmount === amount ? 'solid' : 'outline'"
            size="sm"
            class="flex-1 justify-center"
            :label="`$${amount}`"
            @click="fundAmount = amount"
          />
        </div>
      </div>

      <div>
        <label class="text-muted mb-2 block text-xs font-medium uppercase">Settlement mode</label>
        <div class="flex gap-2">
          <UButton
            v-for="option in modeOptions"
            :key="option.value"
            :color="mode === option.value ? 'primary' : 'neutral'"
            :variant="mode === option.value ? 'solid' : 'outline'"
            size="sm"
            class="flex-1 justify-center"
            :label="option.label"
            @click="mode = option.value"
          />
        </div>
        <p class="text-muted mt-2 text-xs">{{ modeNote }}</p>
      </div>

      <UCard variant="subtle" :ui="{ body: 'flex items-center justify-between px-3 py-2 text-sm' }">
        <span>Connected <span class="font-mono text-xs">0x71C…9e2</span></span>
        <span class="text-muted">312.40 USDC</span>
      </UCard>

      <UButton block color="primary" :label="ctaLabel" @click="pane = 'paying'" />
    </div>

    <!-- Paying -->
    <div v-else-if="pane === 'paying'" class="space-y-4">
      <div class="space-y-3 text-sm">
        <div class="flex items-center gap-2">
          <UIcon name="i-lucide-check" class="text-primary" /> Wallet signature approved
        </div>
        <div class="flex items-center gap-2">
          <UIcon name="i-lucide-check" class="text-primary" /> Transaction submitted to Polygon
        </div>
        <div class="flex items-center gap-2">
          <UIcon name="i-lucide-loader-circle" class="animate-spin" /> {{ payingLabel }}
        </div>
      </div>
      <UCard variant="subtle" :ui="{ body: 'space-y-1 px-3 py-2 text-xs' }">
        <div class="flex justify-between">
          <span class="text-muted">{{ payingAmountLabel }}</span
          ><span class="font-mono">{{ payingAmount }}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-muted">Tx</span><span class="font-mono">0x4f2a…c91b</span>
        </div>
      </UCard>
      <UButton
        block
        color="neutral"
        variant="outline"
        label="Simulate confirmation →"
        @click="confirm"
      />
    </div>

    <!-- Confirmed -->
    <div v-else class="space-y-4">
      <div v-if="mode !== 'metered'" class="space-y-3 text-center">
        <UIcon name="i-lucide-check-circle" class="text-primary mx-auto h-10 w-10" />
        <div class="font-semibold">{{ doneTitle }}</div>
        <p class="text-muted text-sm">{{ doneSub }}</p>
        <UCard variant="subtle" :ui="{ body: 'space-y-1 px-3 py-2 text-left text-xs' }">
          <div class="flex justify-between">
            <span class="text-muted">Amount</span><span class="font-mono">128.00 USDC</span>
          </div>
          <div class="flex justify-between">
            <span class="text-muted">Network</span><span class="font-mono">polygon</span>
          </div>
          <div class="flex justify-between">
            <span class="text-muted">Tx</span><span class="font-mono">0x4f2a…c91b</span>
          </div>
        </UCard>
      </div>

      <div v-else class="space-y-3">
        <div class="text-center">
          <div class="text-2xl font-bold">{{ formatUsd(meterBalance) }}</div>
          <div class="text-muted text-xs">of {{ formatUsd(fundAmount) }} funded</div>
        </div>
        <div class="bg-elevated h-1.5 overflow-hidden rounded-full">
          <div
            class="bg-primary h-full transition-all"
            :style="{ width: (100 * meterBalance) / fundAmount + '%' }"
          ></div>
        </div>
        <p class="text-muted text-center text-xs">
          $0.08 per click · draining live while this tab is open
        </p>
        <div class="max-h-40 space-y-1 overflow-y-auto">
          <div
            v-for="row in meterLog"
            :key="row.n"
            class="bg-elevated flex justify-between rounded px-2 py-1 font-mono text-xs"
          >
            <span>click #{{ row.n }} charged</span>
            <span>−$0.08 · bal {{ formatUsd(row.bal) }}</span>
          </div>
        </div>
      </div>
    </div>
  </UCard>
</template>

<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue'
import { formatUsd, formatToken } from '@/utils/format'

const props = defineProps<{
  escrowEnabled: boolean
  meteredEnabled: boolean
}>()

type Mode = 'instant' | 'escrow' | 'metered'
type Pane = 'review' | 'paying' | 'confirmed'

const pane = ref<Pane>('review')
const mode = ref<Mode>('instant')
const fundAmount = ref(50)

const paneItems = [
  { label: '1 · Review', value: 'review' },
  { label: '2 · Paying', value: 'paying' },
  { label: '3 · Confirmed', value: 'confirmed' }
]

const modeOptions = computed(() => {
  const options: { label: string; value: Mode }[] = [{ label: 'Pay now', value: 'instant' }]
  if (props.escrowEnabled) options.push({ label: 'Hold until delivery', value: 'escrow' })
  if (props.meteredEnabled) options.push({ label: 'Pay as you go', value: 'metered' })
  return options
})

// Keep the selected mode valid if a mode gets disabled from Setup while previewing.
watch(modeOptions, (options) => {
  if (!options.some((o) => o.value === mode.value)) mode.value = 'instant'
})

const modeNote = computed(() => {
  if (mode.value === 'escrow')
    return 'Funds held in escrow until delivery is confirmed — AdCampaignManager.sol'
  if (mode.value === 'metered')
    return 'A balance is preloaded, then drawn down per click — AdCampaignManager.sol (costPerClick, claimPayment)'
  return 'Funds settle to this Bank immediately on confirmation — Bank.sol'
})

const ctaLabel = computed(() =>
  mode.value === 'metered' ? `Fund ${formatUsd(fundAmount.value)} balance` : 'Pay $128.00'
)
const payingLabel = computed(() =>
  mode.value === 'metered' ? 'Confirming top-up on Polygon…' : 'Waiting for confirmation…'
)
const payingAmountLabel = computed(() => (mode.value === 'metered' ? 'Top-up' : 'Amount'))
const payingAmount = computed(() =>
  mode.value === 'metered' ? formatToken(fundAmount.value, 'USDC') : '128.00 USDC'
)
const doneTitle = computed(() => (mode.value === 'escrow' ? 'Payment held' : 'Payment captured'))
const doneSub = computed(() =>
  mode.value === 'escrow'
    ? 'Funded, pending release on delivery.'
    : 'Settled — funds are in this Bank now.'
)

const meterBalance = ref(fundAmount.value)
const meterLog = ref<{ n: number; bal: number }[]>([])
let meterTimer: ReturnType<typeof setInterval> | undefined
let clickN = 0

function confirm() {
  pane.value = 'confirmed'
  if (mode.value === 'metered') startMeter()
}

function startMeter() {
  meterBalance.value = fundAmount.value
  meterLog.value = []
  clickN = 0
  meterTimer = setInterval(() => {
    if (meterBalance.value <= 0.08) {
      clearInterval(meterTimer)
      return
    }
    clickN += 1
    meterBalance.value = Math.max(0, meterBalance.value - 0.08)
    meterLog.value = [{ n: clickN, bal: meterBalance.value }, ...meterLog.value].slice(0, 5)
  }, 1400)
}

watch(pane, (value) => {
  if (value !== 'confirmed' && meterTimer) clearInterval(meterTimer)
})

onUnmounted(() => {
  if (meterTimer) clearInterval(meterTimer)
})
</script>
