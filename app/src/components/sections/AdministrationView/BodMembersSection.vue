<template>
  <UCard>
    <template #header>{{ electionId ? `Elected` : `Current` }} Board of Directors</template>
    <div
      class="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
      v-if="normalizedBoardOfDirectors.length > 0"
    >
      <div
        v-for="(memberAddress, index) in _boardOfDirectors"
        :key="index"
        class="overflow-hidden rounded-xl border border-emerald-200 bg-gradient-to-t from-emerald-100 to-emerald-50 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
      >
        <UserIdentity
          :user="
            teamStore.currentTeamMeta?.data?.members.find(
              (m) => m.address === memberAddress
            ) as User
          "
          :isDetailedView="true"
          class="p-6"
        />
      </div>
    </div>
    <div v-else-if="isFetching" class="col-span-full text-center">Loading...</div>
    <!-- <div v-else class="col-span-full text-center text-gray-500">
      No Board of Directors members found.
    </div> -->
    <BodMembersEmptyState v-else />
  </UCard>
</template>
<script setup lang="ts">
import { boardOfDirectorsAbi, electionsAbi } from '@/artifacts/abi/generated'
import UserIdentity from '@/components/ui/UserIdentity.vue'
import BodMembersEmptyState from './BodMembersEmptyState.vue'
import { useTeamStore } from '@/stores'
import type { User } from '@/types'
import { useReadContract } from '@wagmi/vue'
import { computed, watch } from 'vue'
import { log } from '@/lib/logging'

const props = defineProps<{
  electionId?: bigint
}>()

const teamStore = useTeamStore()
const bodAddress = computed(() => teamStore.getContractAddressByType('BoardOfDirectors'))
const electionsAddress = computed(() => teamStore.getContractAddressByType('Elections'))

const { data: boardOfDirectors, isFetching } = useReadContract({
  // Ref, not `.value`: on a page reload the team contracts land after setup
  // has already run, and a frozen `undefined` address never recovers.
  address: bodAddress,
  abi: boardOfDirectorsAbi,
  functionName: 'getBoardOfDirectors',
  args: [],
  scopeKey: 'boardOfDirectors',
  query: { enabled: computed(() => !!bodAddress.value) }
})

const normalizedBoardOfDirectors = computed<string[]>(() =>
  Array.isArray(boardOfDirectors.value)
    ? boardOfDirectors.value.filter((member): member is string => typeof member === 'string')
    : []
)
const winnersArgs = computed(() => [BigInt(props.electionId || 0)] as const)
const { data: electionWinners, error: errorGetElectionWinners } = useReadContract({
  address: electionsAddress,
  abi: electionsAbi,
  functionName: 'getElectionWinners',
  args: winnersArgs,
  //scopeKey: 'electionWinners'
  query: { enabled: computed(() => !!props.electionId && !!electionsAddress.value) }
})

const _boardOfDirectors = computed(() => {
  if (props.electionId && Array.isArray(electionWinners.value)) {
    return electionWinners.value.filter((member): member is string => typeof member === 'string')
  }

  return normalizedBoardOfDirectors.value
})

watch(errorGetElectionWinners, (error) => {
  if (error) {
    log.error('Error fetching election winners: ', error)
  }
})
</script>
