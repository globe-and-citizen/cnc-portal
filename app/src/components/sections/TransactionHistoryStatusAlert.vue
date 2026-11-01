<template>
  <UAlert
    v-if="status.state === 'partial' || status.state === 'unavailable'"
    :color="status.state === 'unavailable' ? 'error' : 'warning'"
    variant="soft"
    icon="i-lucide-circle-alert"
    :title="title"
    :description="description"
    :data-test="dataTest"
  >
    <template #actions>
      <UButton
        color="primary"
        variant="outline"
        size="xs"
        label="Try again"
        :loading="isRetrying"
        :disabled="isRetrying"
        :data-test="`${dataTest}-retry`"
        @click="emit('retry')"
      />
    </template>
  </UAlert>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { EventFeedStatus } from '@/composables/eventsViaLogs'

interface Props {
  status: EventFeedStatus
  dataTest: string
  isRetrying?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  isRetrying: false
})

const emit = defineEmits<{
  retry: []
}>()

const title = computed(() =>
  props.status.state === 'unavailable'
    ? 'Transaction history unavailable'
    : 'Transaction history is incomplete'
)

const description = computed(() => {
  if (props.status.state === 'unavailable') {
    return 'No reliable transaction history is available right now. Check your connection and try again.'
  }

  const gaps = props.status.gapCount + props.status.timestampGapCount
  if (gaps === 0 && props.status.queryErrorCount > 0) {
    return 'The history could not be fully refreshed. The latest available data is still shown. Try again to refresh it.'
  }

  const gapDescription =
    gaps === 1 ? 'One event source gap was detected.' : `${gaps} event source gaps were detected.`
  return `${gapDescription} The displayed history may be incomplete. Try again to refresh it.`
})
</script>
