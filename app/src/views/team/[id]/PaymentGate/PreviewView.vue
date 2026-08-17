<template>
  <div class="space-y-6">
    <UPageHeader
      headline="Integrations"
      title="Preview"
      description="What customers see once the widget is embedded on your page. Modes shown here mirror what's enabled on the Setup tab."
      :ui="{
        root: 'border-0 py-0',
        headline: 'mb-2 text-xs tracking-widest uppercase',
        title: 'text-2xl sm:text-3xl',
        description: 'mt-2 max-w-2xl text-base'
      }"
    />

    <div class="max-w-md">
      <WidgetPreviewCard :escrow-enabled="escrowEnabled" :metered-enabled="meteredEnabled" />
    </div>
  </div>
</template>

<script setup lang="ts">
import WidgetPreviewCard from '@/components/sections/PaymentGateView/WidgetPreviewCard.vue'
import { usePaymentGateMockState } from '@/composables/usePaymentGateMockState'

const { escrowEnabled, meteredEnabled } = usePaymentGateMockState()
</script>
