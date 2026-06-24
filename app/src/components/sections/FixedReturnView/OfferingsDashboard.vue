<template>
  <OfferingDetail
    v-if="selectedOffering"
    :offering="selectedOffering"
    @back="selectedOffering = null"
  />
  <OfferingsList v-else @manage="selectedOffering = $event" />
</template>

<script setup lang="ts">
import { ref } from 'vue'
import OfferingsList from './OfferingsList.vue'
import OfferingDetail from './OfferingDetail.vue'
import type { OfferingSummary } from '@/types'

const selectedOffering = ref<OfferingSummary | null>(null)
</script>
