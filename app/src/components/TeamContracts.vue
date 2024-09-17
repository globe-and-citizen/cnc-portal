<template>
  <div id="team-contracts" class="overflow-x-auto">
    <table class="table">
      <!-- head -->
      <thead>
        <tr>
          <th></th>
          <th>Type</th>
          <th>Contract Address</th>
          <th>Link</th>
          <th>Admins</th>
          <th>Details</th> <!-- Added a new column for contract details -->
        </tr>
      </thead>
      <tbody>
        <!-- row 1 -->
        <tr v-for="(contract, index) in contracts" :key="index" class="bg-base-200">
          <th>{{ index + 1 }}</th>
          <td>{{ contract.type }}</td>
          <td>{{ contract.address }}</td>
          <td>
            <a :href="'https://polygonscan.com/address/' + contract.address" target="_blank" rel="noopener noreferrer">
              {{ contract.address.slice(0, 6) + '...' + contract.address.slice(-4) }}
            </a>
          </td>
          <td>
            <button @click="openAdminsModal(contract.admins)" class="btn btn-ghost btn-xs">
              <UsersIcon class="size-6" />
            </button>
          </td>
          <td>
            <button @click="openContractDataModal(contract.address)" class="btn btn-ghost btn-xs">
              View Details
            </button>
          </td>
        </tr>
      </tbody>
    </table>
    
    <!-- Admin Modal -->
    <ModalComponent v-model="contractAdminDialog.show">
      <div class="max-w-lg">
        <h3 class="text-lg font-bold">Contract Admin List</h3>
        <TeamContractAdmins :admins="contractAdminDialog.admins" />
      </div>
    </ModalComponent>

    <!-- Contract Data Modal -->
    <ModalComponent v-model="contractDataDialog.show">
      <div class="max-w-lg">
        <h3 class="text-lg font-bold">Contract Details</h3>
        <TeamContractsDetail :datas="contractDataDialog.datas" />
      </div>
    </ModalComponent>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { UsersIcon } from '@heroicons/vue/24/outline';
import ModalComponent from '@/components/ModalComponent.vue';
import TeamContractAdmins from './TeamContractAdmins.vue';
import TeamContractsDetail from './TeamContractsDetail.vue';
import { AddCampaignService } from '@/services/AddCampaignService';
import type { ContractAddress } from '@/types';

// Define props
defineProps<{ contracts: ContractAddress[] }>();

// Initialize AddCampaignService instance
const addCamapaignService = new AddCampaignService();

// Modal for showing contract admins
const contractAdminDialog = ref({
  show: false,
  admins: [] as string[], // Use a string array
});

// Modal for showing contract data details
const contractDataDialog = ref({
  show: false,
  datas: [] as Array<{ key: string; value: string }>, // Properly define as an array of key-value pairs
});

// Function to fetch contract data
const _getContractDatas = async (contractAddress: string) => {
  const _datas = await addCamapaignService.getContractData(contractAddress);
  return _datas;
};

// Open Admins Modal
const openAdminsModal = (admins: string[]) => {
  contractAdminDialog.value.admins = admins;
  contractAdminDialog.value.show = true;
};

// Open Contract Data Modal
const openContractDataModal = async (contractAddress: string) => {
  contractDataDialog.value.datas = await _getContractDatas(contractAddress);
  contractDataDialog.value.show = true;
};
</script>
