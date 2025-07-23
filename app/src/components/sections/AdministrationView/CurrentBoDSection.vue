<template>
  <CardComponent :title="`${electionId ? `Elected` : `Current`} Board of Directors`">
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
    <!-- <div v-else class="col-span-full text-center text-gray-500">
      No Board of Directors members found.
    </div> -->
    <CurrentBoDSection404 v-else />
  </CardComponent>
</template>
<script setup lang="ts">
import { BOD_ABI } from '@/artifacts/abi/bod'
import CardComponent from '@/components/CardComponent.vue'
import UserComponentCol from '@/components/UserComponent.vue'
import CurrentBoDSection404 from './CurrentBoDSection404.vue'
import { useTeamStore } from '@/stores'
import type { User } from '@/types'
import { useReadContract } from '@wagmi/vue'
import { computed, watch } from 'vue'
import { ELECTIONS_ABI } from '@/artifacts/abi/elections'
import { log, parseError } from '@/utils'

const props = defineProps<{
  electionId?: bigint
}>()

const teamStore = useTeamStore()
const bodAddress = computed(() => teamStore.getContractAddressByType('BoardOfDirectors'))
const electionsAddress = computed(() => teamStore.getContractAddressByType('Elections'))

const { data: boardOfDirectors, isFetching } = useReadContract({
  address: bodAddress.value,
  abi: BOD_ABI,
  functionName: 'getBoardOfDirectors',
  args: [],
  scopeKey: 'boardOfDirectors'
})
const { data: electionWinners, error: errorGetElectionWinners } = useReadContract({
  address: electionsAddress.value,
  abi: ELECTIONS_ABI,
  functionName: 'getElectionWinners',
  args: [BigInt(props.electionId || 0)], // Assuming 0 is the current election ID, adjust as necessary
  //scopeKey: 'electionWinners'
  query: { enabled: computed(() => !!props.electionId) }
})

const _boardOfDirectors = computed(() => {
  return props.electionId ? electionWinners.value : boardOfDirectors.value || []
})

watch(errorGetElectionWinners, (error) => {
  if (error) {
    log.error('Error fetching election winners: ', parseError(error))
  }
})
</script>
