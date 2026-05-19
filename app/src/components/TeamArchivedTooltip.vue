<template>
  <UTooltip :text="archivedTooltip" :delay-duration="0">
    <span class="inline-flex max-w-full">
      <slot :disabled="isDisabled" />
    </span>
  </UTooltip>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useTeamWriteGuard } from '@/composables/useTeamWriteGuard'

const props = defineProps<{
  disabled?: boolean
}>()

const { isWriteDisabled, archivedTooltip } = useTeamWriteGuard()

const isDisabled = computed(() => Boolean(props.disabled) || isWriteDisabled.value)
</script>
