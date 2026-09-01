<template>
  <div class="flex flex-col-reverse justify-end gap-2 sm:flex-row">
    <UButton
      type="button"
      color="neutral"
      variant="ghost"
      label="Cancel"
      data-test="cancel-button"
      @click="emit('cancel')"
    />
    <TeamArchivedTooltip v-slot="{ disabled: archivedDisabled }">
      <UButton
        type="submit"
        color="primary"
        :disabled="loading || archivedDisabled"
        :loading="loading"
        label="Review schedule"
        data-test="submit-btn"
      />
    </TeamArchivedTooltip>
  </div>
</template>

<script setup lang="ts">
import TeamArchivedTooltip from '@/components/ui/TeamArchivedTooltip.vue'

defineProps<{
  loading: boolean
}>()

const emit = defineEmits<{
  cancel: []
}>()
</script>
