<template>
  <CardComponent :title="`${electionId? `Elected`: `Current`} Board of Directors`">
    <div
      class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 mt-4"
      v-if="boardOfDirectors && boardOfDirectors.length > 0"
    >
      <div
        v-for="(memberAddress, index) in _boardOfDirectors"
        :key="index"
        class="rounded-xl overflow-hidden bg-gradient-to-t from-emerald-100 to-emarald-50 shadow-sm hover:shadow-md transition-all mt-4"
      >
        <UserComponentCol
          :user="teamStore.currentTeam?.members.find((m) => m.address === memberAddress) as User"
          :isDetailedView="true"
          class="p-6"
        />
      </div>
    </div>
    <div v-else-if="isFetching" class="col-span-full text-center">Loading...</div>
    <div v-else class="col-span-full text-center text-gray-500">
      No Board of Directors members found.
    </div>
  </CardComponent>
</template>
<script setup lang="ts">
import { BOD_ABI } from '@/artifacts/abi/bod'
import CardComponent from '@/components/CardComponent.vue'
import UserComponentCol from '@/components/UserComponent.vue'
import { useTeamStore } from '@/stores'
import type { User } from '@/types'
import { useReadContract } from '@wagmi/vue'
import type { Address } from 'viem'
import { computed } from 'vue'
import { ELECTIONS_ABI } from '@/artifacts/abi/elections'

const props = defineProps<{
  electionId?: bigint
}>()

const teamStore = useTeamStore()
const bodAddress = computed(() => {
  const address = teamStore.currentTeam?.teamContracts?.find(
    (c) => c.type === 'BoardOfDirectors'
  )?.address
  return address as Address
})
const electionsAddress = computed(() => {
  const address = teamStore.currentTeam?.teamContracts?.find((c) => c.type === 'Elections')?.address
  return address as Address
})
const _boardOfDirectors = computed(() => {
  return props.electionId ? electionWinners.value : boardOfDirectors.value || []
})
const { data: boardOfDirectors, isFetching } = useReadContract({
  address: bodAddress.value,
  abi: BOD_ABI,
  functionName: 'getBoardOfDirectors',
  args: [],
  scopeKey: 'boardOfDirectors'
})
const { data: electionWinners } = useReadContract({
  address: electionsAddress.value,
  abi: ELECTIONS_ABI,
  functionName: 'getElectionWinners',
  args: [props.electionId as bigint] // Assuming 0 is the current election ID, adjust as necessary
  //scopeKey: 'electionWinners'
})
</script>
