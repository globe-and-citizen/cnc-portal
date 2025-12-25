<template>
  <UPageCard>
    <template #header>
      <div class="flex items-center gap-3">
        <UButton
          icon="i-lucide-arrow-left"
          variant="ghost"
          color="neutral"
          aria-label="Back to features"
          data-test="back-to-features-btn"
          @click="goBack"
        />
        <div>
          <h3 class="text-lg font-semibold">
            Submit Restriction
          </h3>
          <p class="text-sm text-gray-600 dark:text-gray-400">
            {{ featureLabel }}
          </p>
        </div>
      </div>
    </template>

    <SubmitRestrictionCard />
  </UPageCard>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter, useRoute } from '#imports'
import SubmitRestrictionCard from '@/components/features/SubmitRestrictionCard.vue'

const router = useRouter()
const route = useRoute()

const featureLabel = computed(() => {
  const feature = (route.query.feature as string) || (route.params.feature as string) || 'Feature'
  return `Feature: ${feature}`
})

const goBack = () => {
  if (import.meta.client && window.history.length > 1) {
    router.back()
    return
  }
  router.push('/features')
}
</script>
