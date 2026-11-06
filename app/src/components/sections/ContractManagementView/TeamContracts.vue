<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useChainId } from '@wagmi/vue'
import type { Address } from 'viem'
import { useTeamStore } from '@/stores'
import type { TeamContract } from '@/types'
import { useCampaignManagerSettings } from '@/composables/campaign/reads'
import AddressTooltip from '@/components/ui/AddressTooltip.vue'
import TeamContractAdmins from './TeamContractAdmins.vue'
import TeamContractsDetail from './TeamContractsDetail.vue'
import AdvertisingCampaignWorkspace from './AdvertisingCampaignWorkspace.vue'

const teamStore = useTeamStore()
const chainId = useChainId()
const managers = computed(() =>
  (teamStore.currentTeam?.teamContracts ?? []).filter((contract) => contract.type === 'Campaign')
)
const selectedManagerAddress = ref<Address | undefined>(managers.value[0]?.address)
const selectedManager = computed(
  () => managers.value.find((manager) => manager.address === selectedManagerAddress.value) ?? null
)
const managerOptions = computed(() =>
  managers.value.map((manager, index) => ({
    label: `Campaign Manager ${index + 1} · ${manager.address.slice(0, 6)}…${manager.address.slice(-4)}`,
    value: manager.address
  }))
)

watch(
  managers,
  (nextManagers) => {
    if (!nextManagers.some((manager) => manager.address === selectedManagerAddress.value)) {
      selectedManagerAddress.value = nextManagers[0]?.address
    }
  },
  { deep: true }
)

const adminsOpen = ref(false)
const settingsOpen = ref(false)
const managerSettings = useCampaignManagerSettings(selectedManagerAddress, {
  enabled: computed(() => settingsOpen.value)
})
function openAdmins(manager: TeamContract) {
  selectedManagerAddress.value = manager.address
  adminsOpen.value = true
}

function openSettings(manager: TeamContract) {
  selectedManagerAddress.value = manager.address
  settingsOpen.value = true
}
</script>

<template>
  <UEmpty
    v-if="!managers.length"
    variant="naked"
    icon="i-lucide-server-cog"
    title="Campaign Manager is not configured"
    description="Set up the on-chain manager before creating and funding advertising campaigns."
    data-test="campaign-manager-empty"
  />

  <div v-else class="space-y-5">
    <div v-if="managers.length > 1" class="flex justify-end">
      <USelect
        v-model="selectedManagerAddress"
        :items="managerOptions"
        aria-label="Select Campaign Manager"
        data-test="campaign-manager-select"
        class="w-full sm:w-80"
      />
    </div>

    <UCard v-if="selectedManager" variant="subtle">
      <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div class="flex items-start gap-3">
          <div class="bg-primary/10 text-primary rounded-lg p-2.5">
            <UIcon name="i-lucide-server-cog" class="size-5" />
          </div>
          <div>
            <div class="flex flex-wrap items-center gap-2">
              <h3 class="text-highlighted font-semibold">Campaign Manager</h3>
              <UBadge color="success" variant="subtle" size="sm">Ready</UBadge>
            </div>
            <AddressTooltip
              :address="selectedManager.address"
              :slice="false"
              class="mt-1 text-xs"
            />
            <p class="text-muted mt-2 text-sm">
              Defines advertising rates and routes validated spend to the company Bank.
            </p>
          </div>
        </div>
        <div class="flex flex-wrap gap-2">
          <UButton
            color="neutral"
            variant="outline"
            icon="i-lucide-users"
            label="Administrators"
            @click="openAdmins(selectedManager)"
          />
          <UButton
            color="neutral"
            variant="outline"
            icon="i-lucide-settings-2"
            label="Manager settings"
            data-test="campaign-manager-settings"
            @click="openSettings(selectedManager)"
          />
        </div>
      </div>
    </UCard>

    <AdvertisingCampaignWorkspace
      v-if="selectedManagerAddress"
      :manager-address="selectedManagerAddress"
    />

    <UModal
      v-model:open="adminsOpen"
      title="Campaign Manager administrators"
      description="Manage the addresses allowed to validate advertising spend."
    >
      <template #body>
        <TeamContractAdmins
          v-if="selectedManager"
          :contract="selectedManager"
          :range="managers.indexOf(selectedManager) + 1"
        />
      </template>
    </UModal>

    <USlideover
      v-model:open="settingsOpen"
      title="Campaign Manager settings"
      description="Review the Bank destination and update click or impression rates."
      :ui="{ content: 'sm:max-w-xl' }"
    >
      <template #body>
        <div v-if="managerSettings.isPending.value" class="space-y-3">
          <USkeleton v-for="index in 4" :key="index" class="h-12 w-full" />
        </div>
        <UAlert
          v-else-if="managerSettings.isError.value"
          color="error"
          variant="soft"
          title="Manager settings could not be loaded"
          description="Check the selected network and retry."
          :actions="[
            {
              label: 'Retry',
              color: 'error',
              variant: 'outline',
              onClick: async () => {
                await managerSettings.refetch()
              }
            }
          ]"
        />
        <TeamContractsDetail
          v-else-if="settingsOpen && selectedManagerAddress && managerSettings.data.value"
          :key="`${chainId}:${selectedManagerAddress}`"
          :settings="managerSettings.data.value"
          :contract-address="selectedManagerAddress"
          @closeContractDataDialog="settingsOpen = false"
        />
      </template>
    </USlideover>
  </div>
</template>
