<template>
  <UCard data-test="payment-gate-token-config-card">
    <template #header>
      <h3 class="text-base font-semibold">Configure the widget</h3>
    </template>

    <p class="text-muted mb-4 text-sm">
      The accepted token is the only thing you configure in v0 — style and layout aren't editable
      yet.
    </p>

    <div class="flex gap-2" data-test="payment-gate-token-options">
      <UButton
        v-for="option in tokenOptions"
        :key="option"
        :color="selectedToken === option ? 'primary' : 'neutral'"
        :variant="selectedToken === option ? 'solid' : 'outline'"
        class="flex-1 justify-center"
        :label="option"
        @click="selectedToken = option"
      />
    </div>
  </UCard>
</template>

<script setup lang="ts">
import { usePaymentGateMockState } from '@/composables/usePaymentGateMockState'

const tokenOptions = ['USDC', 'USDCe', 'POL'] as const

const { selectedToken } = usePaymentGateMockState()
</script>
