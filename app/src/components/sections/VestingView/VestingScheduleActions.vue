<template>
  <div class="flex flex-wrap justify-end gap-2">
    <UButton
      color="neutral"
      variant="ghost"
      size="sm"
      label="Details"
      :data-test="mobile ? 'vesting-mobile-details-btn' : 'vesting-details-btn'"
      @click="emit('details')"
    />
    <UButton
      v-if="canRelease"
      color="success"
      size="sm"
      label="Release"
      :data-test="mobile ? 'vesting-mobile-release-btn' : 'release-btn'"
      @click="emit('action', 'release')"
    />
    <UButton
      v-if="canStop"
      color="error"
      variant="soft"
      size="sm"
      label="Stop"
      :data-test="mobile ? 'vesting-mobile-stop-btn' : 'stop-btn'"
      @click="emit('action', 'stop')"
    />
  </div>
</template>

<script setup lang="ts">
defineProps<{
  canRelease: boolean
  canStop: boolean
  mobile?: boolean
}>()
const emit = defineEmits<{
  details: []
  action: [kind: 'release' | 'stop']
}>()
</script>
