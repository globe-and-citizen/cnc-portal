<template>
  <UAlert
    v-if="hasRound && isError"
    color="warning"
    variant="soft"
    icon="i-lucide-triangle-alert"
    title="Some credit round details may be out of date"
    description="The last available details are still shown. Try again to refresh them."
    data-test="round-refresh-error"
  >
    <template #actions>
      <UButton
        color="warning"
        variant="outline"
        size="xs"
        label="Try again"
        :loading="isRetrying"
        data-test="round-refresh-retry"
        @click="retryRound"
      />
    </template>
  </UAlert>

  <div
    v-else-if="isLoading"
    class="flex flex-col gap-4"
    role="status"
    aria-live="polite"
    data-test="round-loading"
  >
    <span class="sr-only">Loading credit round</span>
    <USkeleton class="h-8 w-64" />
    <USkeleton class="h-64 rounded-2xl" />
  </div>

  <UAlert
    v-else-if="isError"
    color="error"
    variant="soft"
    icon="i-lucide-circle-alert"
    title="Credit round could not be loaded"
    description="Check your connection and try again. Your company context is unchanged."
    data-test="round-error"
  >
    <template #actions>
      <UButton
        color="error"
        variant="outline"
        size="xs"
        label="Try again"
        :loading="isRetrying"
        data-test="round-error-retry"
        @click="retryRound"
      />
    </template>
  </UAlert>

  <section v-else data-test="round-not-found">
    <UEmpty
      variant="naked"
      icon="i-lucide-file-search"
      title="Credit round not found"
      description="It may have been removed or this link is outdated."
    />
    <div class="mt-4 flex justify-center">
      <UButton
        color="primary"
        variant="soft"
        icon="i-lucide-arrow-left"
        label="Back to all rounds"
        data-test="round-not-found-back"
        @click="emit('back')"
      />
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useQueryClient } from '@tanstack/vue-query'

defineProps<{
  hasRound: boolean
  isLoading: boolean
  isError: boolean
}>()

const emit = defineEmits<{
  back: []
}>()

const queryClient = useQueryClient()
const isRetrying = ref(false)

async function retryRound() {
  isRetrying.value = true
  try {
    await queryClient.refetchQueries({ queryKey: ['fixedReturnAllOffers'] })
  } finally {
    isRetrying.value = false
  }
}
</script>
