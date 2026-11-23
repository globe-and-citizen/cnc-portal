<template>
  <UAlert
    v-if="unavailable.length"
    color="warning"
    title="Some token prices could not be loaded"
    description="Loaded quotes remain visible. Values without a quote are shown as unavailable."
    data-test="token-price-warning"
    class="mb-4"
  >
    <template #actions>
      <UButton
        label="Try again"
        :loading="retrying"
        :disabled="retrying"
        data-test="token-price-retry"
        @click="retry()"
      />
    </template>
  </UAlert>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useCurrencyStore } from '@/stores'

const currencyStore = useCurrencyStore()
const unavailable = computed(() =>
  currencyStore.tokenStates.filter(
    (query) =>
      query.error != null || (query.data != null && currencyStore.getTokenPrice(query.id) == null)
  )
)
const retrying = computed(() => unavailable.value.some((query) => query.isFetching))
const retry = () =>
  Promise.all(
    unavailable.value
      .filter((query) => !query.isFetching)
      .map((query) => query.refetch({ cancelRefetch: false }))
  )
</script>
