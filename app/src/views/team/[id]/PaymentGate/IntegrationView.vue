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

    <div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div class="space-y-6 lg:col-span-2">
        <IntegrationCard :selected-token="selectedToken" />
        <TokenConfigCard v-model:selected-token="selectedToken" />
      </div>

      <div class="lg:sticky lg:top-6 lg:self-start">
        <WidgetPreviewCard :selected-token="selectedToken" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import IntegrationCard from '@/components/sections/PaymentGateView/IntegrationCard.vue'
import TokenConfigCard from '@/components/sections/PaymentGateView/TokenConfigCard.vue'
import WidgetPreviewCard from '@/components/sections/PaymentGateView/WidgetPreviewCard.vue'

const selectedToken = ref<'USDC' | 'USDCe' | 'POL'>('USDC')
</script>
