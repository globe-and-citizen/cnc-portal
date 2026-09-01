<template>
  <UCard
    :ui="{
      root: 'relative flex flex-col overflow-visible border-t-3',
      body: 'flex flex-1 flex-col gap-3.5 p-5'
    }"
    :class="isOwner ? 'border-t-primary' : 'border-t-secondary'"
  >
    <RouterLink
      :to="to"
      :aria-label="`Open ${team.name}`"
      class="focus-visible:ring-primary absolute inset-0 z-10 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
      data-test="team-link"
    />

    <!-- Identity -->
    <div class="flex items-start justify-between gap-2.5">
      <div class="min-w-0">
        <h3 class="truncate text-base font-bold" data-test="team-name">{{ team.name }}</h3>
        <p class="text-muted mt-0.5 line-clamp-2 text-xs leading-relaxed" data-test="team-desc">
          {{ team.description }}
        </p>
      </div>
      <div class="relative z-20 flex shrink-0 items-center gap-1.5">
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
      <USkeleton
        v-if="treasury.state === 'loading'"
        class="mt-1 h-7 w-32"
        data-test="balance-loading"
      />
      <p v-else class="mt-0.5 text-2xl leading-tight font-extrabold" data-test="total-balance">
        {{ treasury.formattedTotal }}
      </p>

      <div class="mt-3 flex h-[7px] gap-px overflow-hidden rounded-full" data-test="account-bar">
        <template v-if="treasury.accountShares.length > 0">
          <div
            v-for="account in treasury.accountShares"
            :key="account.label"
            :class="account.barClass"
            :style="{ width: `${account.percent}%` }"
          />
        </template>
        <div v-else class="bg-elevated w-full" />
      </div>
      <div v-if="treasury.accountShares.length > 0" class="mt-2 flex flex-wrap gap-2.5">
        <span
          v-for="account in treasury.accountShares"
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
import { RouterLink, type RouteLocationRaw } from 'vue-router'
import { useUserDataStore, useCurrencyStore } from '@/stores'
import { formatCurrency } from '@/utils/format'
import type { TokenId } from '@/constant'
import type { Team } from '@/types'
import type { TeamTreasuryDisplay } from '@/utils/teamTreasury'

interface Props {
  team: Team
  to: RouteLocationRaw
  treasury: TeamTreasuryDisplay
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

const currencyCode = computed(() => currencyStore.localCurrency.code)

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
