<template>
  <Teleport to="body">
    <div
      v-if="round"
      class="fixed inset-0 z-50 flex items-center justify-center p-5"
      style="background: rgba(8, 32, 24, 0.45)"
      data-test="credit-lend-modal"
      @click="emit('close')"
    >
      <div
        ref="panelRef"
        role="dialog"
        aria-modal="true"
        aria-labelledby="credit-lend-title"
        tabindex="-1"
        class="bg-default w-full max-w-md overflow-hidden rounded-2xl"
        style="box-shadow: 0 24px 60px rgba(8, 32, 24, 0.35)"
        @click.stop
      >
        <!-- Header -->
        <div class="border-default border-b px-6 py-4.5">
          <h2 id="credit-lend-title" class="text-lg font-semibold">Lend to {{ round.name }}</h2>
          <p class="text-muted mt-1 text-sm">{{ subtitle }}</p>
        </div>

        <div class="flex flex-col gap-4.5 px-6 py-5">
          <!-- Remaining + cap tiles -->
          <div class="flex gap-2.5">
            <div class="bg-muted flex-1 rounded-xl px-3.5 py-3">
              <div class="text-muted text-[11px] font-semibold">Remaining</div>
              <div class="mt-0.5 text-base font-bold">
                {{ formatAmount(remaining, round.token) }}
              </div>
            </div>
            <div class="bg-muted flex-1 rounded-xl px-3.5 py-3">
              <div class="text-muted text-[11px] font-semibold">{{ capLabel }}</div>
              <div class="mt-0.5 text-base font-bold">{{ capValue }}</div>
            </div>
          </div>

          <!-- Amount input -->
          <div>
            <label class="mb-1.5 block text-sm font-medium" for="credit-lend-amount">
              Your contribution
            </label>
            <div class="relative">
              <input
                id="credit-lend-amount"
                v-model="amount"
                type="number"
                min="0"
                placeholder="0"
                class="border-default bg-default focus:border-primary focus:ring-primary/20 h-[46px] w-full rounded-lg border pr-14 pl-3 text-lg font-bold outline-none focus:ring-3"
                data-test="lend-amount-input"
              />
              <span
                class="text-muted absolute top-1/2 right-3.5 -translate-y-1/2 text-sm font-bold"
              >
                {{ round.token }}
              </span>
            </div>
            <div class="mt-2.5 flex gap-1.5">
              <button
                v-for="q in quick"
                :key="q.label"
                type="button"
                class="border-default bg-muted hover:bg-elevated flex-1 cursor-pointer rounded-lg border py-1.5 text-center text-xs font-semibold transition-colors"
                @click="amount = String(q.value)"
              >
                {{ q.label }}
              </button>
            </div>
          </div>

          <!-- Projected return -->
          <div
            class="border-primary/20 from-primary/5 to-default rounded-xl border bg-gradient-to-br p-4"
          >
            <div class="text-primary mb-2.5 text-xs font-semibold">Your projected return</div>
            <div class="flex flex-col gap-2">
              <div class="flex justify-between text-sm">
                <span class="text-muted">You lend</span>
                <span class="font-semibold">{{ formatAmount(numericAmount, round.token) }}</span>
              </div>
              <div class="flex justify-between text-sm">
                <span class="text-muted">Interest · {{ round.rate }}%</span>
                <span class="text-primary font-semibold"
                  >+ {{ formatAmount(interest, round.token) }}</span
                >
              </div>
              <div
                class="border-primary/20 flex items-baseline justify-between border-t border-dashed pt-2.5"
              >
                <span class="text-sm font-semibold">You receive at maturity</span>
                <span class="text-xl font-extrabold">{{ formatAmount(total, round.token) }}</span>
              </div>
            </div>
            <div class="text-muted mt-2 text-[11px]">{{ maturityNote }}</div>
          </div>
        </div>

        <!-- Footer -->
        <div class="border-default flex justify-end gap-2 border-t px-6 py-3.5">
          <UButton variant="ghost" color="neutral" label="Cancel" @click="emit('close')" />
          <UButton
            color="primary"
            icon="heroicons:hand-raised"
            :label="confirmLabel"
            :disabled="numericAmount <= 0"
            data-test="lend-confirm"
            @click="confirm"
          />
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { formatAmount } from '@/utils'
import type { CreditRound } from '@/types'

const props = defineProps<{ round: CreditRound | null }>()
const emit = defineEmits<{ close: []; lend: [amount: number] }>()

const amount = ref('')
const panelRef = ref<HTMLElement | null>(null)

const numericAmount = computed(() => Math.max(0, Number(amount.value) || 0))
const remaining = computed(() => (props.round ? props.round.target - props.round.raised : 0))

/** Amount the current user has already lent to this round. */
const myPosition = computed(() => props.round?.lenders.find((l) => l.you)?.amount ?? 0)
const capLeft = computed(() =>
  props.round?.cap != null ? Math.max(0, props.round.cap - myPosition.value) : null
)

const subtitle = computed(() =>
  props.round
    ? `${props.round.rate}% interest · repaid ${props.round.maturity || 'at maturity'}`
    : ''
)
const capLabel = computed(() => (props.round?.cap ? 'Your cap left' : 'Per-lender cap'))
const capValue = computed(() =>
  props.round?.cap != null ? formatAmount(capLeft.value ?? 0, props.round.token) : 'No cap'
)

const interest = computed(() => (props.round ? (numericAmount.value * props.round.rate) / 100 : 0))
const total = computed(() => numericAmount.value + interest.value)

const quick = computed(() => {
  const max = capLeft.value != null ? Math.min(capLeft.value, remaining.value) : remaining.value
  return [
    { label: '25%', value: Math.round(remaining.value * 0.25) },
    { label: '50%', value: Math.round(remaining.value * 0.5) },
    { label: 'Max', value: max }
  ]
})

const maturityNote = computed(() =>
  props.round
    ? `Capital and interest returned ${props.round.maturity ? 'on ' + props.round.maturity : 'at maturity'}.`
    : ''
)

const confirmLabel = computed(() =>
  props.round && numericAmount.value > 0
    ? `Sign & lend ${formatAmount(numericAmount.value, props.round.token)}`
    : 'Sign & lend'
)

function confirm() {
  if (numericAmount.value <= 0) return
  emit('lend', numericAmount.value)
}

// Reset the field and focus the panel each time a different round opens.
watch(
  () => props.round?.id,
  (id) => {
    if (!id) return
    amount.value = ''
    nextTick(() => panelRef.value?.focus())
  },
  { immediate: true }
)
</script>
