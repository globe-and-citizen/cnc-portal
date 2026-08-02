<template>
  <UCard data-test="treasury-recap">
    <div class="flex flex-wrap items-start justify-between gap-8">
      <div>
        <div class="text-muted text-[13px] font-medium">Total treasury across your companies</div>
        <div
          data-test="recap-total"
          class="text-default mt-1 text-4xl leading-tight font-extrabold tracking-tight"
        >
          {{ aggregate.totalLabel }}
        </div>
        <div v-if="polLabel" data-test="recap-pol" class="text-muted mt-1 font-mono text-[13px]">
          {{ polLabel }}
        </div>
      </div>

      <div class="flex items-start gap-7">
        <div>
          <div class="text-muted text-xs font-medium">You own · {{ ownerCount }}</div>
          <div data-test="recap-own" class="text-default mt-0.5 text-xl font-bold tracking-tight">
            {{ aggregate.ownLabel }}
          </div>
        </div>
        <div class="border-default self-stretch border-l" />
        <div>
          <div class="text-muted text-xs font-medium">Member · {{ memberCount }}</div>
          <div
            data-test="recap-member"
            class="text-default mt-0.5 text-xl font-bold tracking-tight"
          >
            {{ aggregate.memberLabel }}
          </div>
        </div>
      </div>
    </div>

    <div class="mt-5">
      <div class="mb-3.5 flex flex-wrap items-center justify-between gap-3">
        <span class="text-muted text-xs font-semibold">Distribution</span>
        <div class="border-default bg-default inline-flex gap-0.5 rounded-lg border p-0.5">
          <UButton
            v-for="option in modeOptions"
            :key="option.value"
            :data-test="`recap-mode-${option.value}`"
            :color="mode === option.value ? 'primary' : 'neutral'"
            :variant="mode === option.value ? 'solid' : 'ghost'"
            size="xs"
            :label="option.label"
            @click="mode = option.value"
          />
        </div>
      </div>
      <DistributionBar :segments="activeSegments" legend height="14px" />
    </div>
  </UCard>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { TreasuryAggregate } from '@/types'
import DistributionBar from '@/components/sections/CompaniesView/DistributionBar.vue'

type Mode = 'company' | 'token' | 'account'

interface Props {
  aggregate: TreasuryAggregate
  ownerCount?: number
  memberCount?: number
}

const props = withDefaults(defineProps<Props>(), {
  ownerCount: 0,
  memberCount: 0
})

const mode = ref<Mode>('company')

const modeOptions: { value: Mode; label: string }[] = [
  { value: 'company', label: 'By company' },
  { value: 'token', label: 'By token' },
  { value: 'account', label: 'By account' }
]

const polLabel = computed(() => {
  const label = (props.aggregate as { polLabel?: unknown }).polLabel
  return typeof label === 'string' && label.length ? label : ''
})

const activeSegments = computed(() => {
  if (mode.value === 'token') return props.aggregate.byToken
  if (mode.value === 'account') return props.aggregate.byAccount
  return props.aggregate.byCompany
})
</script>
