<template>
  <div v-if="contracts.length > 0">
    <div class="px-2 pt-2 pb-1 text-xs uppercase text-gray-500">Contracts</div>
    <div class="grid grid-cols-2 gap-4 px-2 pb-3" data-test="contract-search-results">
      <div
        v-for="contract in contracts"
        :key="contract.address"
        class="flex items-center relative group cursor-pointer"
        data-test="contract-row"
        @click="handleSelect(contract)"
      >
        <UserComponent
          class="p-4 flex-grow rounded-lg bg-white hover:bg-base-300"
          :user="{ name: contract.type, address: contract.address }"
          :data-test="`contract-dropdown-${contract.address}`"
        />
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { toRef } from 'vue'
import UserComponent from '@/components/UserComponent.vue'
import type { TeamContract } from '@/types'

const props = defineProps<{
  contracts: TeamContract[]
}>()

const emit = defineEmits<{
  select: [contract: TeamContract]
}>()

const contracts = toRef(props, 'contracts')

const handleSelect = (contract: TeamContract) => {
  emit('select', contract)
}
</script>
