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
// POL isn't offered: native transfers can't carry a facture ID — Bank.sol's
// receive() reverts on non-empty calldata and has no fallback() — so v0
// payments only support depositToken() targets (see src/widget/main.ts).
const tokenOptions = ['USDC', 'USDCe'] as const

const selectedToken = defineModel<'USDC' | 'USDCe' | 'POL'>('selectedToken', { required: true })
</script>
