<template>
  <div data-test="distribution-bar">
    <div class="bg-muted flex w-full gap-px overflow-hidden rounded-full" :style="{ height }">
      <div
        v-for="(segment, index) in validSegments"
        :key="`${segment.label}-${index}`"
        data-test="distribution-segment"
        :data-label="segment.label"
        class="h-full first:rounded-l-full last:rounded-r-full"
        :style="{ width: `${segment.pct}%`, background: segment.color }"
      />
    </div>

    <div
      v-if="legend && validSegments.length"
      data-test="distribution-legend"
      class="mt-2 flex flex-wrap gap-x-3 gap-y-1"
    >
      <span
        v-for="(segment, index) in validSegments"
        :key="`legend-${segment.label}-${index}`"
        data-test="distribution-legend-item"
        class="text-default inline-flex items-center gap-1.5 text-xs"
      >
        <span class="h-[7px] w-[7px] shrink-0 rounded-sm" :style="{ background: segment.color }" />
        {{ segment.label }} {{ segment.pct }}%
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

type Segment = { label: string; pct: number; color: string }

interface Props {
  segments: Segment[]
  legend?: boolean
  height?: string
}

const props = withDefaults(defineProps<Props>(), {
  legend: false,
  height: '7px'
})

const validSegments = computed(() =>
  (props.segments ?? []).filter((segment) => segment && segment.pct > 0)
)
</script>
