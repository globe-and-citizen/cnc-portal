<template>
  <div :style="ringStyle">
    <div class="flex flex-col items-center justify-center bg-white" :style="holeStyle">
      <div
        class="leading-none font-extrabold tracking-tight text-[#0a7a52]"
        :style="{ fontSize: `${pctFontSize}px` }"
      >
        {{ Math.round(clampedPercent) }}%
      </div>
      <div class="mt-1 text-[11px] text-[#9aaba2]">{{ label }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{ percent: number; label: string; size?: number }>(), {
  size: 152
})

const clampedPercent = computed(() => Math.min(100, Math.max(0, props.percent)))
const holeSize = computed(() => Math.round(props.size * 0.8))
const pctFontSize = computed(() => Math.round(props.size * 0.25))

const ringStyle = computed(() => ({
  width: `${props.size}px`,
  height: `${props.size}px`,
  borderRadius: '999px',
  background: `conic-gradient(#00bf7a ${clampedPercent.value * 3.6}deg, #eef3f0 0deg)`,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center'
}))

const holeStyle = computed(() => ({
  width: `${holeSize.value}px`,
  height: `${holeSize.value}px`,
  borderRadius: '999px'
}))
</script>
