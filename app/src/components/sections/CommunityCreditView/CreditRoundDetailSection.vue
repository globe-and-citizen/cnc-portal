<template>
  <CreditRoundHeader :round="round">
    <template #actions>
      <slot name="actions" />
    </template>
  </CreditRoundHeader>
  <UTabs
    v-model="activeVariant"
    :items="ROUND_VARIANT_TAB_ITEMS"
    size="xs"
    class="w-full"
    :ui="{
      list: 'border-primary/30 bg-primary/5 items-center gap-0.5 rounded-xl border border-dashed px-3.5 py-2.5',
      indicator: 'hidden',
      trigger: 'grow-0 shrink-0 data-[state=active]:bg-primary/10 data-[state=active]:text-primary'
    }"
  >
    <template #list-leading>
      <div class="text-primary mr-auto flex items-center gap-2.5 text-xs font-semibold">
        <UIcon name="heroicons:swatch" class="size-4" />
        Layout exploration
      </div>
    </template>
    <template #ledger>
      <CreditRoundLedger :round="round" />
    </template>
    <template #gauge>
      <CreditRoundGauge :round="round" />
    </template>
    <template #timeline>
      <CreditRoundTimeline :round="round" />
    </template>
    <template #repay>
      <CreditRepayPanel
        :round="round"
        :rows="repaymentRows"
        :is-owner="isOwner"
        :repayment="repayment"
        @repay="emit('repay', $event)"
        @cancel="emit('cancel')"
      />
    </template>
  </UTabs>
  <CreditAccountTransactions
    v-if="fixedReturnAddress"
    :fixed-return-address="fixedReturnAddress"
    :round-id="round.id"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { ROUND_VARIANT_TAB_ITEMS, roundToDisplayPrecision } from '@/utils'
import type { CreditRound, RoundDetailVariant } from '@/types'
import CreditAccountTransactions from './CreditAccountTransactions.vue'
import CreditRepayPanel from './CreditRepayPanel.vue'
import type { RepaymentPanelState } from './CreditRepayPanel.vue'
import type { RepayBreakdownRow } from './CreditRepayBreakdownTable.vue'
import CreditRoundGauge from './CreditRoundGauge.vue'
import CreditRoundHeader from './CreditRoundHeader.vue'
import CreditRoundLedger from './CreditRoundLedger.vue'
import CreditRoundTimeline from './CreditRoundTimeline.vue'

interface Props {
  round: CreditRound
  repayment: RepaymentPanelState
  isOwner: boolean
  fixedReturnAddress?: string
}

const props = defineProps<Props>()
const emit = defineEmits<{
  repay: [amount: string]
  cancel: []
}>()
const activeVariant = defineModel<RoundDetailVariant>({ required: true })

const repaymentRows = computed<RepayBreakdownRow[]>(() =>
  props.round.lenders.map((lender) => ({
    ...lender,
    interest: lender.expected - lender.amount,
    total: lender.expected,
    remaining: Math.max(0, roundToDisplayPrecision(lender.expected - lender.paid))
  }))
)
</script>
