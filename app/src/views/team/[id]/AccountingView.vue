<template>
  <div class="flex flex-col gap-5">
    <AccountingHeader />

    <UAlert
      v-if="error"
      color="error"
      variant="soft"
      icon="i-heroicons-exclamation-triangle"
      title="Couldn't load the accounting data"
      description="Some on-chain or backend sources failed to load. Figures may be incomplete."
      data-test="accounting-error"
    />

    <RouterView />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { RouterView, useRoute } from 'vue-router'
import AccountingHeader from '@/components/sections/AccountingView/AccountingHeader.vue'
import { provideAccounting } from '@/composables/accounting/useAccountingContext'

const route = useRoute()

// tabs export their current, filtered view) via `useAccountingExport`.
const accounting = provideAccounting(() => (route.params.id as string) ?? null)
const error = computed(() => accounting.error.value)
</script>
