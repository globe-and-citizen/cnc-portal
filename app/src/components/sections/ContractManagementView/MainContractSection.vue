<template>
  <section class="space-y-6" aria-labelledby="current-contracts-title">
    <h2 id="current-contracts-title" class="sr-only">Current contracts</h2>

    <div v-if="teamStore.currentTeamMeta.isPending" class="flex justify-center py-10">
      <UIcon name="i-lucide-loader-circle" class="text-primary size-10 animate-spin" />
    </div>

    <template v-else-if="generation">
      <UCard
        class="overflow-hidden"
        :ui="{ body: 'bg-gradient-to-r from-primary/10 via-primary/5 to-transparent' }"
      >
        <div class="grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <div>
            <div class="flex flex-wrap items-center gap-2">
              <span class="bg-success size-2 rounded-full" aria-hidden="true" />
              <span class="text-success text-xs font-semibold tracking-wide uppercase">
                Current generation
              </span>
              <UBadge color="primary" variant="subtle" size="sm">
                {{ generation.version || 'Unknown version' }}
              </UBadge>
            </div>
            <div class="mt-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
              <p class="text-highlighted text-xl font-semibold">Active Officer</p>
              <AddressToolTip :address="generation.officerAddress" :slice="true" class="text-xs" />
            </div>
            <p class="text-muted mt-2 text-sm">
              This generation currently controls {{ currentContracts.length }} workspace contracts.
            </p>
          </div>

          <TeamArchivedTooltip v-slot="{ disabled: archivedDisabled }">
            <UButton
              color="primary"
              icon="i-lucide-refresh-cw"
              label="Redeploy contracts"
              :disabled="
                teamStore.currentTeam?.ownerAddress !== userStore.address || archivedDisabled
              "
              data-test="createAddCampaign"
              @click="openRedeployModal"
            />
          </TeamArchivedTooltip>
        </div>
      </UCard>

      <MainContractTable :contracts="currentContracts" :version="generation.version" />
    </template>

    <UEmpty
      v-else
      icon="i-lucide-file-warning"
      title="No active deployment found"
      description="Deploy an Officer generation to manage contracts."
    />

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
