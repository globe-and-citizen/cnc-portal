<template>
  <div v-if="round" class="flex flex-col gap-5">
    <!-- Back -->
    <button
      type="button"
      class="text-muted hover:text-default flex cursor-pointer items-center gap-2 text-sm"
      @click="goRound"
    >
      <UIcon name="heroicons:arrow-left" class="size-4" />
      Back to round
    </button>

    <!-- Header -->
    <div>
      <div class="flex items-center gap-2.5">
        <h1 class="text-2xl font-bold tracking-tight">Repay — {{ round.name }}</h1>
        <UBadge :color="status.color" variant="subtle" :label="status.label" size="lg" />
      </div>
      <p class="text-muted mt-1.5 text-sm">
        Returns each lender's principal plus {{ round.rate }}% interest. The portal signs one
        transfer per lender from the Credit Account.
      </p>
    </div>

    <div class="grid items-start gap-5 lg:grid-cols-[1.55fr_1fr]">
      <!-- Breakdown -->
      <div class="border-default bg-default overflow-hidden rounded-2xl border shadow-sm">
        <div class="border-default flex items-center justify-between border-b px-6 py-4">
          <span class="text-base font-semibold">Repayment breakdown</span>
          <UBadge color="primary" variant="subtle" :label="`${round.lenders.length} lenders`" />
        </div>
        <table class="w-full border-collapse">
          <thead>
            <tr class="bg-muted text-muted text-left text-xs font-semibold">
              <th class="px-4 py-3">Lender</th>
              <th class="px-4 py-3 text-right">Principal</th>
              <th class="px-4 py-3 text-right">Interest</th>
              <th class="px-4 py-3 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="lender in rows"
              :key="lender.addr"
              class="border-default/60 border-t"
              :class="{ 'bg-primary/5': lender.you }"
            >
              <td class="px-4 py-3.5">
                <div class="flex items-center gap-2.5">
                  <CreditAvatar :name="lender.name" :gradient="lender.gradient" :size="30" />
                  <div>
                    <div class="font-semibold">{{ lender.name }}</div>
                    <div class="text-muted font-mono text-[11px]">{{ lender.addr }}</div>
                  </div>
                </div>
              </td>
              <td class="px-4 py-3.5 text-right">{{ formatAmount(lender.amount) }}</td>
              <td class="text-primary px-4 py-3.5 text-right font-semibold">
                + {{ formatAmount(lender.interest) }}
              </td>
              <td class="px-4 py-3.5 text-right font-bold">{{ formatAmount(lender.total) }}</td>
            </tr>
          </tbody>
        </table>
        <div class="border-default bg-muted flex items-center justify-between border-t px-6 py-4">
          <span class="text-muted text-sm font-semibold">Grand total</span>
          <span class="text-xl font-extrabold tracking-tight">{{ formatAmount(grandTotal) }}</span>
        </div>
      </div>

      <!-- Confirm -->
      <div class="flex flex-col gap-4">
        <div
          class="border-primary/20 from-primary/5 to-default rounded-2xl border bg-gradient-to-br p-6 shadow-sm"
        >
          <div class="text-muted text-sm">Total to repay</div>
          <div class="mt-1.5 text-[34px] font-extrabold tracking-tight">
            {{ formatAmount(grandTotal) }}
          </div>
          <div class="text-muted mt-1 text-xs">
            {{ formatAmount(round.raised) }} principal + {{ formatAmount(interestTotal) }} interest
          </div>
          <div class="mt-4 flex flex-col gap-2.5">
            <div class="flex justify-between text-sm">
              <span class="text-muted">Credit Account balance</span>
              <span class="font-semibold">{{ formatAmount(store.accountBalance) }}</span>
            </div>
            <div class="flex justify-between text-sm">
              <span class="text-muted">After repayment</span>
              <span
                class="font-semibold"
                :class="afterBalance >= 0 ? 'text-primary' : 'text-error'"
              >
                {{ formatAmount(afterBalance) }}
              </span>
            </div>
          </div>
        </div>

        <UAlert
          color="info"
          variant="soft"
          icon="heroicons:shield-check"
          title="On-chain repayment"
          :description="`Signing executes ${round.lenders.length} transfers and marks the round Repaid. This cannot be undone.`"
        />

        <UButton
          color="primary"
          size="xl"
          block
          icon="heroicons:check-circle"
          label="Repay all lenders · sign"
          data-test="confirm-repay"
          @click="confirmRepay"
        />
        <UButton variant="ghost" color="neutral" block label="Cancel" @click="goRound" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useToast } from '@nuxt/ui/composables'
import { useCommunityCreditStore } from '@/stores'
import { formatAmount, roundInterest, statusMeta } from '@/utils'
import CreditAvatar from '@/components/sections/CommunityCreditView/CreditAvatar.vue'

const route = useRoute()
const router = useRouter()
const toast = useToast()
const store = useCommunityCreditStore()

const teamId = computed(() => String(route.params.id))
const roundId = computed(() => String(route.params.roundId))
const round = computed(() => store.getRound(roundId.value))
const status = computed(() => statusMeta(round.value?.status ?? 'active'))

const rows = computed(() =>
  (round.value?.lenders ?? []).map((lender) => {
    const interest = (lender.amount * (round.value?.rate ?? 0)) / 100
    return { ...lender, interest, total: lender.amount + interest }
  })
)
const interestTotal = computed(() => (round.value ? roundInterest(round.value) : 0))
const grandTotal = computed(() => (round.value?.raised ?? 0) + interestTotal.value)
const afterBalance = computed(() => store.accountBalance - grandTotal.value)

function goList() {
  router.push({ name: 'community-credit', params: { id: teamId.value } })
}
function goRound() {
  router.push({
    name: 'community-credit-round',
    params: { id: teamId.value, roundId: roundId.value }
  })
}

// Redirect if the round id is unknown.
watch(
  round,
  (value) => {
    if (!value) goList()
  },
  { immediate: true }
)

function confirmRepay() {
  const r = round.value
  if (!r) return
  store.repay(r.id)
  toast.add({ title: 'Round repaid — principal + interest returned', color: 'success' })
  goList()
}
</script>
