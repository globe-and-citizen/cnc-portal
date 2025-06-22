<template>
  <VestingStatsView :vestings="vestings" :symbol="tokenSymbol ? tokenSymbol : ''" />
  <div>
    <CardComponent title="Vesting Overview">
      <template #card-action>
        <ButtonUI
          size="sm"
          data-test="toggle-vesting-view"
          :variant="displayActive ? 'secondary' : 'ghost'"
          class="w-max"
          @click="displayActive = !displayActive"
        >
          <IconifyIcon
            :icon="displayActive ? 'heroicons-outline:inbox' : 'heroicons-outline:archive-box'"
            class="size-6"
          />{{ displayActive ? 'actives' : 'archived' }}
        </ButtonUI>
        <ButtonUI
          v-if="team?.ownerAddress == useUserDataStore().address"
          size="sm"
          variant="primary"
          class="w-max"
          @click="addVestingModal = true"
          data-test="createAddVesting"
        >
          <IconifyIcon icon="heroicons-outline:plus-circle" class="size-6" /> add vesting
        </ButtonUI>
        <ModalComponent v-model="addVestingModal">
          <CreateVesting
            v-if="team?.id"
            :teamId="Number(team.id)"
            :tokenAddress="sherToken?.address ?? ''"
            @closeAddVestingModal="addVestingModal = false"
            @reloadVestingInfos="getVestingInfos"
            :vestings="activeVestings"
          />
        </ModalComponent>
      </template>
      <VestingFlowView :vestings="vestings" @reloadVestingInfos="getVestingInfos" />
    </CardComponent>
  </div>
</template>

<script setup lang="ts">
import CardComponent from '@/components/CardComponent.vue'
import { ref, computed, watch } from 'vue'
import VestingFlowView from './VestingFlowView.vue'
import VestingStatsView from './VestingStatsView.vue'
import { type VestingRow } from '@/types/vesting'
import { Icon as IconifyIcon } from '@iconify/vue'
import { useTeamStore } from '@/stores'
import ButtonUI from '@/components/ButtonUI.vue'
import CreateVesting from '@/components/forms/CreateVesting.vue'
import { type Address, formatEther } from 'viem'
import { useUserDataStore } from '@/stores'
import { useToastStore } from '@/stores/useToastStore'
import ModalComponent from '@/components/ModalComponent.vue'

import { useReadContract } from '@wagmi/vue'
import VestingABI from '@/artifacts/abi/Vesting.json'
const { addErrorToast } = useToastStore()
import { VESTING_ADDRESS } from '@/constant'
import { INVESTOR_ABI } from '@/artifacts/abi/investorsV1'
const teamStore = useTeamStore()
const team = computed(() => teamStore.currentTeam)
const sherToken = computed(() =>
  team.value?.teamContracts?.find((contract) => contract.type === 'InvestorsV1')
)
const displayActive = ref(true)
const addVestingModal = ref(false)

watch(displayActive, async () => {
  await getArchivedVestingInfos()
})

const vestings = computed<VestingRow[]>(() => {
  const currentDateInSeconds = Math.floor(Date.now() / 1000)

  let currentVestings = vestingInfos.value

  if (!displayActive.value) {
    currentVestings = archivedVestingInfos.value
  }
  if (currentVestings && Array.isArray(currentVestings) && currentVestings.length === 2) {
    const [members, vestingsRaw] = currentVestings
    if (
      Array.isArray(members) &&
      Array.isArray(vestingsRaw) &&
      members.length === vestingsRaw.length
    ) {
      return members.map((member: string, idx: number) => {
        const v = vestingsRaw[idx]
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
          isStarted: currentDateInSeconds > Number(v.start),
          durationDays: Math.floor(Number(v.duration) / 86400),
          cliffDays: Math.floor(Number(v.cliff) / 86400),
          totalAmount: Number(formatEther(v.totalAmount)),
          released: Number(formatEther(v.released)),
          status: !v.active ? 'Inactive' : 'Active',
          tokenSymbol: tokenSymbol.value || 'default'
        }
      })
    }
  }
  return [] as VestingRow[]
})

const activeVestings = ref<VestingRow[]>([])

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

watch(vestings, (newVestings) => {
  if (displayActive.value) {
    activeVestings.value = newVestings
  }
})
</script>
