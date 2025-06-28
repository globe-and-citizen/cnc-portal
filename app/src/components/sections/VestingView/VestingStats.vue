<template>
  <div>
    <CardComponent title="Vesting Stats">
      <div class="flex flex-col justify-around gap-2 w-full" data-test="vesting-stats">
        <TableComponent
          :rows="tokenSummaryRows"
          :columns="tokenSummaryColumns"
          :sticky="true"
          :showPagination="true"
        >
          <template #totalReleased-data="{ row }">
            <span class="flex items-center gap-1 text-sm text-gray-700">
              {{ row.totalReleased }}
              <span class="text-xs">{{ tokenSymbol }}</span>
            </span>
          </template>
          <template #totalVested-data="{ row }">
            <span class="flex items-center gap-1 text-sm text-gray-700">
              {{ row.totalVested }}
              <span class="text-xs">{{ tokenSymbol }}</span>
            </span>
          </template>
          <template #totalWithdrawn-data="{ row }">
            <span class="flex items-center gap-1 text-sm text-gray-700">
              {{ row.totalWithdrawn }}
              <span class="text-xs">{{ tokenSymbol }}</span>
            </span>
          </template>
        </TableComponent>
      </div>
    </CardComponent>
  </div>
</template>

<script setup lang="ts">
import TableComponent from '@/components/TableComponent.vue'
import CardComponent from '@/components/CardComponent.vue'
import { computed, ref, watch } from 'vue'
import { useReadContract } from '@wagmi/vue'
import { useTeamStore } from '@/stores'
import { useToastStore } from '@/stores/useToastStore'
import { type TokenSummary } from '@/types/vesting'
import { VESTING_ADDRESS } from '@/constant'
import { INVESTOR_ABI } from '@/artifacts/abi/investorsV1'
import VestingABI from '@/artifacts/abi/Vesting.json'
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
const { addErrorToast } = useToastStore()

const {
  data: archivedVestingInfos,
  //isLoading: isLoadingArchivedVestingInfos,
  error: errorGetArchivedVestingInfo,
  refetch: getArchivedVestingInfos
} = useReadContract({
  functionName: 'getTeamAllArchivedVestingsFlat',
  address: VESTING_ADDRESS as Address,
  abi: VestingABI,
  args: [team?.value?.id ?? 0]
})

watch(errorGetArchivedVestingInfo, () => {
  if (errorGetArchivedVestingInfo.value) {
    addErrorToast('get archived  failed')
    console.error('get archived  failed ====', errorGetArchivedVestingInfo)
  }
})

const investorsAddress = computed(() => {
  return teamStore?.currentTeam?.teamContracts?.find((contract) => contract.type === 'InvestorsV1')
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

const {
  data: vestingInfos,
  //isLoading: isLoadingVestingInfos,
  error: errorGetVestingInfo,
  refetch: getVestingInfos
} = useReadContract({
  functionName: 'getTeamVestingsWithMembers',
  address: VESTING_ADDRESS as Address,
  abi: VestingABI,
  args: [team?.value?.id ?? 0]
})
watch(errorGetVestingInfo, () => {
  if (errorGetVestingInfo.value) {
    addErrorToast('Add admin failed')
  }
})

const tokenSummaryColumns = [
  { key: 'symbol', label: 'Token Symbol', sortable: false },
  { key: 'totalVested', label: 'Total Vested', sortable: false },
  { key: 'totalReleased', label: 'Total Released', sortable: false },
  { key: 'totalWithdrawn', label: 'Total Withdrawn', sortable: false }
]
const tokenSummaryRows = computed(() => {
  const defaultToken = tokenSymbol.value ? tokenSymbol.value : 'default'
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
