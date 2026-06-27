<template>
  <div
    class="border-default bg-default flex flex-col gap-4 rounded-2xl border p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg"
    data-test="credit-round-card"
  >
    <!-- Title + status -->
    <div class="flex cursor-pointer items-start justify-between gap-2.5" @click="emit('open')">
      <div class="min-w-0">
        <div class="text-highlighted text-base font-bold">{{ round.name }}</div>
        <div class="text-muted mt-0.5 line-clamp-2 text-xs leading-relaxed">{{ round.desc }}</div>
      </div>
      <UBadge :color="status.color" variant="subtle" :label="status.label" class="flex-none" />
    </div>

    <!-- Funding progress -->
    <div>
      <div class="mb-2 flex items-baseline justify-between">
        <span class="text-sm">
          <strong class="text-lg font-extrabold tracking-tight">{{
            formatAmount(round.raised)
          }}</strong>
          <span class="text-muted"> of {{ formatAmount(round.target) }}</span>
        </span>
        <span class="text-primary text-xs font-bold">{{ pct }}%</span>
      </div>
      <div class="bg-muted h-2.5 overflow-hidden rounded-full">
        <div
          class="bg-primary h-full rounded-full transition-all"
          :style="{ width: pct + '%' }"
        ></div>
      </div>
      <div class="text-muted mt-1.5 text-[11px]">{{ progressNote }}</div>
    </div>

    <!-- Terms -->
    <div class="flex flex-wrap gap-1.5">
      <span
        v-for="term in terms"
        :key="term.text"
        class="border-default bg-muted inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold"
      >
        <UIcon :name="term.icon" class="text-dimmed size-3" />
        {{ term.text }}
      </span>
    </div>

    <!-- Lenders + CTA -->
    <div class="border-default/60 mt-auto flex items-center justify-between border-t pt-3">
      <div class="flex items-center">
        <CreditAvatar
          v-for="(lender, i) in visibleLenders"
          :key="lender.addr"
          :name="lender.name"
          :gradient="lender.gradient"
          :size="26"
          :class="i > 0 ? '-ml-2' : ''"
        />
        <span
          v-if="extraLenders > 0"
          class="border-default bg-primary/10 text-primary -ml-2 inline-flex h-[26px] w-[26px] flex-none items-center justify-center rounded-full border-2 text-[9px] font-bold"
        >
          +{{ extraLenders }}
        </span>
        <span class="text-muted ml-2.5 text-[11px]">{{ round.lenders.length }} lenders</span>
      </div>
      <div class="flex flex-shrink-0 gap-1.5">
        <UButton
          v-for="action in ctas"
          :key="action.event"
          :color="action.color"
          :variant="action.variant"
          size="sm"
          :icon="action.icon"
          :label="action.label"
          :data-test="`round-cta-${action.event}`"
          @click="onCta(action.event)"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useCommunityCreditStore } from '@/stores'
import { formatAmount, percentOf, statusMeta } from '@/utils'
import type { CreditRound } from '@/types'
import CreditAvatar from './CreditAvatar.vue'

const props = defineProps<{ round: CreditRound }>()
const emit = defineEmits<{ open: []; lend: []; repay: [] }>()

const store = useCommunityCreditStore()

const status = computed(() => statusMeta(props.round.status))
const pct = computed(() => percentOf(props.round.raised, props.round.target))
const visibleLenders = computed(() => props.round.lenders.slice(0, 3))
const extraLenders = computed(() => props.round.lenders.length - 3)

const progressNote = computed(() => {
  const remaining = props.round.target - props.round.raised
  if (props.round.status === 'open') {
    return `${formatAmount(remaining)} to go · closes ${props.round.deadline}`
  }
  if (props.round.status === 'funded') return `Target reached · matures ${props.round.maturity}`
  return `Fully funded · matures ${props.round.maturity}`
})

const terms = computed(() => [
  { icon: 'heroicons:receipt-percent', text: `${props.round.rate}% interest` },
  { icon: 'heroicons:clock', text: `${props.round.period} days` },
  {
    icon: props.round.restricted ? 'heroicons:lock-closed' : 'heroicons:globe-alt',
    text: props.round.restricted ? 'Restricted' : 'Open to all'
  }
])

type CardCtaEvent = 'open' | 'lend' | 'repay'
type Cta = {
  label: string
  icon: string
  event: CardCtaEvent
  color: 'primary' | 'neutral'
  variant: 'solid' | 'soft'
}

const MANAGE: Cta = {
  label: 'Manage',
  icon: 'heroicons:cog-6-tooth',
  event: 'open',
  color: 'neutral',
  variant: 'soft'
}
const LEND: Cta = {
  label: 'Lend',
  icon: 'heroicons:hand-raised',
  event: 'lend',
  color: 'primary',
  variant: 'solid'
}

const ctas = computed<Cta[]>(() => {
  const { status: s } = props.round
  // Open rounds are lendable by anyone. The owner is a member too, so they keep
  // a Manage action alongside the Lend action.
  if (s === 'open') {
    return store.isOwner ? [MANAGE, LEND] : [LEND]
  }
  // Funded / in repayment: the owner repays, everyone else just views.
  if (store.isOwner) {
    return [
      {
        label: 'Repay',
        icon: 'heroicons:arrow-uturn-left',
        event: 'repay',
        color: 'neutral',
        variant: 'soft'
      }
    ]
  }
  return [
    {
      label: 'View',
      icon: 'heroicons:arrow-right',
      event: 'open',
      color: 'neutral',
      variant: 'soft'
    }
  ]
})

function onCta(event: CardCtaEvent) {
  switch (event) {
    case 'lend':
      return emit('lend')
    case 'repay':
      return emit('repay')
    default:
      return emit('open')
  }
}
</script>
