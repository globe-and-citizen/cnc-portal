<template>
  <div class="flex flex-col gap-5">
    <!-- Header -->
    <div>
      <div class="flex items-center gap-2.5">
        <h1 class="text-2xl font-bold tracking-tight">Repay — {{ round.name }}</h1>
        <UBadge :color="status.color" variant="subtle" :label="status.label" size="lg" />
      </div>
      <p class="text-muted mt-1.5 text-sm">
        Returns each lender's principal plus {{ round.rate }}% interest, distributed on-chain in one
        transaction from the team treasury.
      </p>
    </div>

    <div class="grid items-start gap-5" :class="isOwner ? 'lg:grid-cols-[1.55fr_1fr]' : ''">
      <CreditRepayBreakdownTable :rows="rows" :token="round.token" />

      <!-- Confirm -->
      <div v-if="isOwner" class="flex flex-col gap-4">
        <div
          class="border-primary/20 from-primary/5 to-default rounded-2xl border bg-gradient-to-br p-6 shadow-sm"
        >
          <div class="text-muted text-sm">Outstanding</div>
          <div class="mt-1.5 text-[34px] font-extrabold tracking-tight">
            {{ formatAmount(outstanding, round.token) }}
          </div>
          <div class="text-muted mt-1 text-xs">
            {{ formatAmount(principalTotal, round.token) }} principal +
            {{ formatAmount(interestTotal, round.token) }} interest, due at maturity
          </div>
        </div>

        <RepayAmountPanel
          ref="amountPanelRef"
          v-model:amount="amount"
          :outstanding="outstanding"
          :treasury-balance="treasuryBalance"
          :token="round.token"
        />

        <UAlert
          color="info"
          variant="soft"
          icon="heroicons:shield-check"
          title="On-chain repayment"
          description="Sends the amount above to every lender pro-rata, in one transaction from the team treasury."
        />

        <UAlert
          v-if="isStillRaising"
          color="warning"
          variant="soft"
          icon="i-lucide-circle-alert"
          description="This round hasn't reached its funding target yet — repayment opens once it's fully funded."
          data-test="repay-not-funded"
        />

        <UAlert
          v-if="!canRepayViaBank"
          color="warning"
          variant="soft"
          icon="i-lucide-circle-alert"
          description="Repayment is unavailable right now — the connected wallet isn't the treasury's owner."
          data-test="repay-bank-blocked"
        />

        <UAlert
          v-if="submission.errorMessage"
          color="error"
          variant="soft"
          icon="i-lucide-circle-alert"
          :description="submission.errorMessage"
          data-test="repay-error"
        />

        <div class="flex gap-3">
          <UButton
            :color="outstanding > 0 ? 'primary' : 'neutral'"
            size="xl"
            block
            icon="heroicons:check-circle"
            :label="submission.isSubmitting ? 'Signing…' : `Repay `"
            :loading="submission.isSubmitting"
            :disabled="
              submission.isSubmitting || numericAmount <= 0 || !isRepayable || !canRepayViaBank
            "
            data-test="confirm-repay"
            @click="confirmRepay"
          />
          <UButton
            variant="outline"
            color="neutral"
            size="xl"
            block
            label="Cancel"
            :disabled="submission.isSubmitting"
            data-test="cancel-repay"
            @click="emit('cancel')"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { formatAmount, repayableCeiling, statusMeta } from '@/utils'
import type { CreditRound, RoundStatus } from '@/types'
import CreditRepayBreakdownTable from './CreditRepayBreakdownTable.vue'
import type { RepayBreakdownRow } from './CreditRepayBreakdownTable.vue'
import RepayAmountPanel from './RepayAmountPanel.vue'

interface RepaymentSubmission {
  isSubmitting: boolean
  errorMessage: string | null
}

interface Props {
  round: CreditRound
  rows: RepayBreakdownRow[]
  outstanding: number
  treasuryBalance: number | null
  isOwner: boolean
  canRepayViaBank: boolean
  submission: RepaymentSubmission
}

const props = defineProps<Props>()
const emit = defineEmits<{
  repay: [amount: string]
  cancel: []
}>()

const status = computed(() => statusMeta(props.round.status))

// Mirrors FixedReturn.sol's repayLenders gate (OfferState.Funded/Repaying only) —
// without this, the tab was reachable and submittable on a still-Open round (raising,
// not yet at its funding target), wasting a transaction on a guaranteed
// FixedReturn__OfferNotFunded() revert that the error classifier can't decode into a
// friendly message (it only has Bank.json's ABI loaded, not FixedReturn's).
const REPAYABLE_STATUSES: RoundStatus[] = ['funded', 'active', 'overdue']
const isRepayable = computed(() => REPAYABLE_STATUSES.includes(props.round.status))

// The "hasn't reached its funding target yet" wording only makes sense while the round
// is still actively raising — a 'stalled'/'refunded'/'repaid' round already resolved one
// way or the other, so repeating "repayment opens once it's fully funded" there would be
// inaccurate (refunded never will be; repaid already was).
const isStillRaising = computed(() => props.round.status === 'open')
const principalTotal = computed(() => props.rows.reduce((sum, lender) => sum + lender.amount, 0))
const interestTotal = computed(() => props.rows.reduce((sum, lender) => sum + lender.interest, 0))
const amount = ref('')
const numericAmount = computed(() => Math.max(0, Number(amount.value) || 0))
const amountPanelRef = ref<{ validate: () => boolean } | null>(null)

// Prefill once with the full repayable amount — the first click still repays everything,
// matching the previous one-shot-only behavior, while leaving the amount editable.
// `immediate: true` matters: once outstanding/treasuryBalance resolve synchronously
// (e.g. mocked data already populated before mount), there's no further "change" for a
// non-immediate watch to observe, so it would otherwise never fire.
const amountInitialized = ref(false)
watch(
  () => repayableCeiling(props.outstanding, props.treasuryBalance),
  (value) => {
    if (!amountInitialized.value && value > 0) {
      amount.value = String(value)
      amountInitialized.value = true
    }
  },
  { immediate: true }
)

function confirmRepay() {
  if (numericAmount.value <= 0 || !isRepayable.value || !props.canRepayViaBank) return
  if (!amountPanelRef.value?.validate()) return
  emit('repay', amount.value)
}
</script>
