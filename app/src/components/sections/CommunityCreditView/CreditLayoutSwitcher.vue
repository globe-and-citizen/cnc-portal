<template>
  <div
    class="border-primary/30 bg-primary/5 flex items-center gap-2.5 rounded-xl border border-dashed px-3.5 py-2.5"
    data-test="credit-layout-switcher"
  >
    <UIcon name="heroicons:swatch" class="text-primary size-4" />
    <span class="text-primary text-xs font-semibold">Layout exploration</span>
    <div class="border-default bg-default ml-auto inline-flex gap-0.5 rounded-lg border p-0.5">
      <button
        v-for="opt in options"
        :key="opt.value"
        type="button"
        :class="pillClass(opt.value)"
        :data-test="`variant-${opt.value}`"
        @click="store.setVariant(opt.value)"
      >
        {{ opt.label }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useCommunityCreditStore } from '@/stores'
import type { RoundDetailVariant } from '@/types'

const store = useCommunityCreditStore()

const options: { value: RoundDetailVariant; label: string }[] = [
  { value: 'ledger', label: 'Ledger' },
  { value: 'gauge', label: 'Gauge' },
  { value: 'timeline', label: 'Timeline' },
  { value: 'repay', label: 'Repay' }
]

function pillClass(value: RoundDetailVariant) {
  return [
    'cursor-pointer rounded-md px-3 py-1 text-xs font-medium transition-colors',
    store.variant === value
      ? 'bg-primary/10 font-semibold text-primary'
      : 'text-muted hover:text-default'
  ]
}
</script>
