<template>
  <UCard
    :ui="{
      root: 'flex flex-col overflow-visible border-t-3',
      body: 'flex flex-1 flex-col gap-3.5 p-5'
    }"
    :class="isOwner ? 'border-t-primary' : 'border-t-secondary'"
  >
    <!-- Identity -->
    <div class="flex items-start justify-between gap-2.5">
      <div class="min-w-0">
        <h3 class="truncate text-base font-bold" data-test="team-name">{{ team.name }}</h3>
        <p class="text-muted mt-0.5 line-clamp-2 text-xs leading-relaxed" data-test="team-desc">
          {{ team.description }}
        </p>
      </div>
      <div class="flex shrink-0 items-center gap-1.5">
        <UBadge v-if="isOwner" size="sm" color="primary" variant="solid">Owner</UBadge>
        <UBadge v-else size="sm" color="secondary" variant="solid">Employee</UBadge>
        <UDropdownMenu :items="menuItems" @click.stop>
          <UButton
            icon="i-heroicons-ellipsis-vertical"
            color="neutral"
            variant="ghost"
            size="xs"
            aria-label="Team actions"
            data-test="team-menu"
            @click.stop
          />
        </UDropdownMenu>
      </div>
    </div>

    <!-- Treasury -->
    <div>
      <span class="text-muted text-xs font-medium">Total balance</span>
      <USkeleton v-if="isLoadingBalances" class="mt-1 h-7 w-32" data-test="balance-loading" />
      <p v-else class="mt-0.5 text-2xl leading-tight font-extrabold" data-test="total-balance">
        {{ formattedTotal }}
      </p>

      <div class="mt-3 flex h-[7px] gap-px overflow-hidden rounded-full" data-test="account-bar">
        <template v-if="accountShares.length > 0">
          <div
            v-for="account in accountShares"
            :key="account.label"
            :class="account.barClass"
            :style="{ width: `${account.percent}%` }"
          />
        </template>
        <div v-else class="bg-elevated w-full" />
      </div>
      <div v-if="accountShares.length > 0" class="mt-2 flex flex-wrap gap-2.5">
        <span
          v-for="account in accountShares"
          :key="account.label"
          class="text-muted inline-flex items-center gap-1.5 text-[10px]"
        >
          <span class="size-[7px] shrink-0 rounded-xs" :class="account.barClass" />
          {{ account.label }} {{ account.percentLabel }}
        </span>
      </div>
    </div>

    <!-- Roster -->
    <div class="border-default mt-auto flex items-center justify-between border-t pt-3">
      <div class="flex items-center">
        <span
          v-for="(avatar, index) in avatars"
          :key="avatar.key"
          class="border-default flex size-6 items-center justify-center rounded-full border-2 text-[9px] font-bold text-white"
          :class="[avatar.gradientClass, index > 0 ? '-ml-[7px]' : '']"
          :title="avatar.title"
        >
          {{ avatar.initials }}
        </span>
        <span
          v-if="hiddenMemberCount > 0"
          class="bg-primary/15 text-primary border-default -ml-[7px] flex size-6 items-center justify-center rounded-full border-2 text-[9px] font-bold"
          data-test="member-overflow"
        >
          +{{ hiddenMemberCount }}
        </span>
        <span class="text-muted ml-2 text-[11px] whitespace-nowrap" data-test="member-count">
          {{ memberCount }} {{ memberCount === 1 ? 'member' : 'members' }}
        </span>
      </div>
    </div>

    <!-- Viewer's own wage, alongside whatever status the team carries -->
    <div class="flex flex-wrap items-center gap-1.5">
      <span
        class="inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold"
        :class="wage.hasWage ? 'bg-success/15 text-success' : 'bg-elevated text-muted'"
        data-test="wage-pill"
      >
        <UIcon name="i-heroicons-banknotes" class="size-3.5" />
        {{ wage.label }}
      </span>
      <UBadge
        v-if="team.isHidden"
        label="Hidden"
        icon="i-tabler-eye-off"
        color="success"
        variant="soft"
        size="sm"
      />
      <UBadge
        v-if="team.isArchived"
        label="Archived"
        icon="i-tabler-archive"
        color="warning"
        variant="soft"
        size="sm"
      />
      <UBadge
        v-if="isOnLegacyContracts"
        label="Legacy"
        icon="i-lucide-triangle-alert"
        color="warning"
        variant="soft"
        size="sm"
        data-test="team-legacy-badge"
      />
    </div>
  </UCard>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { DropdownMenuItem } from '@nuxt/ui'
import { useUserDataStore, useCurrencyStore } from '@/stores'
import { useContractBalance } from '@/composables/useContractBalance'
import { EMPTY_VALUE, formatCurrency, formatPercent } from '@/utils/format'
import type { TokenId } from '@/constant'
import type { Team } from '@/types'
import type { ContractType } from '@/types/teamContract'

interface Props {
  team: Team
}

const props = defineProps<Props>()

const emit = defineEmits<{
  update: []
  archive: []
  hide: []
  delete: []
}>()

const userStore = useUserDataStore()
const currencyStore = useCurrencyStore()

const isOwner = computed(() => props.team.ownerAddress === userStore.address)

// Legacy = an Officer is deployed but on an older contract generation. Gate on
// the Officer existing so onboarding teams (isMigrated false, no Officer) don't
// get flagged.
const isOnLegacyContracts = computed(
  () => !!props.team.currentOfficer?.address && props.team.isMigrated === false
)

// --- Treasury -------------------------------------------------------------
// `useContractBalance` opens a query per address, so the four calls have to be
// unconditional and in a stable order. An account the team does not have
// resolves to an undefined address, which leaves that query disabled.
const contractAddress = (type: ContractType) =>
  computed(() => props.team.teamContracts?.find((contract) => contract.type === type)?.address)

const bankBalance = useContractBalance(contractAddress('Bank'))
const safeBalance = useContractBalance(contractAddress('Safe'))
const expenseBalance = useContractBalance(contractAddress('ExpenseAccountEIP712'))
const cashBalance = useContractBalance(contractAddress('CashRemunerationEIP712'))

const currencyCode = computed(() => currencyStore.localCurrency.code)

const isLoadingBalances = computed(() =>
  [bankBalance, safeBalance, expenseBalance, cashBalance].some((account) => account.isLoading.value)
)

// `data` stays undefined until a read lands, so an account still loading — or
// one the team does not hold — is never folded in as a zero.
const accounts = computed(() => [
  // Bank and Safe are both primary; the design separates them by weight, which
  // the theme expresses as opacity rather than a numeric colour scale.
  { label: 'Bank', amount: bankBalance.data.value?.total.local.value, barClass: 'bg-primary/40' },
  { label: 'Safe', amount: safeBalance.data.value?.total.local.value, barClass: 'bg-primary' },
  {
    label: 'Expense',
    amount: expenseBalance.data.value?.total.local.value,
    barClass: 'bg-accent'
  },
  { label: 'Cash', amount: cashBalance.data.value?.total.local.value, barClass: 'bg-warning' }
])

type ReadAccount = { label: string; amount: number; barClass: string }

const readAccounts = computed(() =>
  accounts.value.filter((account): account is ReadAccount => account.amount !== undefined)
)

const totalBalance = computed(() =>
  readAccounts.value.reduce((sum, account) => sum + account.amount, 0)
)

// A treasury we could not read is not a treasury holding nothing. Until at
// least one account has landed, a confident "$0.00" would read as drained.
// Balances are priced in the viewer's currency, so they are formatted with it
// too — `formatUsd` would stamp a `$` on a EUR figure.
const formattedTotal = computed(() =>
  readAccounts.value.length > 0
    ? formatCurrency(totalBalance.value, { currency: currencyCode.value })
    : EMPTY_VALUE
)

// Only funded accounts get a segment, so an empty account never renders a
// zero-width sliver or a "Bank 0%" legend entry.
const accountShares = computed(() => {
  const total = totalBalance.value
  if (total <= 0) return []
  return readAccounts.value
    .filter((account) => account.amount > 0)
    .map((account) => ({
      ...account,
      // Numeric share drives the bar width; the label is the same ratio, formatted.
      percent: (account.amount / total) * 100,
      percentLabel: formatPercent(account.amount / total, { decimals: 0 })
    }))
})

// --- Roster ---------------------------------------------------------------
const MAX_AVATARS = 3

// Deterministic per-member colour: the same address always gets the same
// gradient, so avatars stay stable across renders and re-orderings.
const GRADIENTS = [
  'bg-gradient-to-br from-[#00bf7a] to-[#00b8d9]',
  'bg-gradient-to-br from-[#3366ff] to-[#00b8d9]',
  'bg-gradient-to-br from-[#0f3d2e] to-[#00925c]'
]

const initialsOf = (name: string | undefined, address: string) => {
  const words = (name ?? '').trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return address.slice(2, 4).toUpperCase()
  return words
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase()
}

const gradientFor = (address: string) => {
  const sum = [...address].reduce((acc, char) => acc + char.charCodeAt(0), 0)
  return GRADIENTS[sum % GRADIENTS.length]
}

// `_count.members` is the authoritative total; `members` may be a shorter list.
const memberCount = computed(() => props.team._count?.members ?? props.team.members?.length ?? 0)

const avatars = computed(() =>
  (props.team.members ?? []).slice(0, MAX_AVATARS).map((member) => ({
    key: member.address,
    initials: initialsOf(member.name, member.address),
    title: member.name || member.address,
    gradientClass: gradientFor(member.address)
  }))
)

const hiddenMemberCount = computed(() => Math.max(memberCount.value - avatars.value.length, 0))

// --- Viewer's own wage ----------------------------------------------------
const HOURS_LABEL = '/ week'

const wage = computed(() => {
  const callerWage = props.team.callerWage
  if (!callerWage) return { hasWage: false, label: 'No wage set' }
  if (callerWage.disabled) return { hasWage: false, label: 'Wage paused' }

  // Rates are per-token and per-hour; price each one in the viewer's currency
  // and scale by the weekly hour cap to get the comparable weekly figure the
  // design shows. If no token has a price yet, fall back to the bare status.
  let hourly = 0
  let priced = false
  for (const rate of callerWage.ratePerHour ?? []) {
    const price = currencyStore
      .getTokenInfo(rate.type as TokenId)
      ?.prices.find((entry) => entry.code === currencyCode.value)?.price
    if (price == null) continue
    hourly += rate.amount * price
    priced = true
  }

  if (!priced) return { hasWage: true, label: 'Wage set' }

  const weekly = hourly * (callerWage.maximumHoursPerWeek ?? 0)
  const formatted = formatCurrency(weekly, { currency: currencyCode.value, decimals: 0 })
  return { hasWage: true, label: `Wage set · ${formatted} ${HOURS_LABEL}` }
})

// --- Actions --------------------------------------------------------------
// Owners manage the team; everyone else can only drop it from their own list.
// Each entry names the transition it performs, so a team that is already
// hidden or archived offers the way back out rather than a no-op.
const menuItems = computed<DropdownMenuItem[]>(() => {
  const visibility: DropdownMenuItem = props.team.isHidden
    ? { label: 'Show', icon: 'i-heroicons-eye', onSelect: () => emit('hide') }
    : { label: 'Hide', icon: 'i-heroicons-eye-slash', onSelect: () => emit('hide') }
  if (!isOwner.value) return [visibility]
  return [
    {
      label: 'Update',
      icon: 'i-heroicons-pencil-square',
      // The backend rejects metadata writes on an archived team (409), so the
      // entry stays visible but inert until the team is unarchived.
      disabled: props.team.isArchived,
      onSelect: () => emit('update')
    },
    props.team.isArchived
      ? { label: 'Unarchive', icon: 'i-lucide-archive-restore', onSelect: () => emit('archive') }
      : { label: 'Archive', icon: 'i-heroicons-archive-box', onSelect: () => emit('archive') },
    visibility,
    {
      label: 'Delete',
      icon: 'i-heroicons-trash',
      color: 'error' as const,
      onSelect: () => emit('delete')
    }
  ]
})
</script>
