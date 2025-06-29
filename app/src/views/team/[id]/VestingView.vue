<template>
  <VestingStats :reloadKey="reloadKey" />
  <div>
    <ButtonUI
      v-if="team?.ownerAddress == userAddress"
      size="sm"
      variant="primary"
      class="w-max"
      @click="addVestingModal = true"
      data-test="createAddVesting"
    >
      <IconifyIcon icon="heroicons-outline:plus-circle" class="size-6" /> add vesting
    </ButtonUI>
  </div>
  <CardComponent title="Vesting Overview">
    <VestingFlow @reload="triggerReload" :reloadKey="reloadKey" />
  </CardComponent>
  <ModalComponent v-model="addVestingModal" size="lg">
    <CreateVesting
      v-if="team?.id"
      :tokenAddress="sherToken?.address ?? ''"
      @closeAddVestingModal="addVestingModal = false"
      @reload="triggerReload"
      :reloadKey="reloadKey"
    />
  </ModalComponent>
</template>

<script setup lang="ts">
import CardComponent from '@/components/CardComponent.vue'
import { ref, computed } from 'vue'
import VestingFlow from '@/components/sections/VestingView/VestingFlow.vue'
import VestingStats from '@/components/sections/VestingView/VestingStats.vue'
import { Icon as IconifyIcon } from '@iconify/vue'
import { useTeamStore } from '@/stores'
import ButtonUI from '@/components/ButtonUI.vue'
import CreateVesting from '@/components/sections/VestingView/forms/CreateVesting.vue'

import { useUserDataStore } from '@/stores'

import ModalComponent from '@/components/ModalComponent.vue'

const userStore = useUserDataStore()
const userAddress = computed(() => userStore.address)
const teamStore = useTeamStore()
const team = computed(() => teamStore.currentTeam)
const sherToken = computed(() =>
  team.value?.teamContracts?.find((contract) => contract.type === 'InvestorsV1')
)

const addVestingModal = ref(false)
const reloadKey = ref(0)

const triggerReload = () => {
  reloadKey.value++
}
</script>
