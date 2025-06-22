<template>
  <div>
    <span class="loading loading-spinner" v-if="loading"></span>
    <div class="flex flex-col justify-around gap-2 w-full" data-test="vesting-overview">
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
          <!-- <span v-if="useUserDataStore().address === row.member">
              {{ row.member?.slice(0, 10) }}
            </span> -->
          <span>{{ row.member }}</span>
        </template>
        <template #actions-data="{ row }">
          <div class="flex flex-wrap gap-2">
            <!-- Stop Button -->

            <button
              v-if="row.status === 'Active' && team?.ownerAddress == useUserDataStore().address"
              data-test="stop-btn"
              class="btn btn-xs btn-error flex items-center justify-center"
              @click.stop="
                stopVesting({
                  address: VESTING_ADDRESS as Address,
                  abi: VestingABI,
                  functionName: 'stopVesting',
                  args: [row.member, team?.id]
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
              v-if="row.status === 'Active' && row.member === useUserDataStore().address"
              class="btn btn-xs btn-success flex items-center justify-center"
              :disabled="!row.isStarted"
              :title="!row.isStarted ? 'Vesting has not started yet' : ''"
              @click.stop="
                releaseVesting({
                  address: VESTING_ADDRESS as Address,
                  abi: VestingABI,
                  functionName: 'release',
                  args: [team?.id]
                })
              "
            >
              <IconifyIcon icon="mdi:lock-open" class="mr-1" />
              <span class="text-xs">Release</span>
            </button>
          </div>
        </template>
      </TableComponent>
    </div>
  </div>
</template>

<script setup lang="ts">
import TableComponent from '@/components/TableComponent.vue'
import { computed, watch } from 'vue'
import { type VestingRow } from '@/types/vesting'
import { Icon as IconifyIcon } from '@iconify/vue'
import { useTeamStore } from '@/stores'
import { type Address } from 'viem'
import { useUserDataStore } from '@/stores'
import { useToastStore } from '@/stores/useToastStore'
import { useWriteContract, useWaitForTransactionReceipt } from '@wagmi/vue'

import VestingABI from '@/artifacts/abi/Vesting.json'
const { addErrorToast, addSuccessToast } = useToastStore()
import { VESTING_ADDRESS } from '@/constant'
const teamStore = useTeamStore()
const team = computed(() => teamStore.currentTeam)

const emit = defineEmits(['reloadVestingInfos'])

defineProps<{
  vestings: VestingRow[]
}>()
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
    emit('reloadVestingInfos')
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
    emit('reloadVestingInfos')
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
