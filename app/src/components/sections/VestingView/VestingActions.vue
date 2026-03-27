<template>
  <div>
    <UButton
      v-if="teamStore.currentTeam?.ownerAddress === userStore.address"
      size="sm"
      color="primary"
      class="w-max"
      @click="addVestingModal = { mount: true, show: true }"
      data-test="createAddVesting"
      leading-icon="heroicons-outline:plus-circle"
      label="add vesting"
    />

    <UModal
      v-if="addVestingModal.mount"
      v-model:open="addVestingModal.show"
      :close="{
        onClick: () => {
          addVestingModal = { mount: false, show: false }
        }
      }"
    >
      <template #body>
        <CreateVesting
          v-if="teamStore.currentTeamId"
          :tokenAddress="(teamStore.getContractAddressByType('InvestorV1') as Address) ?? ''"
          @closeAddVestingModal="handleClose"
          @reload="handleReload"
          :reloadKey="reloadKey"
        />
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import CreateVesting from '@/components/sections/VestingView/forms/CreateVesting.vue'
import { useTeamStore, useUserDataStore } from '@/stores'
import type { Address } from 'viem'

defineProps<{
  reloadKey: number
}>()

const emit = defineEmits(['reload'])

const addVestingModal = ref({ mount: false, show: false })
const userStore = useUserDataStore()
const teamStore = useTeamStore()

const handleReload = () => {
  emit('reload') // Propagate reload up
}

const handleClose = () => {
  addVestingModal.value = { mount: false, show: false }
}
</script>
