<script setup lang="ts">
import { computed } from 'vue'
import { useUserQuery } from '~/queries/user.queries'
import type { LedgerCategory } from '~/utils/accounting'
import { shortenAddress } from '~/utils/generalUtil'

/**
 * Ledger counterparty cell — distinct from `UserIdentity` (Fee Collector, etc.).
 * Shows a cash-flow icon (in vs out relative to the analyzed wallet) plus the
 * external address; no avatar / DiceBear placeholder.
 */
const props = defineProps<{
  address: string
  category: LedgerCategory
  walletAddress: string
}>()

const { data: user } = useUserQuery(() => props.address)

const normalizedAddress = computed(() => props.address.trim().toLowerCase())
const normalizedWallet = computed(() => props.walletAddress.trim().toLowerCase())
const isSelf = computed(
  () => normalizedAddress.value.length > 0 && normalizedAddress.value === normalizedWallet.value
)

const polygonscanUrl = computed(
  () => `https://polygonscan.com/address/${props.address}`
)

const shortenedAddress = computed(() => shortenAddress(props.address))

/** Cash direction relative to the wallet under analysis. */
const flow = computed(() => {
  if (isSelf.value) {
    return {
      label: 'Self-transfer',
      icon: 'i-lucide-repeat',
      bgClass: 'bg-neutral-100 dark:bg-neutral-800',
      iconClass: 'text-neutral-600 dark:text-neutral-400'
    }
  }
  switch (props.category) {
    case 'DEPOSIT':
      return {
        label: 'Received from',
        icon: 'i-lucide-arrow-down-left',
        bgClass: 'bg-emerald-100 dark:bg-emerald-950',
        iconClass: 'text-emerald-600 dark:text-emerald-400'
      }
    case 'WITHDRAWAL':
      return {
        label: 'Sent to',
        icon: 'i-lucide-arrow-up-right',
        bgClass: 'bg-amber-100 dark:bg-amber-950',
        iconClass: 'text-amber-600 dark:text-amber-400'
      }
    default:
      return {
        label: 'Counterparty',
        icon: 'i-lucide-building-2',
        bgClass: 'bg-primary-100 dark:bg-primary-950',
        iconClass: 'text-primary-600 dark:text-primary-400'
      }
  }
})
</script>

<template>
  <div class="flex items-center gap-2 min-w-0 max-w-xs">
    <UTooltip :text="flow.label">
      <div
        class="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
        :class="flow.bgClass"
      >
        <UIcon :name="flow.icon" class="w-4 h-4" :class="flow.iconClass" />
      </div>
    </UTooltip>

    <div class="min-w-0">
      <p
        v-if="user?.name"
        class="font-medium text-sm truncate leading-tight text-black dark:text-white"
      >
        {{ user.name }}
      </p>
      <p class="text-[11px] text-muted leading-tight mb-0.5">
        {{ flow.label }}
      </p>
      <a
        :href="polygonscanUrl"
        target="_blank"
        rel="noopener noreferrer"
        class="inline-block max-w-full"
      >
        <UBadge variant="subtle" color="neutral" class="px-1.5! max-w-full">
          <span class="font-mono text-xs truncate">{{ shortenedAddress }}</span>
        </UBadge>
      </a>
    </div>
  </div>
</template>
