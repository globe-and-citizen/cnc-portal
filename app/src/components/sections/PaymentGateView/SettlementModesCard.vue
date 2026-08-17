<template>
  <UCard data-test="payment-gate-settlement-modes-card">
    <template #header>
      <h3 class="text-base font-semibold">Settlement modes</h3>
    </template>

    <p class="text-muted mb-4 text-sm">
      Which checkout options customers see. Each one is a separate on-chain call, signed from this
      team's own wallet.
    </p>

    <div class="space-y-3">
      <UCard variant="subtle" :ui="{ body: 'flex items-center justify-between gap-3 px-3 py-3' }">
        <div>
          <div class="text-sm font-semibold">Pay now</div>
          <div class="text-muted text-xs">Instant settlement to Bank — <code>Bank.sol</code></div>
        </div>
        <USwitch model-value disabled data-test="mode-instant-switch" />
      </UCard>

      <UCard variant="subtle" :ui="{ body: 'flex items-center justify-between gap-3 px-3 py-3' }">
        <div>
          <div class="text-sm font-semibold">Hold until delivery</div>
          <div class="text-muted text-xs">
            Escrowed, released on approval — <code>AdCampaignManager.sol</code>
          </div>
        </div>
        <USwitch v-model="escrowEnabled" data-test="mode-escrow-switch" />
      </UCard>

      <UCard variant="subtle" :ui="{ body: 'flex items-center justify-between gap-3 px-3 py-3' }">
        <div>
          <div class="text-sm font-semibold">Pay as you go</div>
          <div class="text-muted text-xs">
            Prepaid balance, metered per click — <code>costPerClick</code>
          </div>
        </div>
        <USwitch v-model="meteredEnabled" data-test="mode-metered-switch" />
      </UCard>
    </div>
  </UCard>
</template>

<script setup lang="ts">
const escrowEnabled = defineModel<boolean>('escrowEnabled', { default: true })
const meteredEnabled = defineModel<boolean>('meteredEnabled', { default: false })
</script>
