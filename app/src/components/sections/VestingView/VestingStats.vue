<template>
  <UCard>
    <template #header>Vesting Stats</template>
    <UTable
      :data="tokenSummaryRows"
      :columns="tokenSummaryColumns"
      :sticky="true"
      :showPagination="true"
    >
      <template #totalReleased-cell="{ row: { original: row } }">
        <span class="flex items-center gap-1 text-sm text-gray-700">
          {{ row.totalReleased }}
          <span class="text-xs">{{ tokenSymbolText }}</span>
        </span>
      </template>
      <template #totalVested-cell="{ row: { original: row } }">
        <span class="flex items-center gap-1 text-sm text-gray-700">
          {{ row.totalVested }}
          <span class="text-xs">{{ tokenSymbolText }}</span>
        </span>
      </template>
      <template #totalWithdrawn-cell="{ row: { original: row } }">
        <span class="flex items-center gap-1 text-sm text-gray-700">
          {{ row.totalWithdrawn }}
          <span class="text-xs">{{ tokenSymbolText }}</span>
        </span>
      </template>
    </UTable>
  </UCard>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useReadContract } from '@wagmi/vue'
import { useTeamStore } from '@/stores'
import { type TokenSummary } from '@/types/vesting'
import { VESTING_ADDRESS } from '@/constant'
import { INVESTOR_ABI } from '@/artifacts/abi/investors'
import { VESTING_ABI } from '@/artifacts/abi/vesting'
import { type Address, formatUnits } from 'viem'

const teamStore = useTeamStore()
const team = computed(() => teamStore.currentTeam)

const props = defineProps<{
  reloadKey: number
}>()

const displayActive = ref(true)

watch(displayActive, async () => {
  await getArchivedVestingInfos()
  await getVestingInfos()
})
watch(
  () => props.reloadKey,
  async () => {
    await getArchivedVestingInfos()
    await getVestingInfos()
  }
)

const totals = computed<{ totalAmount: number; totalReleased: number; totalWithdrawn: number }>(
  () => {
    const result = { totalAmount: 0, totalReleased: 0, totalWithdrawn: 0 }
    // Process active vestings
    if (
      vestingInfos.value &&
      Array.isArray(vestingInfos.value) &&
      vestingInfos.value.length === 2
    ) {
      const [, activeVestingsRaw] = vestingInfos.value
      if (Array.isArray(activeVestingsRaw)) {
        activeVestingsRaw.forEach((v) => {
          result.totalAmount += Number(formatUnits(v.totalAmount, 6))
          result.totalReleased += Number(formatUnits(v.released, 6))
        })
      }
    }
    // Process archived vestings
    if (
      archivedVestingInfos.value &&
      Array.isArray(archivedVestingInfos.value) &&
      archivedVestingInfos.value.length === 2
    ) {
      const [, archivedVestingsRaw] = archivedVestingInfos.value
      if (Array.isArray(archivedVestingsRaw)) {
        archivedVestingsRaw.forEach((v) => {
          result.totalAmount += Number(formatUnits(v.totalAmount, 6))
          result.totalReleased += Number(formatUnits(v.released, 6))
          result.totalWithdrawn +=
            Number(formatUnits(v.totalAmount, 6)) - Number(formatUnits(v.released, 6))
        })
      }
    }
    return result
  }
)

// Define columns including the new "Actions" column
const toast = useToast()

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

const investorsAddress = computed(() => {
  return teamStore?.currentTeam?.teamContracts?.find((contract) => contract.type === 'InvestorV1')
    ?.address as Address
})

const {
  data: tokenSymbol
  //isLoading: isLoadingTokenSymbol
  //error: tokenSymbolError
} = useReadContract({
  abi: INVESTOR_ABI,
  address: investorsAddress,
  functionName: 'symbol'
})

const tokenSymbolText = computed(() =>
  typeof tokenSymbol.value === 'string' ? tokenSymbol.value : 'default'
)

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

const tokenSummaryColumns = [
  { accessorKey: 'symbol', header: 'Token Symbol', enableSorting: false },
  { accessorKey: 'totalVested', header: 'Total Vested', enableSorting: false },
  { accessorKey: 'totalReleased', header: 'Total Released', enableSorting: false },
  { accessorKey: 'totalWithdrawn', header: 'Total Withdrawn', enableSorting: false }
]
const tokenSummaryRows = computed(() => {
  const defaultToken = tokenSymbolText.value
  const summaryMap: Record<string, TokenSummary> = {}
  summaryMap[defaultToken] = {
    symbol: defaultToken,
    totalVested: totals.value.totalAmount,
    totalReleased: totals.value.totalReleased,
    totalWithdrawn: totals.value.totalWithdrawn
  }
  return Object.values(summaryMap)
})
</script>
