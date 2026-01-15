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

    <!-- <pre>{{ currentFeature }}</pre> -->
    <!-- <pre>{{ teams }}</pre> -->
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
      <div class="space-y-6">
        <UAlert
          color="info"
          variant="soft"
          icon="i-lucide-info"
          :title="`About ${featureDisplayName}`"
          description="This feature has three states: Enabled (full restriction), Disabled (no restriction), and Beta (testing phase). Teams with overrides can have their own state independent of the global setting."
        />

        <!-- Global Restriction Toggle -->
        <FeatureGlobalRestriction
          :feature="currentFeature"
        />

        <!-- Team Overrides Section (Button + Modal + Table) -->
        <TeamOverridesSection
          :feature="currentFeature"
        />
      </div>
    </div>
  </UPageCard>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter, useRoute } from '#imports'
import { useFeatureQuery } from '~/queries/feature.query'
import { formatFeatureName } from '~/utils/generalUtil'
import FeatureGlobalRestriction from '~/components/features/FeatureGlobalRestriction.vue'
import TeamOverridesSection from '~/components/features/TeamOverridesSection.vue'

const router = useRouter()
const route = useRoute()

// Get feature ID from route params
const featureId = computed(() => route.params.id as string)

// Get single feature data
const { data: currentFeature, isLoading, error } = useFeatureQuery(featureId)

const featureDisplayName = computed(() => {
  return formatFeatureName(currentFeature.value?.functionName)
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
