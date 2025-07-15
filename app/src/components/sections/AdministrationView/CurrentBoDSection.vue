<template>
  <CardComponent title="Current Board of Directors">
    <div
      class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 mt-4"
      v-if="boardOfDirectors && boardOfDirectors.length > 0"
    >
      <div
        v-for="(memberAddress, index) in boardOfDirectors"
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

const teamStore = useTeamStore()
const electionsAddress = computed(() => {
  const address = teamStore.currentTeam?.teamContracts?.find(
    (c) => c.type === 'BoardOfDirectors'
  )?.address
  return address as Address
})
const { data: boardOfDirectors, isFetching } = useReadContract({
  address: electionsAddress.value,
  abi: BOD_ABI,
  functionName: 'getBoardOfDirectors',
  args: [],
  scopeKey: 'boardOfDirectors'
})
</script>
