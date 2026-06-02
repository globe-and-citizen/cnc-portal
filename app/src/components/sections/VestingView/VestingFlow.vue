<template>
  <UCard>
    <template #header>
      <div class="flex items-center justify-between">
        <span>Vesting OverView</span>
        <div class="flex items-center gap-4">
          <VestingStatusFilter @statusChange="handleStatusChange" />

          <VestingActions :reloadKey="reloadKey" @reload="handleReload" />
        </div>
      </div>
    </template>

    <UIcon v-if="loading" name="i-lucide-loader-circle" class="h-5 w-5 animate-spin" />

    <UTable
      :data="vestings"
      :columns="columns"
      :sticky="true"
      :showPagination="true"
      data-test="vesting-overview"
    >
      <template #vestablePerDay-cell="{ row: { original: row } }">
        <span class="flex items-center gap-1 text-sm text-gray-700">
          {{ Number((row.totalAmount / row.durationDays).toFixed(2)) }}
          <span class="text-xs">{{ row.tokenSymbol }}</span>
        </span>
      </template>
      <template #totalAmount-cell="{ row: { original: row } }">
        <span class="flex items-center gap-1 text-sm text-gray-700">
          {{ (row as VestingRow).totalAmount }}
          <span class="text-xs">{{ row.tokenSymbol }}</span>
        </span>
      </template>
      <template #released-cell="{ row: { original: row } }">
        <UBadge color="info" variant="subtle" class="flex items-center gap-1">
          {{ row.released.toFixed(2) }}
          <span class="text-xs">{{ row.tokenSymbol }}</span>
        </UBadge>
      </template>
      <template #withdrawn-cell="{ row: { original: row } }">
        <UBadge color="info" variant="subtle" class="flex items-center gap-1">
          {{ row.status === 'Inactive' ? (row.totalAmount - row.released).toFixed(2) : 0 }}
          <span class="text-xs">{{ row.tokenSymbol }}</span>
        </UBadge>
      </template>

      <template #member-cell="{ row: { original: row } }">
        <span>{{ row.member }}</span>
      </template>
      <template #actions-cell="{ row: { original: row } }">
        <div class="flex flex-wrap gap-2">
          <!-- Stop Button -->

          <UTooltip :text="archivedTooltip">
            <UButton
              v-if="row.status === 'Active' && team?.ownerAddress == userAddress"
              data-test="stop-btn"
              color="error"
              size="xs"
              :disabled="isWriteDisabled"
              @click.stop="stopVesting(row.member)"
              icon="mdi:stop-circle-outline"
              label="Stop"
            />
          </UTooltip>

          <!-- Withdraw Button -->

          <!-- Release Button -->

          <UTooltip :text="archivedTooltip">
            <UButton
              data-test="release-btn"
              v-if="row.status === 'Active' && row.member === userAddress"
              color="success"
              size="xs"
              :disabled="isWriteDisabled || !row.isStarted"
              :title="!row.isStarted ? 'Vesting has not started yet' : undefined"
              @click.stop="releaseVesting()"
              icon="mdi:lock-open"
              label="Release"
            />
          </UTooltip>
        </div>
      </template>
    </UTable>
  </UCard>
</template>

<script setup lang="ts">
import { computed, watch, ref } from 'vue'
import { type VestingRow, type VestingTuple, type VestingStatus } from '@/types/vesting'
import { useTeamStore } from '@/stores'
import { formatUnits } from 'viem'
import { useUserDataStore } from '@/stores'

import VestingActions from '@/components/sections/VestingView/VestingActions.vue'
import VestingStatusFilter from './VestingStatusFilter.vue'
import { useInvestorSymbol } from '@/composables/investor/reads'
import {
  useVestingGetTeamAllArchivedVestingsFlat,
  useVestingGetTeamVestingsWithMembers
} from '@/composables/vesting/reads'
import { useVestingReleaseWrite, useVestingStopVestingWrite } from '@/composables/vesting/writes'
import { useTeamWriteGuard } from '@/composables/useTeamWriteGuard'

const toast = useToast()
const { isWriteDisabled, archivedTooltip } = useTeamWriteGuard()

const teamStore = useTeamStore()
const team = computed(() => teamStore.currentTeam)

const emit = defineEmits(['reload'])

const props = defineProps<{
  reloadKey: number
}>()

const userStore = useUserDataStore()
const userAddress = computed(() => userStore.address)

// const selectedStatus = ref('all')
// // Add handler
// const handleStatusChange = (status: string) => {
//   selectedStatus.value = status
// }

const selectedStatus = ref<VestingStatus>('all')

const handleStatusChange = (status: VestingStatus) => {
  selectedStatus.value = status
}

const {
  data: tokenSymbol
  //isLoading: isLoadingTokenSymbol
  //error: tokenSymbolError
} = useInvestorSymbol()

const safeTokenSymbol = computed(() =>
  typeof tokenSymbol.value === 'string' ? tokenSymbol.value : 'default'
)

const {
  data: archivedVestingInfos,
  //isLoading: isLoadingArchivedVestingInfos,
  error: errorGetArchivedVestingInfo,
  refetch: getArchivedVestingInfos
} = useVestingGetTeamAllArchivedVestingsFlat(computed(() => BigInt(team?.value?.id ?? 0)))

watch(errorGetArchivedVestingInfo, () => {
  if (errorGetArchivedVestingInfo.value) {
    toast.add({ title: 'get archived  failed', color: 'error' })
    console.error('get archived  failed ====', errorGetArchivedVestingInfo)
  }
})

const {
  data: vestingInfos,
  //isLoading: isLoadingVestingInfos,
  error: errorGetVestingInfo,
  refetch: getVestingInfos
} = useVestingGetTeamVestingsWithMembers(computed(() => BigInt(team?.value?.id ?? 0)))
watch(errorGetVestingInfo, () => {
  if (errorGetVestingInfo.value) {
    toast.add({ title: 'Add admin failed', color: 'error' })
  }
})

watch(
  () => props.reloadKey,
  async () => {
    await getVestingInfos()
    await getArchivedVestingInfos()
  }
)

const isVestingTuple = (value: unknown): value is VestingTuple => {
  if (!Array.isArray(value) || value.length !== 2) {
    return false
  }

  const [members, vestingsRaw] = value
  return Array.isArray(members) && Array.isArray(vestingsRaw)
}

const vestings = computed<VestingRow[]>(() => {
  const currentDateInSeconds = Math.floor(Date.now() / 1000)

  const allVestingsRaw: VestingTuple[] = [vestingInfos.value, archivedVestingInfos.value].filter(
    isVestingTuple
  )

  const allRows = allVestingsRaw.flatMap(([members, vestingsRaw]) =>
    members.map((member, idx): VestingRow => {
      const v = vestingsRaw[idx]
      if (!v) {
        return {
          member,
          teamId: Number(team.value?.id),
          startDate: '',
          isStarted: false,
          durationDays: 0,
          cliffDays: 0,
          totalAmount: 0,
          released: 0,
          status: 'Inactive',
          tokenSymbol: safeTokenSymbol.value
        }
      }
      const totalAmount = Number(formatUnits(v.totalAmount, 6))
      const released = Number(formatUnits(v.released, 6))
      const isStarted = currentDateInSeconds > Number(v.start)
      const isCompleted = v.active && released >= totalAmount
      const status = !v.active ? 'Inactive' : isCompleted ? 'Completed' : 'Active'

      return {
        member,
        teamId: Number(team.value?.id),
        startDate: (() => {
          const date = new Date(Number(v.start) * 1000)
          const day = String(date.getDate()).padStart(2, '0')
          const month = String(date.getMonth() + 1).padStart(2, '0')
          const year = date.getFullYear()
          return `${day}/${month}/${year}`
        })(),
        isStarted,
        durationDays: Math.floor(Number(v.duration) / 86400),
        cliffDays: Math.floor(Number(v.cliff) / 86400),
        totalAmount,
        released,
        status,
        tokenSymbol: safeTokenSymbol.value
      }
    })
  )

  switch (selectedStatus.value) {
    case 'active':
      return allRows.filter((row) => row.status === 'Active')
    case 'completed':
      return allRows.filter((row) => row.status === 'Completed')
    case 'cancelled':
      return allRows.filter((row) => row.status === 'Inactive')
    default:
      return allRows
  }
})

const handleReload = () => {
  emit('reload')
}

const teamId = computed(() => BigInt(team?.value?.id ?? 0))

const stopVestingWrite = useVestingStopVestingWrite()

const stopVesting = (member: string) => {
  stopVestingWrite.mutate(
    { args: [member, teamId.value] },
    {
      onSuccess: () => {
        toast.add({ title: 'vesting stoped successfully', color: 'success' })
        emit('reload')
      },
      onError: (err) => {
        toast.add({ title: 'stop vesting failed', color: 'error' })
        console.error('stop vesting error', err)
      }
    }
  )
}

const releaseVestingWrite = useVestingReleaseWrite()

const releaseVesting = () => {
  releaseVestingWrite.mutate(
    { args: [teamId.value] },
    {
      onSuccess: () => {
        toast.add({ title: 'vesting Releaseed successfully', color: 'success' })
        emit('reload')
      },
      onError: (err) => {
        toast.add({ title: 'Release vesting failed', color: 'error' })
        console.error('release vesting error', err)
      }
    }
  )
}

const loading = computed(
  () => releaseVestingWrite.isPending.value || stopVestingWrite.isPending.value
)

// Define columns including the new "Actions" column
const columns = [
  { accessorKey: 'member', header: 'Member Address', enableSorting: true },
  { accessorKey: 'tokenSymbol', header: 'Token', enableSorting: false },
  { accessorKey: 'startDate', header: 'Start Date', enableSorting: true },
  { accessorKey: 'durationDays', header: 'Duration (days)', enableSorting: true },
  { accessorKey: 'vestablePerDay', header: 'Per Day', enableSorting: false },
  { accessorKey: 'totalAmount', header: 'Total Amount', enableSorting: true },
  { accessorKey: 'released', header: 'Released', enableSorting: true },
  { accessorKey: 'status', header: 'Status', enableSorting: true },
  { accessorKey: 'withdrawn', header: 'Withdrawn', enableSorting: false },
  { accessorKey: 'actions', header: 'Actions' }
]
</script>
