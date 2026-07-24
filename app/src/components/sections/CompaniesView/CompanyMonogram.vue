<template>
  <div
    data-test="company-monogram"
    :data-role="role"
    class="flex shrink-0 items-center justify-center rounded-[10px] font-bold"
    :class="role === 'owner' ? 'bg-success/15 text-success' : 'bg-secondary/15 text-secondary'"
    :style="tileStyle"
  >
    {{ initials }}
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  name: string
  code?: string
  role: 'owner' | 'employee'
  size?: number
}

const props = withDefaults(defineProps<Props>(), {
  code: undefined,
  size: 34
})

const initials = computed(() => {
  if (props.code) return props.code.slice(0, 2).toUpperCase()
  return props.name.trim().slice(0, 2).toUpperCase()
})

const tileStyle = computed(() => ({
  width: `${props.size}px`,
  height: `${props.size}px`,
  fontSize: `${Math.round(props.size * 0.38)}px`
}))
</script>
