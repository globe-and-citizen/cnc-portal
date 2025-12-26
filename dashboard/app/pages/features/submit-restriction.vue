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

    <SubmitRestrictionCard :is-editable="isFeatureEnabled" />
  </UPageCard>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter, useRoute } from '#imports'
import SubmitRestrictionCard from '@/components/features/SubmitRestrictionCard.vue'
import { useFeatures } from '~/queries/function.query'

const router = useRouter()
const route = useRoute()

// Get features data to check status
const { data } = useFeatures()
const features = computed(() => data.value?.data || [])

const featureLabel = computed(() => {
  const feature = (route.query.feature as string) || (route.params.feature as string) || 'Feature'
  return `Feature: ${feature}`
})

// Check if the feature is enabled
const isFeatureEnabled = computed(() => {
  const featureName = (route.query.feature as string) || 'SUBMIT_RESTRICTION'
  const feature = features.value.find(f => f.functionName === featureName)
  return feature?.status === 'enabled'
})

const goBack = () => {
  if (import.meta.client && window.history.length > 1) {
    router.back()
    return
  }
  router.push('/features')
}
</script>
