<template>
  <div class="container mx-auto px-4 py-8 space-y-8">
    <!-- Page Header -->
    <div class="flex items-center justify-between gap-4">
      <div>
        <h1 class="text-3xl font-bold">
          Micro Payments management
        </h1>
        <p class="text-gray-600 dark:text-gray-400 mt-2">
          Manage and withdraw collected fees
        </p>
      </div>

      <!-- Contract version selector: picks which per-version subcomponent below
           the page renders, so the admin can interact with a specific deployed
           FeeCollector version. -->
      <div class="flex flex-col items-end gap-1 shrink-0">
        <label for="fee-collector-version" class="text-xs text-gray-500 dark:text-gray-400">
          Contract version
        </label>
        <USelect
          id="fee-collector-version"
          v-model="selectedVersion"
          :items="versionItems"
          class="w-40"
        />
      </div>
    </div>

    <!-- Remount the managed panel on version changes so reads and writes stay
         bound to the deployment that was selected when the panel was created. -->
    <FeeCollectorManagedPanel v-if="selectedVersion === 'V1' || selectedVersion === 'V2'" :key="selectedVersion" />
    <FeeCollectorPanelV0 v-else-if="selectedVersion === 'V0'" />
    <FeeCollectorPanelV01 v-else-if="selectedVersion === 'V0.1'" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useFeeCollectorVersion } from '~/composables/FeeCollector/useFeeCollectorVersion'
import FeeCollectorManagedPanel from '~/components/sections/FeeCollectorView/FeeCollectorManagedPanel.vue'
import FeeCollectorPanelV0 from '~/components/sections/FeeCollectorView/legacy/FeeCollectorPanelV0.vue'
import FeeCollectorPanelV01 from '~/components/sections/FeeCollectorView/legacy/FeeCollectorPanelV01.vue'
// V0/V0.1 share an ABI but stay as separate explicit modules/panels by design.

const { versions, currentVersion, selectedVersion } = useFeeCollectorVersion()

const versionItems = computed(() =>
  versions.map(version => ({
    label: version === currentVersion ? `${version} (current)` : version,
    value: version
  }))
)
</script>
