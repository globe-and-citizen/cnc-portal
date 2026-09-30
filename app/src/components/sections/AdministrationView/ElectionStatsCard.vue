<template>
  <div class="bg-elevated border-default flex flex-1 gap-4 rounded-lg border p-4 shadow-xs">
    <div
      class="flex aspect-square h-12 w-12 items-center justify-center rounded-full p-1"
      :class="TINTS[color]"
    >
      <IconifyIcon :icon="`heroicons:${icon}-solid`" class="h-7 w-7" />
    </div>
    <div>
      <p class="text-muted text-sm font-bold">{{ title }}</p>
      <p class="text-highlighted text-xl font-semibold">
        {{ data }}
      </p>
    </div>
  </div>
</template>
<script setup lang="ts">
import { Icon as IconifyIcon } from '@iconify/vue'

type StatColor = 'primary' | 'success' | 'error' | 'info'

/** Theme tokens, so the tint follows light and dark mode alike. */
const TINTS: Record<StatColor, string> = {
  primary: 'bg-primary/10 text-primary',
  success: 'bg-success/10 text-success',
  error: 'bg-error/10 text-error',
  info: 'bg-info/10 text-info'
}

defineProps<{
  data: number | string | Date
  icon: string
  color: StatColor
  title: string
}>()
</script>
