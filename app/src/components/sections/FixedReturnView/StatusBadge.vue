<template>
  <span
    class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap"
    :style="{ background: meta.bg, color: meta.color }"
  >
    <span class="w-1.5 h-1.5 rounded-full" :style="{ background: meta.dot }"></span>
    {{ meta.label }}
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'

type Status = 'on-track' | 'overdue' | 'completed' | 'paid' | 'upcoming' | 'open' | 'funded' | 'closed' | 'partial'

const props = defineProps<{ status: Status }>()

const meta = computed(() => {
  switch (props.status) {
    case 'on-track':  return { label: 'On track',  bg: '#e6f8f1', color: '#0a7a52', dot: '#00bf7a' }
    case 'overdue':   return { label: 'Overdue',   bg: '#ffe9e3', color: '#c2381a', dot: '#ff5630' }
    case 'completed': return { label: 'Completed', bg: '#e6f8f1', color: '#0a7a52', dot: '#36b37e' }
    case 'paid':      return { label: 'Paid',      bg: '#e6f8f1', color: '#0a7a52', dot: '#36b37e' }
    case 'upcoming':  return { label: 'Upcoming',  bg: '#fff6e0', color: '#b07c00', dot: '#ffab00' }
    case 'open':      return { label: 'Open',      bg: '#e6f8f1', color: '#0a7a52', dot: '#00bf7a' }
    case 'funded':    return { label: 'Funded',    bg: '#ebf0ff', color: '#2b50c8', dot: '#3366ff' }
    case 'closed':    return { label: 'Closed',    bg: '#eef1f6', color: '#566377', dot: '#8a99ab' }
    case 'partial':   return { label: 'In progress', bg: '#fff6e0', color: '#b07c00', dot: '#ffab00' }
    default:          return { label: props.status, bg: '#eef1f6', color: '#566377', dot: '#8a99ab' }
  }
})
</script>
