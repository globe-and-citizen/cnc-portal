<template>
  <CardComponent title="Vesting OverView">
    <template #card-action>
      <div class="flex items-center gap-4">
        <VestingStatusFilter @statusChange="handleStatusChange" />

        <VestingActions :reloadKey="reloadKey" @reload="handleReload" />
      </div>
    </template>

    <span class="loading loading-spinner" v-if="loading"></span>

    <TableComponent
      :rows="vestings"
      :columns="columns"
      :sticky="true"
      :showPagination="true"
      data-test="vesting-overview"
    >
      <template #vestablePerDay-data="{ row }">
        <span class="flex items-center gap-1 text-sm text-gray-700">
          {{ Number((row.totalAmount / row.durationDays).toFixed(2)) }}
          <span class="text-xs">{{ row.tokenSymbol }}</span>
        </span>
      </template>
      <template #totalAmount-data="{ row }">
        <span class="flex items-center gap-1 text-sm text-gray-700">
          {{ (row as VestingRow).totalAmount }}
          <span class="text-xs">{{ row.tokenSymbol }}</span>
        </span>
      </template>
      <template #released-data="{ row }">
        <span class="flex items-center gap-1 badge badge-info">
          {{ row.released.toFixed(2) }}
          <span class="text-xs">{{ row.tokenSymbol }}</span>
        </span>
      </template>
      <template #withdrawn-data="{ row }">
        <span class="flex items-center gap-1 badge badge-info">
          {{ row.status === 'Inactive' ? (row.totalAmount - row.released).toFixed(2) : 0 }}
          <span class="text-xs">{{ row.tokenSymbol }}</span>
        </span>
      </template>

      <template #member-data="{ row }">
        <span>{{ row.member }}</span>
      </template>
      <template #actions-data="{ row }">
        <div class="flex flex-wrap gap-2">
          <!-- Stop Button -->

          <button
            v-if="row.status === 'Active' && team?.ownerAddress == userAddress"
            data-test="stop-btn"
            class="btn btn-xs btn-error flex items-center justify-center"
            @click.stop="
              stopVesting({
                address: VESTING_ADDRESS as Address,
                abi: VESTING_ABI,
                functionName: 'stopVesting',
                args: [row.member, BigInt(team?.id ?? 0)]
              })
            "
          >
            <IconifyIcon icon="mdi:stop-circle-outline" class="mr-1" />
            <span class="text-xs">Stop</span>
          </button>

          <!-- Withdraw Button -->

          <!-- Release Button -->

          <button
            data-test="release-btn"
            v-if="row.status === 'Active' && row.member === userAddress"
            class="btn btn-xs btn-success flex items-center justify-center"
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
          >
            <IconifyIcon icon="mdi:lock-open" class="mr-1" />
            <span class="text-xs">Release</span>
          </button>
        </div>
      </template>
    </TableComponent>
  </CardComponent>
</template>

<script setup lang="ts">
import TableComponent from '@/components/TableComponent.vue'
import { computed, watch, ref } from 'vue'
import CardComponent from '@/components/CardComponent.vue'
import { type VestingRow, type VestingTuple, type VestingStatus } from '@/types/vesting'
import { Icon as IconifyIcon } from '@iconify/vue'
import { useTeamStore } from '@/stores'
import { type Address, formatUnits } from 'viem'
import { useUserDataStore } from '@/stores'

import VestingActions from '@/components/sections/VestingView/VestingActions.vue'
import VestingStatusFilter from './VestingStatusFilter.vue'
import { useToastStore } from '@/stores/useToastStore'
import { useWriteContract, useWaitForTransactionReceipt, useReadContract } from '@wagmi/vue'
import { INVESTOR_ABI } from '@/artifacts/abi/investorsV1'
import { VESTING_ABI } from '@/artifacts/abi/vesting'
const { addErrorToast, addSuccessToast } = useToastStore()

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
  return teamStore?.currentTeam?.teamContracts?.find((contract) => contract.type === 'InvestorsV1')
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
    addErrorToast('get archived  failed')
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
    addErrorToast('Add admin failed')
  }
})

watch(
  () => props.reloadKey,
  async () => {
    await getVestingInfos()
    await getArchivedVestingInfos()
  }
)

const vestings = computed<VestingRow[]>(() => {
  const currentDateInSeconds = Math.floor(Date.now() / 1000)

  // @ts-expect-error type assertion
  const allVestingsRaw: VestingTuple[] = [vestingInfos.value, archivedVestingInfos.value].filter(
    // @ts-expect-error type assertion
    (v): v is VestingTuple =>
      Array.isArray(v) && v.length === 2 && Array.isArray(v[0]) && Array.isArray(v[1])
  )

  const allRows = allVestingsRaw.flatMap(([members, vestingsRaw]) =>
    members.map((member, idx): VestingRow => {
      const v = vestingsRaw[idx]
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
        tokenSymbol: tokenSymbol?.value || 'default'
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
  writeContract: stopVesting,
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
    addSuccessToast('vesting stoped successfully')
    emit('reload')
  }
})
watch(errorStopVesting, () => {
  if (errorStopVesting.value) {
    addErrorToast('stop vesting failed')
    console.error('add vesting error', errorStopVesting.value)
  }
})

const {
  writeContract: releaseVesting,
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
    addSuccessToast('vesting Releaseed successfully')
    emit('reload')
  }
})

watch(errorReleaseVesting, () => {
  if (errorReleaseVesting.value) {
    addErrorToast('Release vesting failed')
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
  { key: 'member', label: 'Member Address', sortable: true },
  { key: 'tokenSymbol', label: 'Token', sortable: false },
  { key: 'startDate', label: 'Start Date', sortable: true },
  { key: 'durationDays', label: 'Duration (days)', sortable: true },
  { key: 'vestablePerDay', label: 'Per Day', sortable: false },
  { key: 'totalAmount', label: 'Total Amount', sortable: true },
  { key: 'released', label: 'Released', sortable: true },
  { key: 'status', label: 'Status', sortable: true },
  { key: 'withdrawn', label: 'Withdrawn', sortable: false },
  { key: 'actions', label: 'Actions' }
]
</script>
