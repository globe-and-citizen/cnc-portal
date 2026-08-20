<template>
  <div class="space-y-6">
    <UPageHeader
      headline="Integrations"
      title="History"
      description="Payments made through the widget, as recorded by CNC Pay."
      :ui="{
        root: 'border-0 py-0',
        headline: 'mb-2 text-xs tracking-widest uppercase',
        title: 'text-2xl sm:text-3xl',
        description: 'mt-2 max-w-2xl text-base'
      }"
    />

    <HistoryCard />
  </div>
</template>

<script setup lang="ts">
import HistoryCard from '@/components/sections/PaymentGateView/HistoryCard.vue'
</script>
