<template>
  <UCard
    data-test="team-card"
    :ui="{ root: 'border-t-4', body: 'flex flex-col gap-3.5' }"
    :class="[isOwner ? 'border-t-primary' : 'border-t-secondary']"
  >
    <!-- Header: name + description, role badge + kebab menu -->
    <div class="flex items-start justify-between gap-2.5">
      <div class="min-w-0">
        <p class="truncate text-base font-bold">{{ team.name }}</p>
        <p class="text-muted mt-0.5 line-clamp-2 text-xs leading-snug">
          {{ team.description }}
        </p>
      </div>

      <div class="flex shrink-0 items-center gap-1.5">
        <UBadge
          v-if="isOnLegacyContracts"
          label="Legacy"
          icon="i-lucide-triangle-alert"
          color="warning"
          variant="soft"
          size="sm"
          data-test="team-legacy-badge"
        />
        <RoleBadge :role="treasury.role" />

        <UDropdownMenu v-model:open="menuOpen" :items="menuItems">
          <UButton
            data-test="card-kebab"
            color="neutral"
            variant="ghost"
            size="xs"
            icon="i-heroicons-ellipsis-vertical"
            aria-label="Card actions"
            @click.stop="menuOpen = !menuOpen"
          />

          <!-- Self-rendered menu so items are queryable + emit in tests and prod -->
          <template v-if="menuOpen">
            <UButton
              v-for="item in menuItems"
              :key="item.action"
              :data-test="`card-menu-${item.action}`"
              :icon="item.icon"
              :color="item.action === 'delete' ? 'error' : 'neutral'"
              variant="ghost"
              size="xs"
              block
              class="justify-start"
              @click.stop="selectAction(item.action)"
            >
              {{ item.label }}
            </UButton>
          </template>
        </UDropdownMenu>
      </div>
    </div>

    <!-- Body: balance + distribution -->
    <div>
      <div class="flex items-baseline justify-between">
        <span class="text-muted text-xs font-medium">Total balance</span>
        <span class="text-dimmed font-mono text-[11px]">{{ treasury.polLabel }}</span>
      </div>
      <p data-test="card-balance" class="mt-0.5 text-2xl font-extrabold tracking-tight">
        {{ treasury.balanceLabel }}
      </p>
      <DistributionBar :segments="treasury.byAccount" :legend="true" class="mt-3" />
    </div>

    <!-- Footer: members -->
    <div class="border-muted mt-auto flex items-center justify-between border-t pt-3">
      <div class="flex items-center" data-test="card-members">
        <AvatarGroup :members="team.members" :size="'xs'" />
        <span class="text-muted ml-2 text-[11px]">{{ team.members.length }} members</span>
      </div>
    </div>

    <!-- Wage chip -->
    <UBadge
      data-test="card-wage"
      :color="hasWage ? 'success' : 'neutral'"
      :variant="hasWage ? 'soft' : 'subtle'"
      size="sm"
      icon="i-heroicons-banknotes"
      class="self-start"
      :label="wageLabel"
    />
  </UCard>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useUserDataStore } from '@/stores/user'
import { useTeamsTreasury } from '@/composables/treasury/useTeamsTreasury'
import DistributionBar from '@/components/sections/CompaniesView/DistributionBar.vue'
import AvatarGroup from '@/components/sections/CompaniesView/AvatarGroup.vue'
import RoleBadge from '@/components/sections/CompaniesView/RoleBadge.vue'
import type { CompanyTreasury, Team } from '@/types'

type CardAction = 'update' | 'archive' | 'hide' | 'delete'

interface Props {
  team: Team
}

interface MenuItem {
  label: string
  icon: string
  action: CardAction
}

const props = defineProps<Props>()

const emit = defineEmits<{
  action: [payload: { teamId: string; action: CardAction }]
}>()

const userStore = useUserDataStore()

const { byTeamId } = useTeamsTreasury(() => [props.team])

const treasury = computed<CompanyTreasury>(
  () =>
    byTeamId.value[props.team.id] ?? {
      teamId: props.team.id,
      role: 'employee',
      balanceUsd: 0,
      balanceLabel: '$0.00',
      polApprox: 0,
      polLabel: '≈ 0 POL',
      byAccount: [],
      byToken: []
    }
)

const isOwner = computed(() => treasury.value.role === 'owner')

// Legacy = an Officer is deployed but on an older contract generation. Gate on
// the Officer existing so onboarding teams (isMigrated false, no Officer) don't
// get flagged.
const isOnLegacyContracts = computed(
  () => !!props.team.currentOfficer?.address && props.team.isMigrated === false
)

const menuOpen = ref(false)

const menuItems = computed<MenuItem[]>(() =>
  isOwner.value
    ? [
        { label: 'Update', icon: 'i-heroicons-pencil-square', action: 'update' },
        { label: 'Archive', icon: 'i-heroicons-archive-box', action: 'archive' },
        { label: 'Hide', icon: 'i-heroicons-eye-slash', action: 'hide' },
        { label: 'Delete', icon: 'i-heroicons-trash', action: 'delete' }
      ]
    : [{ label: 'Hide', icon: 'i-heroicons-eye-slash', action: 'hide' }]
)

function selectAction(action: CardAction): void {
  menuOpen.value = false
  emit('action', { teamId: props.team.id, action })
}

const currentMembership = computed(() =>
  props.team.members.find(
    (member) => member.address?.toLowerCase() === userStore.address?.toLowerCase()
  )
)

const hasWage = computed(() => Boolean(currentMembership.value?.currentWage))

const weeklyWageLabel = computed(() => {
  const wage = currentMembership.value?.currentWage
  if (!wage) return ''
  const hourly = (wage.ratePerHour ?? []).reduce((sum, rate) => sum + rate.amount, 0)
  const weekly = hourly * wage.maximumHoursPerWeek
  return (
    '$' + weekly.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  )
})

const wageLabel = computed(() =>
  hasWage.value ? `Wage set · ${weeklyWageLabel.value}/week` : 'No wage set'
)
</script>
