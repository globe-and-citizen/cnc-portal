<template>
  <div class="inline-flex flex-wrap gap-0.5" :class="containerClass">
    <span
      v-for="item in items"
      :key="item.value"
      class="inline-flex cursor-pointer items-center gap-1.5 rounded-md whitespace-nowrap transition-colors"
      :class="[sizeClass, modelValue === item.value ? activeClass : `font-medium ${inactiveClass}`]"
      :data-test="`pill-${item.value}`"
      @click="emit('update:modelValue', item.value)"
    >
      <UIcon v-if="item.icon" :name="item.icon" class="size-4" />
      {{ item.label }}
    </span>
  </div>
</template>

<script setup lang="ts">
export interface PillItem {
  value: string
  label: string
  icon?: string
}

withDefaults(
  defineProps<{
    items: PillItem[]
    modelValue: string
    /** Container chrome (background / border / padding around the pill group). */
    containerClass?: string
    /** Per-pill padding + font-size. */
    sizeClass?: string
    /** Classes applied to the selected pill. */
    activeClass?: string
    /** Classes applied to unselected pills. */
    inactiveClass?: string
  }>(),
  {
    containerClass: '',
    sizeClass: 'px-3 py-1 text-xs',
    activeClass: 'font-semibold bg-primary/10 text-primary',
    inactiveClass: 'text-muted hover:text-default'
  }
)

const emit = defineEmits<{ 'update:modelValue': [value: string] }>()
</script>
