<script setup lang="ts">
import type { TabsItem } from '@nuxt/ui'
import { useLocalStorage } from '@vueuse/core'
import { useAccounting } from '~/composables/useAccounting'

// Shared with the previous Polymarket page key so the address carries over.
const walletAddress = useLocalStorage('dashboard-polymarket-user-address', '')
const hasAddress = computed(() => walletAddress.value.trim().length > 0)

const {
  entries, summary, positions, activities, realizedTrades,
  isLoading, isFetching, error, transfersTruncated, refetch
} = useAccounting(() => walletAddress.value)

// "As of" reporting date (#1885) — drives the three financial statements.
const todayStr = new Date().toISOString().slice(0, 10)
const asOfDateStr = ref(todayStr)
/** Inclusive upper bound, end of the selected day, in unix seconds. */
const asOf = computed(() => Math.floor(new Date(`${asOfDateStr.value}T23:59:59`).getTime() / 1000))
const isAsOfToday = computed(() => asOfDateStr.value >= todayStr)

const tabs: TabsItem[] = [
  { label: 'Summary', icon: 'i-lucide-layout-dashboard', slot: 'summary' },
  { label: 'Income Statement', icon: 'i-lucide-trending-up', slot: 'income' },
  { label: 'Balance Sheet', icon: 'i-lucide-scale', slot: 'balance' },
  { label: 'Activity Ledger', icon: 'i-lucide-receipt-text', slot: 'activity' },
  { label: 'General Ledger', icon: 'i-lucide-book-open', slot: 'ledger' },
  { label: 'Positions', icon: 'i-lucide-wallet', slot: 'positions' }
]

const errorMessage = computed(() => {
  const err = error.value as { data?: { statusMessage?: string }, statusMessage?: string, message?: string } | null
  if (!err) {
    return ''
  }
  return err.data?.statusMessage ?? err.statusMessage ?? err.message ?? 'Unknown error.'
})
</script>

<template>
  <div class="container mx-auto px-4 py-8">
    <div class="space-y-6">
      <UPageCard
        title="Polymarket accounting"
        description="Financial statements reconstructed from the Polymarket Data API (activity + positions) and on-chain USDC transfers (Etherscan / Polygon)."
        variant="naked"
        orientation="horizontal"
      >
        <UButton
          label="Refresh"
          color="neutral"
          icon="i-lucide-refresh-cw"
          :loading="isFetching"
          :disabled="!hasAddress"
          class="w-fit lg:ms-auto"
          @click="refetch"
        />
      </UPageCard>

      <UPageCard variant="subtle">
        <div class="flex max-lg:flex-col gap-4 lg:items-end justify-between">
          <UFormField
            label="Wallet address"
            description="The Polymarket proxy wallet (EOA/Safe used on Polymarket). Stored locally in this browser."
            :ui="{ container: 'w-full max-w-xl' }"
          >
            <UInput
              v-model="walletAddress"
              class="w-full font-mono text-sm"
              placeholder="0x..."
              autocomplete="off"
            />
          </UFormField>

          <UFormField
            label="Reporting date"
            description="Drives the Income Statement, Balance Sheet and General Ledger."
          >
            <UInput v-model="asOfDateStr" type="date" :max="todayStr" />
          </UFormField>
        </div>
      </UPageCard>

      <UAlert
        v-if="error"
        color="error"
        variant="subtle"
        title="Could not load accounting data"
        :description="errorMessage"
      />

      <UAlert
        v-if="transfersTruncated"
        color="warning"
        variant="subtle"
        title="Transfer history truncated"
        description="This wallet has more on-chain transfers than could be fetched in one pass. Deposit/withdrawal totals may be incomplete."
      />

      <UTabs :items="tabs" variant="link" class="w-full">
        <template #summary>
          <AccountingSummary v-if="hasAddress" :summary="summary" class="mt-4" />
          <UPageCard v-else variant="subtle" class="mt-4">
            <p class="text-muted text-center py-8">
              Enter a wallet address to see the accounting summary.
            </p>
          </UPageCard>
        </template>

        <template #income>
          <AccountingIncomeStatement
            class="mt-4"
            :activities="activities"
            :positions="positions"
            :is-loading="isLoading"
            :has-address="hasAddress"
            :as-of="asOf"
          />
        </template>

        <template #balance>
          <AccountingBalanceSheet
            class="mt-4"
            :ledger-entries="entries"
            :realized-trades="realizedTrades"
            :positions="positions"
            :has-address="hasAddress"
            :as-of="asOf"
            :is-as-of-today="isAsOfToday"
          />
        </template>

        <template #activity>
          <AccountingLedger
            class="mt-4"
            :entries="entries"
            :is-loading="isLoading"
            :has-address="hasAddress"
            :wallet-address="walletAddress"
          />
        </template>

        <template #ledger>
          <AccountingGeneralLedger
            class="mt-4"
            :ledger-entries="entries"
            :realized-trades="realizedTrades"
            :is-loading="isLoading"
            :has-address="hasAddress"
            :as-of="asOf"
          />
        </template>

        <template #positions>
          <AccountingPositions
            class="mt-4"
            :positions="positions"
            :is-loading="isLoading"
            :has-address="hasAddress"
          />
        </template>
      </UTabs>
    </div>
  </div>
</template>
