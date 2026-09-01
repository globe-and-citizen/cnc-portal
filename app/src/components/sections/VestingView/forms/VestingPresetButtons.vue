<template>
  <div>
    <p :id="labelId" class="mb-2 text-sm font-medium">{{ label }}</p>
    <div class="flex flex-wrap gap-2" role="radiogroup" :aria-labelledby="labelId">
      <UButton
        v-for="preset in presets"
        :key="preset.value"
        type="button"
        size="sm"
        :color="selected === preset.value ? 'primary' : 'neutral'"
        :variant="selected === preset.value ? 'soft' : 'outline'"
        :label="preset.label"
        role="radio"
        :aria-checked="selected === preset.value"
        :data-test="`${testPrefix}-${preset.value}`"
        @click="emit('select', preset.value)"
      />
      <UButton
        type="button"
        size="sm"
        :color="customActive ? 'primary' : 'neutral'"
        :variant="customActive ? 'soft' : 'outline'"
        label="Custom"
        role="radio"
        :aria-checked="customActive"
        :data-test="`${testPrefix}-custom`"
        @click="emit('select', null)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
interface Preset {
  label: string
  value: number
}

interface Props {
  label: string
  testPrefix: string
  presets: Preset[]
  selected: number | null
  customActive: boolean
}

const props = defineProps<Props>()
const emit = defineEmits<{
  select: [value: number | null]
}>()

const labelId = `${props.testPrefix}-presets-label`
</script>
