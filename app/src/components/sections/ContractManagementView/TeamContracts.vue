<template>
  <div id="team-contracts" class="overflow-x-auto">
    <UTable
      :data="
        teamStore.currentTeam?.teamContracts
          .filter((contract) => contract.type === 'Campaign')
          .map((contract, index) => ({
            ...contract,
            index: index + 1
          }))
      "
      :columns="[
        { accessorKey: 'index', header: '#' },
        { accessorKey: 'type', header: 'Type' },
        { accessorKey: 'address', header: 'Contract Address' },
        { accessorKey: 'admins', header: 'Admins' },
        { accessorKey: 'details', header: 'Details' },
        { accessorKey: 'events', header: 'Events' }
      ]"
    >
      <template #address-cell="{ row: { original: row } }">
        <AddressToolTip :address="row.address" class="text-xs" />
      </template>

      <template #admins-cell="{ row: { original: row } }">
        <UButton
          :disabled="row.type !== 'Campaign'"
          @click="
            openAdminsModal(
              {
                address: row.address,
                type: row.type,
                deployer: row.deployer,
                admins: row.admins
              },
              row.index
            )
          "
          color="secondary"
          size="xs"
          data-test="open-admin-modal-btn"
          icon="material-symbols:person"
        />
      </template>

      <template #details-cell="{ row: { original: row } }">
        <button
          :disabled="row.type !== 'Campaign'"
          @click="openContractDataModal(row.address)"
          class="btn btn-ghost btn-xs"
        >
          View Details
        </button>
      </template>

      <template #events-cell="{ row: { original: row } }">
        <button @click="openEventsModal(row.address)" class="btn btn-ghost btn-xs">
          View Events
        </button>
      </template>
    </UTable>

    <!-- Admin Modal -->
    <UModal
      v-model:open="contractAdminDialog.show"
      title="Contract Admins"
      description="View and manage contract administrators for this campaign."
    >
      <template #body>
        <div class="max-w-lg">
          <TeamContractAdmins
            :contract="contractAdminDialog.contract"
            :range="contractAdminDialog.range"
          />
        </div>
      </template>
    </UModal>

    <!-- Contract Data Modal -->
    <UModal
      v-model:open="contractDataDialog.show"
      title="Contract Details"
      description="View the details of the selected campaign contract."
    >
      <template #body>
        <div class="max-w-lg">
          <TeamContractsDetail
            :contract-address="contractDataDialog.address"
            :datas="contractDataDialog.datas"
            :reset="contractDetailReset"
            @closeContractDataDialog="contractDataDialog.show = false"
          />
        </div>
      </template>
    </UModal>

    <UModal
      v-model:open="contractEventsDialog.show"
      title="Contract Events"
      description="Review events emitted by the contract to track actions and state changes."
    >
      <template #body>
        <div class="max-w-lg">
          <TeamContractEventList
            :eventsByCampaignCode="groupEventsByCampaignCode(contractEventsDialog.events)"
          />
        </div>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import TeamContractAdmins from './TeamContractAdmins.vue'
import TeamContractsDetail from './TeamContractsDetail.vue'
import { AddCampaignService } from '@/services/AddCampaignService'
import { getContractData } from '@/composables/useContractFunctions'

import { AD_CAMPAIGN_MANAGER_ABI } from '@/artifacts/abi/ad-campaign-manager'

import type {
  GetEventsGroupedByCampaignCodeResult,
  ExtendedEvent
} from '@/services/AddCampaignService'
const toast = useToast()
import { useTeamStore } from '@/stores/'
import type { Address } from 'viem'
import TeamContractEventList from './TeamContractEventList.vue'
import { type TeamContract } from '@/types'
import AddressToolTip from '@/components/AddressToolTip.vue'
const teamStore = useTeamStore()

// Initialize AddCampaignService instance
const addCamapaignService = new AddCampaignService()

// Modal for showing contract admins
const contractAdminDialog = ref({
  show: false,
  contract: {} as TeamContract,
  range: 0 as number
})

const contractDataDialog = ref({
  show: false,
  datas: [] as Array<{ key: string; value: string }>, // Properly define as an array of key-value pairs
  address: '',
  key: 0
})
const contractDetailReset = ref(false)

watch(
  () => contractDataDialog.value.show,
  (newVal) => {
    if (!newVal) {
      contractDetailReset.value = true
    } else {
      contractDetailReset.value = false
    }
  }
)

const contractEventsDialog = ref({
  show: false,
  events: [] as ExtendedEvent[]
})

// Function to group events by campaign code
const groupEventsByCampaignCode = (events: ExtendedEvent[]) => {
  return events.reduce(
    (acc, event) => {
      if (!acc[event.campaignCode]) {
        acc[event.campaignCode] = []
      }
      acc[event.campaignCode]!.push(event)
      return acc
    },
    {} as Record<string, ExtendedEvent[]>
  )
}

// Open Admins Modal
const openAdminsModal = (contract: TeamContract, range: number) => {
  contractAdminDialog.value.contract = contract
  contractAdminDialog.value.show = true
  contractAdminDialog.value.range = range
}

// Open Events Modal
const openEventsModal = async (contractAddress: Address) => {
  const result = (await addCamapaignService.getEventsGroupedByCampaignCode(
    contractAddress
  )) as GetEventsGroupedByCampaignCodeResult

  if (result.status === 'success') {
    if (result.events && Object.keys(result.events).length > 0) {
      contractEventsDialog.value.events = Object.values(result.events).flat()
      contractEventsDialog.value.show = true
    } else {
      contractEventsDialog.value.show = true
    }
  } else {
    toast.add({ title: 'Failed to fetch events', color: 'error' })
  }
}

// Open Contract Data Modal
const openContractDataModal = async (contractAddress: Address) => {
  contractDataDialog.value.datas = await getContractData(contractAddress, AD_CAMPAIGN_MANAGER_ABI)
  contractDataDialog.value.address = contractAddress
  contractDataDialog.value.show = true
  contractDataDialog.value.key++
}
</script>
