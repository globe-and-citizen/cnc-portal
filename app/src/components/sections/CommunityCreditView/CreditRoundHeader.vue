<template>
  <div class="flex flex-col gap-4.5">
    <button
      type="button"
      class="text-muted hover:text-default flex cursor-pointer items-center gap-2 text-sm"
      data-test="round-back"
      @click="emit('back')"
    >
      <UIcon name="heroicons:arrow-left" class="size-4" />
      All rounds
    </button>

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
        <UButton
          v-for="action in ctas"
          :key="action.test"
          :color="action.color"
          :variant="action.variant"
          :icon="action.icon"
          :label="action.label"
          :loading="action.loading"
          :data-test="action.test"
          @click="action.run"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { statusMeta } from '@/utils'
import type { CreditRound, Cta } from '@/types'

interface Props {
  round: CreditRound
  status: ReturnType<typeof statusMeta>
  ctas: Cta[]
}

defineProps<Props>()
const emit = defineEmits<{ back: [] }>()
</script>
