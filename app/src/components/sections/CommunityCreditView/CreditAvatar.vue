<template>
  <span
    class="border-default inline-flex flex-none items-center justify-center rounded-full border-2 font-bold text-white"
    :style="style"
    aria-hidden="true"
  >
    {{ initials }}
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { avatarStyle, creditInitials } from '@/utils'

const props = withDefaults(
  defineProps<{
    name: string
    gradient: string
    size?: number
  }>(),
  { size: 30 }
)

const initials = computed(() => creditInitials(props.name))
const style = computed(() => ({
  ...avatarStyle(props.gradient),
  width: `${props.size}px`,
  height: `${props.size}px`,
  fontSize: props.size <= 26 ? '9px' : '11px'
}))
</script>
