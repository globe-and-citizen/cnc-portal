<template>
  <div id="team-contracts" class="overflow-x-auto">
    <TableComponent
      :rows="
        teamStore.currentTeam?.teamContracts
          .filter((contract) => contract.type === 'Campaign')
          .map((contract, index) => ({
            ...contract,
            index: index + 1
          }))
      "
      :columns="[
        { key: 'index', label: '#' },
        { key: 'type', label: 'Type' },
        { key: 'address', label: 'Contract Address' },
        { key: 'admins', label: 'Admins' },
        { key: 'details', label: 'Details' },
        { key: 'events', label: 'Events' }
      ]"
    >
      <template #address-data="{ row }">
        <AddressToolTip :address="row.address" class="text-xs" />
      </template>

      <template #admins-data="{ row }">
        <button
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
          class="btn btn-xs btn-secondary"
          data-test="open-admin-modal-btn"
        >
          <IconifyIcon icon="material-symbols:person" class="size-4 text-white" />
        </button>
      </template>

      <template #details-data="{ row }">
        <button
          :disabled="row.type !== 'Campaign'"
          @click="openContractDataModal(row.address)"
          class="btn btn-ghost btn-xs"
        >
          View Details
        </button>
      </template>

      <template #events-data="{ row }">
        <button @click="openEventsModal(row.address)" class="btn btn-ghost btn-xs">
          View Events
        </button>
      </template>
    </TableComponent>

    <!-- Admin Modal -->
    <ModalComponent v-model="contractAdminDialog.show">
      <div class="max-w-lg">
        <TeamContractAdmins
          :contract="contractAdminDialog.contract"
          :range="contractAdminDialog.range"
        />
      </div>
    </ModalComponent>

    <!-- Contract Data Modal -->
    <ModalComponent v-model="contractDataDialog.show">
      <div class="max-w-lg">
        <h3 class="text-lg font-bold">Contract Details</h3>
        <TeamContractsDetail
          :contract-address="contractDataDialog.address"
          :datas="contractDataDialog.datas"
          :reset="contractDetailReset"
          @closeContractDataDialog="contractDataDialog.show = false"
        />
      </div>
    </ModalComponent>

    <ModalComponent v-model="contractEventsDialog.show">
      <div class="max-w-lg">
        <h3 class="text-lg font-bold">Contract Events</h3>
        <TeamContractEventList
          :eventsByCampaignCode="groupEventsByCampaignCode(contractEventsDialog.events)"
        />
      </div>
    </ModalComponent>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { Icon as IconifyIcon } from '@iconify/vue'
import ModalComponent from '@/components/ModalComponent.vue'
import TeamContractAdmins from './TeamContractAdmins.vue'
import TeamContractsDetail from './TeamContractsDetail.vue'
import { AddCampaignService } from '@/services/AddCampaignService'
import { getContractData } from '@/composables/useContractFunctions'

import { AD_CAMPAIGN_MANAGER_ABI } from '@/artifacts/abi/ad-campaign-manager'
import TableComponent from '@/components/TableComponent.vue'

import type {
  GetEventsGroupedByCampaignCodeResult,
  ExtendedEvent
} from '@/services/AddCampaignService'
import { useToastStore } from '@/stores/useToastStore'
const { addErrorToast } = useToastStore()
import { useTeamStore } from '@/stores/'
import type { Abi, Address } from 'viem'
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
      acc[event.campaignCode].push(event)
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
    addErrorToast('Failed to fetch events')
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
