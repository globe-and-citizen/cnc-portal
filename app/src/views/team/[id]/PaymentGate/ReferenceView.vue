<template>
  <div class="space-y-6">
    <UPageHeader
      headline="Integrations"
      title="Reference"
      description="The fallback lookup, for when the widget's direct callback doesn't reach this team's page."
      :ui="{
        root: 'border-0 py-0',
        headline: 'mb-2 text-xs tracking-widest uppercase',
        title: 'text-2xl sm:text-3xl',
        description: 'mt-2 max-w-2xl text-base'
      }"
    />

    <ReferenceCard />
  </div>
</template>

<script setup lang="ts">
import ReferenceCard from '@/components/sections/PaymentGateView/ReferenceCard.vue'
</script>
