<template>
  <div class="px-6">
    <UAlert
      color="warning"
      variant="soft"
      icon="i-lucide-triangle-alert"
      title="Couldn't verify your lending position"
      description="The cap and remaining amounts above may be inaccurate until this is retried."
      data-test="lend-position-unavailable"
    >
      <template #actions>
        <UButton
          color="warning"
          variant="outline"
          size="xs"
          label="Try again"
          @click="emit('retry')"
        />
      </template>
    </UAlert>
  </div>
</template>

<script setup lang="ts">
const emit = defineEmits<{ retry: [] }>()
</script>
