<template>
  <UCard>
    <template #header>
      <div class="flex justify-between items-center">
        <span>Vesting OverView</span>
        <div class="flex items-center gap-4">
          <VestingStatusFilter @statusChange="handleStatusChange" />

          <VestingActions :reloadKey="reloadKey" @reload="handleReload" />
        </div>
      </div>
    </template>

    <span class="loading loading-spinner" v-if="loading"></span>

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
        <span class="flex items-center gap-1 badge badge-info">
          {{ row.released.toFixed(2) }}
          <span class="text-xs">{{ row.tokenSymbol }}</span>
        </span>
      </template>
      <template #withdrawn-cell="{ row: { original: row } }">
        <span class="flex items-center gap-1 badge badge-info">
          {{ row.status === 'Inactive' ? (row.totalAmount - row.released).toFixed(2) : 0 }}
          <span class="text-xs">{{ row.tokenSymbol }}</span>
        </span>
      </template>

      <template #member-cell="{ row: { original: row } }">
        <span>{{ row.member }}</span>
      </template>
      <template #actions-cell="{ row: { original: row } }">
        <div class="flex flex-wrap gap-2">
          <!-- Stop Button -->

          <UButton
            v-if="row.status === 'Active' && team?.ownerAddress == userAddress"
            data-test="stop-btn"
            color="error"
            size="xs"
            @click.stop="
              stopVesting({
                address: VESTING_ADDRESS as Address,
                abi: VESTING_ABI,
                functionName: 'stopVesting',
                args: [row.member, BigInt(team?.id ?? 0)]
              })
            "
            icon="mdi:stop-circle-outline"
            label="Stop"
          />

          <!-- Withdraw Button -->

          <!-- Release Button -->

          <UButton
            data-test="release-btn"
            v-if="row.status === 'Active' && row.member === userAddress"
            color="success"
            size="xs"
            :disabled="!row.isStarted"
            :title="!row.isStarted ? 'Vesting has not started yet' : ''"
            @click.stop="
              releaseVesting({
                address: VESTING_ADDRESS as Address,
                abi: VESTING_ABI,
                functionName: 'release',
                args: [BigInt(team?.id ?? 0)]
              })
            "
            icon="mdi:lock-open"
            label="Release"
          />
        </div>
      </template>
    </UTable>
  </UCard>
</template>

<script setup lang="ts">
import { computed, watch, ref } from 'vue'
import { type VestingRow, type VestingTuple, type VestingStatus } from '@/types/vesting'
import { useTeamStore } from '@/stores'
import { type Address, formatUnits } from 'viem'
import { useUserDataStore } from '@/stores'

import VestingActions from '@/components/sections/VestingView/VestingActions.vue'
import VestingStatusFilter from './VestingStatusFilter.vue'
import { useWriteContract, useWaitForTransactionReceipt, useReadContract } from '@wagmi/vue'
import { INVESTOR_ABI } from '@/artifacts/abi/investors'
import { VESTING_ABI } from '@/artifacts/abi/vesting'
const toast = useToast()

import { VESTING_ADDRESS } from '@/constant'
const teamStore = useTeamStore()
const team = computed(() => teamStore.currentTeam)

const emit = defineEmits(['reload'])

const props = defineProps<{
  reloadKey: number
}>()

const userStore = useUserDataStore()
const userAddress = computed(() => userStore.address)

const investorsAddress = computed(() => {
  return teamStore?.currentTeam?.teamContracts?.find((contract) => contract.type === 'InvestorV1')
    ?.address as Address
})

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
} = useReadContract({
  abi: INVESTOR_ABI,
  address: investorsAddress,
  functionName: 'symbol'
})

const safeTokenSymbol = computed(() =>
  typeof tokenSymbol.value === 'string' ? tokenSymbol.value : 'default'
)

const {
  data: archivedVestingInfos,
  //isLoading: isLoadingArchivedVestingInfos,
  error: errorGetArchivedVestingInfo,
  refetch: getArchivedVestingInfos
} = useReadContract({
  functionName: 'getTeamAllArchivedVestingsFlat',
  address: VESTING_ADDRESS as Address,
  abi: VESTING_ABI,
  args: [BigInt(team?.value?.id ?? 0)]
})

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
} = useReadContract({
  functionName: 'getTeamVestingsWithMembers',
  address: VESTING_ADDRESS as Address,
  abi: VESTING_ABI,
  args: [BigInt(team?.value?.id ?? 0)]
})
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

const {
  mutate: stopVesting,
  error: errorStopVesting,
  isPending: loadingStopVesting,
  data: hashStopVesting
} = useWriteContract()

const { isLoading: isConfirmingStopVesting, isSuccess: isConfirmedStopVesting } =
  useWaitForTransactionReceipt({
    hash: hashStopVesting
  })

watch(isConfirmingStopVesting, async (isConfirming, wasConfirming) => {
  if (wasConfirming && !isConfirming && isConfirmedStopVesting.value) {
    toast.add({ title: 'vesting stoped successfully', color: 'success' })
    emit('reload')
  }
})
watch(errorStopVesting, () => {
  if (errorStopVesting.value) {
    toast.add({ title: 'stop vesting failed', color: 'error' })
    console.error('add vesting error', errorStopVesting.value)
  }
})

const {
  mutate: releaseVesting,
  error: errorReleaseVesting,
  isPending: loadingReleaseVesting,
  data: hashReleaseVesting
} = useWriteContract()

const { isLoading: isConfirmingReleaseVesting, isSuccess: isConfirmedReleaseVesting } =
  useWaitForTransactionReceipt({
    hash: hashReleaseVesting
  })

watch(isConfirmingReleaseVesting, async (isConfirming, wasConfirming) => {
  if (wasConfirming && !isConfirming && isConfirmedReleaseVesting.value) {
    toast.add({ title: 'vesting Releaseed successfully', color: 'success' })
    emit('reload')
  }
})

watch(errorReleaseVesting, () => {
  if (errorReleaseVesting.value) {
    toast.add({ title: 'Release vesting failed', color: 'error' })
    console.error('add vesting error', errorReleaseVesting.value)
  }
})

const loading = computed(
  () =>
    loadingReleaseVesting.value ||
    (isConfirmingReleaseVesting.value && !isConfirmedReleaseVesting.value) ||
    loadingStopVesting.value ||
    (isConfirmingStopVesting.value && !isConfirmedStopVesting.value)
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
