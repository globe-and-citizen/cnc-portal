<template>
  <UPageCard variant="subtle">
    <div class="flex items-center justify-between">
      <div class="flex-1">
        <h4 class="font-semibold text-highlighted mb-1">
          Global Restriction
        </h4>
        <p class="text-sm text-muted">
          {{ enabled ? 'All teams are restricted to submit claims for the current week only.' : 'All teams can submit claims for any week.' }}
          Individual teams can override this setting.
        </p>
      </div>
      <div class="flex items-center gap-3">
        <span class="text-sm font-medium" :class="enabled ? 'text-error' : 'text-success'">
          {{ enabled ? 'ON' : 'OFF' }}
        </span>
        <USwitch
          :model-value="enabled"
          data-test="global-restriction-switch"
          :loading="loading"
          @update:model-value="handleToggle"
        />
      </div>
    </div>
  </UPageCard>
</template>

<script setup lang="ts">
// Props
interface Props {
  enabled: boolean
  loading?: boolean
}

withDefaults(defineProps<Props>(), {
  loading: false
})

// Emits
const emit = defineEmits<{
  'update:enabled': [value: boolean]
  'save': [value: boolean]
}>()

// Handlers
const handleToggle = (value: boolean) => {
  emit('update:enabled', value)
  emit('save', value)
}
</script>
