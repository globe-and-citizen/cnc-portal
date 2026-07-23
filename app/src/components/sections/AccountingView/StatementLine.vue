<template>
  <div
    class="group -mx-2 flex items-center justify-between gap-3 rounded-lg px-2 py-3.5"
    :class="drillable ? 'hover:bg-elevated/60 cursor-pointer transition-colors' : ''"
    @click="drillable && emit('drilldown', line)"
  >
    <div class="flex min-w-0 items-center">
      <button
        v-if="drillable"
        type="button"
        class="focus-visible:ring-neutral truncate rounded text-left text-sm focus-visible:ring-2 focus-visible:outline-none"
        :data-test="`${dataTestPrefix}-drilldown-${line.account ?? 'aggregate'}`"
        @click.stop="emit('drilldown', line)"
      >
        {{ line.label }}
      </button>
      <span v-else class="truncate text-sm" :class="labelClass">{{ line.label }}</span>
    </div>

    <div class="flex flex-shrink-0 items-center gap-3">
      <span
        v-if="drillable"
        class="bg-neutral/10 text-neutral inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold opacity-0 transition-opacity duration-150 group-focus-within:opacity-100 group-hover:opacity-100"
      >
        <UIcon name="i-heroicons-magnifying-glass" class="size-3.5" />
        Details
      </span>
      <span class="text-sm font-semibold tabular-nums" :class="valueClass">{{ line.value }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { StatementLineView } from '@/utils/accounting/presenter'

const props = withDefaults(
  defineProps<{
    line: StatementLineView
    valueClass?: string
    labelClass?: string
    dataTestPrefix?: string
  }>(),
  { valueClass: '', labelClass: '', dataTestPrefix: 'statement' }
)

const emit = defineEmits<{ drilldown: [line: StatementLineView] }>()

const drillable = computed(() => Boolean(props.line.account || props.line.accounts?.length))
</script>
