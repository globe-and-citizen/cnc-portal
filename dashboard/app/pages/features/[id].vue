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
            {{ featureDisplayName }} Settings
          </h3>
          <p class="text-sm text-gray-600 dark:text-gray-400">
            Configure restriction settings for this feature
          </p>
        </div>
      </div>
    </template>

    <div v-if="isLoading" class="space-y-4">
      <USkeleton class="h-12" />
      <USkeleton class="h-64" />
    </div>

    <div v-else-if="error" class="space-y-4">
      <UAlert
        color="error"
        variant="soft"
        icon="i-lucide-alert-circle"
        title="Feature Not Found"
        description="This feature does not exist or has been deleted."
      />
      <UButton
        icon="i-lucide-arrow-left"
        color="primary"
        @click="goBack"
      >
        Back to Features
      </UButton>
    </div>

    <div v-else-if="currentFeature">
      <!-- Feature-Specific Component -->
      <FeatureCard
        v-if="currentFeature.functionName"
        :feature-name="currentFeature.functionName"
        :is-editable="isFeatureEnabled"
      />
    </div>
  </UPageCard>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter, useRoute } from '#imports'
import FeatureCard from '~/components/features/FeatureCard.vue'
import { useFeatures } from '~/queries/feature.query'
import { formatFeatureName } from '~/utils/generalUtil'

const router = useRouter()
const route = useRoute()

// Get features data
const { data: features, isLoading, error } = useFeatures()
// const features = computed(() => data.value?.data || [])

// Get feature ID from route params
const featureId = computed(() => route.params.id as string)

// Find current feature
const currentFeature = computed(() => {
  return features.value?.find(f => f.functionName === featureId.value)
})

const featureDisplayName = computed(() => {
  return formatFeatureName(currentFeature.value?.functionName)
})

// Check if the feature is enabled (both "enabled" and "beta" are considered enabled for viewing)
const isFeatureEnabled = computed(() => {
  return currentFeature.value?.status === 'enabled'
})

// Navigate back
const goBack = () => {
  if (import.meta.client && window.history.length > 1) {
    router.back()
    return
  }
  router.push('/features')
}
</script>
