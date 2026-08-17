<template>
  <div class="space-y-6">
    <UPageHeader
      headline="Integrations"
      title="Payment Gate"
      description="Let another app accept payments that settle straight into this team's Bank — the same treasury this team already manages."
      :ui="{
        root: 'border-0 py-0',
        headline: 'mb-2 text-xs tracking-widest uppercase',
        title: 'text-2xl sm:text-3xl',
        description: 'mt-2 max-w-2xl text-base'
      }"
    />

    <IntegrationCard />

    <SettlementModesCard
      v-model:escrow-enabled="escrowEnabled"
      v-model:metered-enabled="meteredEnabled"
    />

    <TokensCard />
  </div>
</template>

<script setup lang="ts">
import IntegrationCard from '@/components/sections/PaymentGateView/IntegrationCard.vue'
import SettlementModesCard from '@/components/sections/PaymentGateView/SettlementModesCard.vue'
import TokensCard from '@/components/sections/PaymentGateView/TokensCard.vue'
import { usePaymentGateMockState } from '@/composables/usePaymentGateMockState'

const { escrowEnabled, meteredEnabled } = usePaymentGateMockState()
</script>
