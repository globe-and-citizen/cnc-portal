<template>
  <div class="flex flex-col gap-5">
    <div>
      <div class="flex items-center gap-2.5">
        <h1 class="text-2xl font-bold tracking-tight">Repay — {{ round.name }}</h1>
        <UBadge :color="status.color" variant="subtle" :label="status.label" size="lg" />
      </div>
      <p class="text-muted mt-1.5 text-sm">
        Returns each lender's principal plus {{ round.rate }}% interest, distributed on-chain in one
        transaction from the company treasury.
      </p>
    </div>

    <div class="grid items-start gap-5" :class="isOwner ? 'lg:grid-cols-[1.55fr_1fr]' : ''">
      <CreditRepayBreakdownTable :rows="rows" :token="round.token" />

      <div v-if="isOwner" class="flex flex-col gap-4">
        <div
          class="border-primary/20 from-primary/5 to-default rounded-2xl border bg-gradient-to-br p-6 shadow-sm"
        >
          <div class="text-muted text-sm">Outstanding</div>
          <div class="mt-1.5 text-[34px] font-extrabold tracking-tight">
            {{ outstanding === null ? '—' : formatAmount(outstanding, round.token) }}
          </div>
          <div class="text-muted mt-1 text-xs">
            {{ formatAmount(principalTotal, round.token) }} principal +
            {{ formatAmount(interestTotal, round.token) }} interest, due at maturity
          </div>
        </div>

        <div>
          <div class="mb-1.5 flex items-center justify-between">
            <label class="text-sm font-medium" for="repay-amount">Amount to repay now</label>
            <span class="text-muted text-xs">
              Treasury:
              <span data-test="repay-treasury-balance">{{
                treasuryBalance === null ? '—' : formatAmount(treasuryBalance, round.token)
              }}</span>
            </span>
          </div>
          <UInput
            id="repay-amount"
            v-model="amount"
            type="number"
            min="0"
            placeholder="0"
            size="xl"
            class="w-full text-lg font-bold"
            data-test="repay-amount-input"
          >
            <template #trailing>
              <span class="text-muted text-sm font-bold">{{ round.token }}</span>
            </template>
          </UInput>
          <div class="mt-2.5 flex gap-1.5">
            <UButton
              v-for="quickAmount in quickAmounts"
              :key="quickAmount.label"
              variant="outline"
              color="neutral"
              size="xs"
              :label="quickAmount.label"
              class="flex-1 justify-center"
              :data-test="`repay-quick-${quickAmount.label}`"
              @click="amount = String(quickAmount.value)"
            />
          </div>
        </div>

        <UAlert
          color="info"
          variant="soft"
          icon="heroicons:shield-check"
          title="On-chain repayment"
          description="Sends the amount above to every lender pro-rata, in one transaction from the company treasury."
        />

        <UAlert
          v-if="!repayment.isReady"
          color="info"
          variant="soft"
          icon="i-lucide-loader-circle"
          description="Repayment details are still loading."
          data-test="repay-details-loading"
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
          v-if="repayment.isReady && !repayment.canRepayViaBank"
          color="warning"
          variant="soft"
          icon="i-lucide-circle-alert"
          description="Repayment is unavailable right now — the connected wallet isn't the treasury's owner."
          data-test="repay-bank-blocked"
        />

        <UAlert
          v-if="repayment.errorMessage"
          color="error"
          variant="soft"
          icon="i-lucide-circle-alert"
          :description="repayment.errorMessage"
          data-test="repay-error"
        />

        <div class="flex gap-3">
          <UButton
            :color="outstanding && outstanding > 0 ? 'primary' : 'neutral'"
            size="xl"
            block
            icon="heroicons:check-circle"
            :label="repayment.isSubmitting ? 'Signing…' : 'Repay'"
            :loading="repayment.isSubmitting"
            :disabled="isSubmitDisabled"
            data-test="confirm-repay"
            @click="confirmRepay"
          />
          <UButton
            variant="outline"
            color="neutral"
            size="xl"
            block
            label="Cancel"
            :disabled="repayment.isSubmitting"
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
import { formatAmount, repayableCeiling, roundToDisplayPrecision, statusMeta } from '@/utils'
import type { CreditRound } from '@/types'
import CreditRepayBreakdownTable from './CreditRepayBreakdownTable.vue'
import type { RepayBreakdownRow } from './CreditRepayBreakdownTable.vue'

export interface RepaymentPanelState {
  outstanding: number | null
  treasuryBalance: number | null
  isReady: boolean
  isRepayable: boolean
  canRepayViaBank: boolean
  isSubmitting: boolean
  errorMessage: string | null
}

interface Props {
  round: CreditRound
  rows: RepayBreakdownRow[]
  isOwner: boolean
  repayment: RepaymentPanelState
}

const props = defineProps<Props>()
const emit = defineEmits<{
  repay: [amount: string]
  cancel: []
}>()

const status = computed(() => statusMeta(props.round.status))
const outstanding = computed(() => props.repayment.outstanding)
const treasuryBalance = computed(() => props.repayment.treasuryBalance)
const isStillRaising = computed(() => props.round.status === 'open')
const principalTotal = computed(() => props.rows.reduce((sum, lender) => sum + lender.amount, 0))
const interestTotal = computed(() => props.rows.reduce((sum, lender) => sum + lender.interest, 0))
const amount = ref('')
const numericAmount = computed(() => Math.max(0, Number(amount.value) || 0))
const maxRepayable = computed(() =>
  outstanding.value === null ? 0 : repayableCeiling(outstanding.value, treasuryBalance.value)
)
const quickAmounts = computed(() => [
  { label: '25%', value: roundToDisplayPrecision(maxRepayable.value * 0.25) },
  { label: '50%', value: roundToDisplayPrecision(maxRepayable.value * 0.5) },
  { label: 'Max', value: maxRepayable.value }
])
const isSubmitDisabled = computed(
  () =>
    props.repayment.isSubmitting ||
    !props.repayment.isReady ||
    !props.repayment.isRepayable ||
    !props.repayment.canRepayViaBank ||
    outstanding.value === null ||
    outstanding.value <= 0 ||
    numericAmount.value <= 0
)

const amountInitialized = ref(false)
watch(
  maxRepayable,
  (value) => {
    if (!amountInitialized.value && value > 0) {
      amount.value = String(value)
      amountInitialized.value = true
    }
  },
  { immediate: true }
)

function confirmRepay() {
  if (isSubmitDisabled.value) return
  emit('repay', amount.value)
}
</script>
