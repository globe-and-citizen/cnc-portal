<template>
  <section class="flex flex-col gap-4" aria-labelledby="current-contracts-title">
    <div>
      <h2 id="current-contracts-title" class="text-highlighted text-lg font-semibold">
        Current contracts
      </h2>
      <p class="text-muted mt-1 text-sm">Contracts managed by the active Officer generation.</p>
    </div>

    <div v-if="teamStore.currentTeamMeta.isPending" class="flex justify-center">
      <UIcon name="i-lucide-loader-circle" class="text-primary h-10 w-10 animate-spin" />
    </div>

    <UCard v-else-if="generation" class="w-full">
      <template #header>
        <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div class="flex flex-wrap items-center gap-2">
            <span class="text-highlighted font-medium">Active Officer</span>
            <UBadge color="primary" variant="subtle" size="sm">
              {{ generation.version || 'Unknown version' }}
            </UBadge>
            <UBadge color="success" variant="soft" size="sm">Current</UBadge>
            <AddressToolTip :address="generation.officerAddress" :slice="true" class="text-xs" />
          </div>

          <TeamArchivedTooltip v-slot="{ disabled: archivedDisabled }">
            <UButton
              color="primary"
              icon="i-lucide-refresh-cw"
              :disabled="
                teamStore.currentTeam?.ownerAddress !== userStore.address || archivedDisabled
              "
              data-test="createAddCampaign"
              @click="openRedeployModal"
            >
              Redeploy Contracts
            </UButton>
          </TeamArchivedTooltip>
        </div>
      </template>

      <MainContractTable :contracts="currentContracts" :version="generation.version" />
    </UCard>

    <UCard v-else class="w-full">
      <div class="text-muted py-8 text-center text-sm">No active deployment found.</div>
    </UCard>

    <RedeployOfficerModal v-model:open="showModal" />
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import AddressToolTip from '@/components/AddressToolTip.vue'
import TeamArchivedTooltip from '@/components/TeamArchivedTooltip.vue'
import type { ContractGeneration } from '@/composables/contracts/useContractManagementGenerations'
import { useTeamWriteGuard } from '@/composables/useTeamWriteGuard'
import { useTeamStore } from '@/stores'
import { useUserDataStore } from '@/stores/user'
import MainContractTable from './MainContractTable.vue'
import RedeployOfficerModal from './RedeployOfficerModal.vue'

const props = defineProps<{
  generation?: ContractGeneration
}>()

const teamStore = useTeamStore()
const userStore = useUserDataStore()
const { isWriteDisabled } = useTeamWriteGuard()
const showModal = ref(false)
const currentContracts = computed(
  () => props.generation?.contracts.filter((contract) => contract.type !== 'Campaign') ?? []
)

function openRedeployModal() {
  if (isWriteDisabled.value) return
  showModal.value = true
}
</script>
