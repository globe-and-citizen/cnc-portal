<script setup lang="ts">
import type { TabsItem } from '@nuxt/ui'
import { useAccounting } from '~/composables/useAccounting'
import { useWalletAddress } from '~/composables/useWalletAddress'

// Per-tab address: URL query first (`?address=0x…`), localStorage as default.
// Each browser tab keeps its own wallet — two tabs analyze two wallets at once.
const { address: walletAddress, set: setWalletAddress } = useWalletAddress()
const hasAddress = computed(() => walletAddress.value.trim().length > 0)

const {
  entries, summary, positions, activities, realizedTrades,
  identities,
  isLoading, isFetching, error, transfersTruncated, refetch
} = useAccounting(walletAddress)

const tabs: TabsItem[] = [
  { label: 'Summary', icon: 'i-lucide-layout-dashboard', slot: 'summary' },
  { label: 'Income Statement', icon: 'i-lucide-trending-up', slot: 'income' },
  { label: 'Balance Sheet', icon: 'i-lucide-scale', slot: 'balance' },
  { label: 'General Ledger', icon: 'i-lucide-receipt-text', slot: 'activity' },
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
        <UFormField
          label="Wallet address"
          description="Synced with the page URL — open a second tab with a different ?address= to analyze two wallets at once."
          :ui="{ container: 'w-full max-w-xl' }"
        >
          <UInput
            :model-value="walletAddress"
            class="w-full font-mono text-sm"
            placeholder="0x..."
            autocomplete="off"
            @update:model-value="setWalletAddress"
          />
        </UFormField>
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
          <div v-if="hasAddress" class="mt-4 space-y-6">
            <AccountingSummary :summary="summary" />
            <!-- Live audit: each line proves one of the 8 accounting equations
                 over the loaded data. A non-zero gap points at the failing source
                 (truncated history, missing market, lot-accounting regression). -->
            <AccountingIdentitiesCard :identities="identities" :has-address="hasAddress" />
          </div>
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
            :wallet-address="walletAddress"
          />
        </template>

        <template #balance>
          <AccountingBalanceSheet
            class="mt-4"
            :ledger-entries="entries"
            :realized-trades="realizedTrades"
            :positions="positions"
            :has-address="hasAddress"
          />
        </template>

        <template #activity>
          <AccountingLedger
            class="mt-4"
            :entries="entries"
            :realized-trades="realizedTrades"
            :is-loading="isLoading"
            :has-address="hasAddress"
            :wallet-address="walletAddress"
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
