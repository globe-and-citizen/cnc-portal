<template>
  <div class="flex flex-wrap items-start justify-between gap-4">
    <div class="min-w-0">
      <div class="flex flex-wrap items-center gap-2.5">
        <h1 class="text-2xl font-bold tracking-tight">{{ round.name }}</h1>
        <UBadge :color="status.color" variant="subtle" :label="status.label" size="lg" />
        <span
          class="border-default bg-muted inline-flex items-center gap-1.5 rounded-full border py-1 pr-2.5 pl-1.5 text-xs font-semibold"
        >
          <span
            class="bg-primary/15 text-primary flex h-4 w-4 items-center justify-center rounded-full text-[8px] font-bold"
          >
            $
          </span>
          {{ round.token }}
        </span>
      </div>
      <p class="text-muted mt-1.5 max-w-2xl text-sm leading-relaxed">{{ round.desc }}</p>
    </div>
    <div class="flex items-center gap-2.5">
      <slot name="actions" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { statusMeta } from '@/utils/communityCredit/model'
import type { CreditRound } from '@/types'

const props = defineProps<{ round: CreditRound }>()

const status = computed(() => statusMeta(props.round.status))
</script>
