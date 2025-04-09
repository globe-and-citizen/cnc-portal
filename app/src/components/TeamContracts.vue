<template>
  <div id="team-contracts" class="overflow-x-auto">
    <table class="table">
      <!-- head -->
      <thead>
        <tr>
          <th></th>
          <th>Type</th>
          <th>Contract Address</th>
          <th>Admins</th>
          <th>Details</th>
          <th>Events</th>
          <!-- Added a new column for contract details -->
        </tr>
      </thead>
      <tbody>
        <!-- row 1 -->
        <tr v-for="(contract, index) in contracts" :key="index" class="bg-base-200">
          <th>{{ index + 1 }}</th>
          <td>{{ contract.type }}</td>
          <td><AddressToolTip :address="contract.address" class="text-xs" /></td>
          <td>
            <button
              @click="openAdminsModal(contract)"
              class="btn btn-ghost btn-xs"
              data-test="open-admin-modal-btn"
            >
              <IconComponent icon="heroicons-outline:users" class="size-6" />
            </button>
          </td>
          <td>
            <button @click="openContractDataModal(contract.address)" class="btn btn-ghost btn-xs">
              View Details
            </button>
          </td>
          <td>
            <button @click="openEventsModal(contract.address)" class="btn btn-ghost btn-xs">
              View Events
            </button>
          </td>
        </tr>
      </tbody>
    </table>

    <!-- Admin Modal -->
    <ModalComponent v-model="contractAdminDialog.show">
      <div class="max-w-lg">
        <TeamContractAdmins :contract="contractAdminDialog.contract" />
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
import IconComponent from '@/components/IconComponent.vue'
import ModalComponent from '@/components/ModalComponent.vue'
import TeamContractAdmins from './TeamContractAdmins.vue'
import TeamContractsDetail from './TeamContractsDetail.vue'
import { AddCampaignService } from '@/services/AddCampaignService'

import type {
  GetEventsGroupedByCampaignCodeResult,
  ExtendedEvent
} from '@/services/AddCampaignService'
import { useToastStore } from '@/stores/useToastStore'
const { addErrorToast } = useToastStore()
import TeamContractEventList from './TeamContractEventList.vue'
import { type TeamContract } from '@/types'
import AddressToolTip from './AddressToolTip.vue'

// Define props
defineProps<{ contracts: TeamContract[]; teamId: string }>()
// Initialize AddCampaignService instance
const addCamapaignService = new AddCampaignService()

// Modal for showing contract admins
const contractAdminDialog = ref({
  show: false,
  contract: {} as TeamContract
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
const openAdminsModal = (contract: TeamContract) => {
  contractAdminDialog.value.contract = contract
  contractAdminDialog.value.show = true
}

// Open Events Modal
const openEventsModal = async (contractAddress: string) => {
  const result = (await addCamapaignService.getEventsGroupedByCampaignCode(
    contractAddress
  )) as GetEventsGroupedByCampaignCodeResult

  if (result.status === 'success' && result.events && Object.keys(result.events).length > 0) {
    contractEventsDialog.value.events = Object.values(result.events).flat()
    contractEventsDialog.value.show = true
  } else {
    addErrorToast('No events found')
  }
}

// Open Contract Data Modal
const openContractDataModal = async (contractAddress: string) => {
  contractDataDialog.value.datas = await addCamapaignService.getContractData(contractAddress)
  contractDataDialog.value.address = contractAddress
  contractDataDialog.value.show = true
  contractDataDialog.value.key++
}
</script>
