<template>
  <UCard data-test="payment-gate-widget-preview-card">
    <template #header>
      <div class="flex items-center justify-between gap-3">
        <div class="flex items-center gap-2 font-semibold">
          <span class="bg-primary inline-block h-4 w-4 rounded"></span>
          CNC Pay
        </div>
        <UBadge color="info" variant="subtle" size="sm">Polygon · {{ selectedToken }}</UBadge>
      </div>
    </template>

    <UTabs v-model="pane" :items="paneItems" class="mb-4" />

    <!-- Review -->
    <div v-if="pane === 'review'" class="space-y-4">
      <div class="border-default divide-default divide-y border-b text-sm">
        <div class="flex justify-between py-2">
          <span class="text-muted">Amount</span
          ><span class="font-semibold">{{ formatToken(amount, selectedToken) }}</span>
        </div>
        <div class="flex justify-between py-2">
          <span class="text-muted">Facture ID</span
          ><span class="font-mono text-xs">{{ factureId }}</span>
        </div>
      </div>

      <UCard variant="subtle" :ui="{ body: 'flex items-center justify-between px-3 py-2 text-sm' }">
        <span>Connected <span class="font-mono text-xs">0x71C…9e2</span></span>
        <span class="text-muted">312.40 {{ selectedToken }}</span>
      </UCard>

      <UButton
        block
        color="primary"
        :label="`Pay ${formatToken(amount, selectedToken)}`"
        @click="pane = 'paying'"
      />
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
          <UIcon name="i-lucide-loader-circle" class="animate-spin" /> Waiting for confirmation…
        </div>
      </div>
      <UCard variant="subtle" :ui="{ body: 'space-y-1 px-3 py-2 text-xs' }">
        <div class="flex justify-between">
          <span class="text-muted">Amount</span
          ><span class="font-mono">{{ formatToken(amount, selectedToken) }}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-muted">Tx</span><span class="font-mono">0x4f2a…c91b</span>
        </div>
      </UCard>
      <div class="flex gap-2">
        <UButton
          block
          color="neutral"
          variant="outline"
          label="Simulate success →"
          @click="confirm('success')"
        />
        <UButton
          block
          color="error"
          variant="outline"
          label="Simulate failure →"
          @click="confirm('failed')"
        />
      </div>
    </div>

    <!-- Confirmed -->
    <div v-else class="space-y-3 text-center">
      <template v-if="status === 'success'">
        <UIcon name="i-lucide-check-circle" class="text-primary mx-auto h-10 w-10" />
        <div class="font-semibold">Payment captured</div>
        <p class="text-muted text-sm">Settled — funds are in this Bank now.</p>
      </template>
      <template v-else>
        <UIcon name="i-lucide-circle-x" class="text-error mx-auto h-10 w-10" />
        <div class="font-semibold">Payment failed</div>
        <p class="text-muted text-sm">The transaction reverted on-chain — nothing was charged.</p>
      </template>
      <UCard variant="subtle" :ui="{ body: 'space-y-1 px-3 py-2 text-left text-xs' }">
        <div class="flex justify-between">
          <span class="text-muted">Amount</span
          ><span class="font-mono">{{ formatToken(amount, selectedToken) }}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-muted">Facture ID</span><span class="font-mono">{{ factureId }}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-muted">Tx</span><span class="font-mono">0x4f2a…c91b</span>
        </div>
      </UCard>
    </div>
  </UCard>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { formatToken } from '@/utils/format'
import { usePaymentGateMockState } from '@/composables/usePaymentGateMockState'

type Pane = 'review' | 'paying' | 'confirmed'
type Status = 'success' | 'failed'

const { selectedToken } = usePaymentGateMockState()

const pane = ref<Pane>('review')
const status = ref<Status>('success')
const amount = 128
const factureId = 'order_8842'

const paneItems = [
  { label: '1 · Review', value: 'review' },
  { label: '2 · Paying', value: 'paying' },
  { label: '3 · Confirmed', value: 'confirmed' }
]

function confirm(result: Status) {
  status.value = result
  pane.value = 'confirmed'
}
</script>
