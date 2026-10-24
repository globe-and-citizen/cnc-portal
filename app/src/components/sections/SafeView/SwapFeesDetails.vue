<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { SwapFeeEvidence } from '@/types/swapFees'
import { presentSwapFees, swapFeeAmount } from '@/utils/accounting/swapPresenter'

const props = defineProps<{ swap: SwapFeeEvidence; booking?: string }>()
defineEmits<{ retry: [] }>()
const target = computed(() => props.swap.target)
const identity = computed(() => `${target.value.txHash}:${target.value.safeAddress}`)
const exactAmounts = ref(false)
watch(identity, () => {
  exactAmounts.value = false
})
const data = computed(() => ({
  loading: props.swap.loading,
  failed: props.swap.failed,
  fees: presentSwapFees(target.value, props.swap.verification)
}))
const network = computed(() => props.swap.execution?.networkFee)
const networkExactAmount = computed(() =>
  network.value
    ? swapFeeAmount(network.value.rawAmount, network.value.symbol, network.value.decimals)
    : 'Unavailable'
)
const networkAmount = computed(() =>
  network.value
    ? swapFeeAmount(
        network.value.rawAmount,
        network.value.symbol,
        network.value.decimals,
        exactAmounts.value ? undefined : 4
      )
    : 'Unavailable'
)
const payer = computed(() => network.value?.payer)
const paidBySafe = computed(
  () => !!payer.value && payer.value.toLowerCase() === target.value.safeAddress.toLowerCase()
)
const paidBySolver = computed(
  () => !!payer.value && !paidBySafe.value && !!props.swap.execution?.cowTrades.length
)
const gasPayer = computed(() => {
  if (!payer.value) return 'payer unavailable'
  if (paidBySafe.value) return 'paid by your Safe'
  return paidBySolver.value ? 'paid by the CoW solver' : 'paid by another wallet'
})
</script>

<template>
  <div class="mt-4 space-y-4 text-sm" data-test="swap-fees-details">
    <div aria-live="polite">
      <p v-if="data.loading" class="text-muted" data-test="swap-fees-loading">Loading swap fee…</p>
      <p v-else-if="data.failed" class="text-warning" data-test="swap-fees-error">
        Swap fee could not be loaded.
      </p>
      <template v-else>
        <div
          v-if="data.fees.totals.length"
          class="bg-primary/5 rounded-lg p-4 sm:p-5"
          data-test="swap-fee-total"
        >
          <dl class="space-y-3">
            <div v-for="fee in data.fees.totals" :key="fee.tokenAddress">
              <dt>{{ fee.label }}</dt>
              <dd class="mt-1 text-2xl font-semibold break-words tabular-nums sm:text-3xl">
                {{ exactAmounts ? fee.amount : fee.compactAmount }}
              </dd>
              <dd v-if="exactAmounts" class="text-muted mt-1 font-mono text-xs break-all">
                {{ fee.tokenAddress }}
              </dd>
            </div>
          </dl>
          <p class="text-toned mt-1" data-test="swap-fee-withheld">
            {{ data.fees.withheld ?? 'Already included in the amounts swapped.' }}
          </p>
        </div>
        <p v-if="data.fees.reason" class="text-muted mt-2" data-test="swap-fees-unavailable">
          {{ data.fees.reason }}
        </p>
      </template>
      <p v-if="booking" class="text-toned mt-3" data-test="swap-fee-booking">{{ booking }}</p>
    </div>

    <details
      :key="`fees:${identity}`"
      v-if="!data.loading && !data.failed && data.fees.breakdown.length"
      class="border-default border-t"
      data-test="swap-fee-breakdown-details"
    >
      <summary class="text-toned cursor-pointer py-3 font-medium" data-test="show-swap-fees">
        What makes up this fee?
      </summary>
      <div class="space-y-4 pb-2" data-test="swap-fee-breakdown">
        <p class="text-muted">
          These lines make up the swap fee above, in the currency CoW reports them in. They are not
          an extra charge.
        </p>
        <dl class="space-y-4">
          <div v-for="(fee, index) in data.fees.breakdown" :key="index">
            <div class="flex flex-col gap-x-4 gap-y-1 sm:flex-row sm:justify-between">
              <dt class="font-medium">{{ fee.label }}</dt>
              <dd class="break-words tabular-nums">
                {{ exactAmounts ? fee.amount : fee.compactAmount }}
                <span v-if="fee.equivalent" class="text-muted ml-2">{{ fee.equivalent }}</span>
              </dd>
            </div>
            <dd v-if="fee.description" class="text-muted mt-1">{{ fee.description }}</dd>
            <dd v-if="exactAmounts" class="text-muted mt-1 font-mono text-xs break-all">
              {{ fee.tokenAddress }}
            </dd>
          </div>
          <div
            v-if="data.fees.breakdownTotal"
            class="border-default flex flex-col gap-x-4 gap-y-1 border-t pt-3 font-semibold sm:flex-row sm:justify-between"
            data-test="swap-fee-breakdown-total"
          >
            <dt>{{ data.fees.breakdownTotal.label }}</dt>
            <dd class="break-words tabular-nums">
              {{
                exactAmounts
                  ? data.fees.breakdownTotal.amount
                  : data.fees.breakdownTotal.compactAmount
              }}
              <span v-if="data.fees.breakdownTotal.equivalent" class="ml-2">
                {{ data.fees.breakdownTotal.equivalent }}
              </span>
            </dd>
          </div>
        </dl>
      </div>
    </details>

    <UButton
      v-if="
        !data.loading && !data.failed && (data.fees.totals.length || data.fees.breakdown.length)
      "
      size="sm"
      variant="outline"
      class="min-h-11"
      :aria-pressed="exactAmounts"
      data-test="swap-fee-precision"
      @click="exactAmounts = !exactAmounts"
    >
      {{ exactAmounts ? 'Show rounded amounts' : 'Show exact amounts' }}
    </UButton>

    <section class="border-default space-y-1 border-t pt-4" data-test="swap-network-fee">
      <h4 class="font-medium">Network gas · {{ gasPayer }}</h4>
      <p class="text-muted break-words tabular-nums" data-test="swap-network-amount">
        {{ networkAmount }}
        <template v-if="paidBySafe"> · Paid by your Safe.</template>
        <template v-else-if="paidBySolver">
          · The solver that settled the swap paid it; nothing is charged to your Safe.
        </template>
        <template v-else-if="payer"> · Paid by the transaction sender.</template>
      </p>
      <details :key="`network:${identity}`" data-test="swap-network-details">
        <summary class="text-toned cursor-pointer py-3" data-test="show-swap-network">
          Network transaction details
        </summary>
        <dl class="space-y-3">
          <div>
            <dt class="text-muted">Exact network fee</dt>
            <dd class="break-words tabular-nums" data-test="swap-network-exact-amount">
              {{ networkExactAmount }}
            </dd>
          </div>
          <div v-if="payer">
            <dt class="text-muted">Payer</dt>
            <dd class="font-mono text-xs break-all" data-test="swap-network-payer">{{ payer }}</dd>
          </div>
          <div>
            <dt class="text-muted">Transaction</dt>
            <dd class="font-mono text-xs break-all" data-test="swap-network-transaction">
              {{ target.txHash }}
            </dd>
          </div>
        </dl>
        <p class="text-muted mt-3 max-w-prose">
          Gas covers the whole settlement transaction, which may include other swaps.
          <template v-if="payer && !paidBySafe">
            This is not an additional debit shown on your Safe. Any reimbursement by the Safe needs
            separate evidence.
          </template>
          <template v-else-if="paidBySafe">
            This network payment is separate from the swap fee above.
          </template>
          <template v-else>The network payer could not be identified.</template>
        </p>
      </details>
    </section>

    <UButton
      v-if="!data.loading && (data.failed || data.fees.reason) && swap.execution?.cowTrades.length"
      size="sm"
      variant="outline"
      class="min-h-11"
      data-test="retry-swap-fees"
      @click="$emit('retry')"
      >Retry fees</UButton
    >
  </div>
</template>
