<template>
  <div  id="team-contracts" class="overflow-x-auto">
    <table class="table">
      <!-- head -->
      <thead>
        <tr>
          <th></th>
          <th>Type</th>
          <th>contract address</th>
          <th>link</th>
          <th>Admins</th>
        </tr>
      </thead>
      <tbody>
        <!-- row 1 -->
        <tr  v-for="(contract, index) in contracts" :key="index" class="bg-base-200">
          <th>{{index}}</th>
          <td>{{contract.type}}</td>
          <td>{{contract.address}}</td>
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
        </tr>
      </tbody>
    </table>
    
    <ModalComponent v-model="contractAdminDialog.show" >
      <div class=" max-w-lg">
        <h3 class="text-lg font-bold">contract Admin list</h3>
        <TeamContractAdmins :admins="contractAdminDialog.admins" />
      </div>
      
    </ModalComponent>
  </div>
</template>

<script setup lang="ts">
import {  UsersIcon } from '@heroicons/vue/24/outline'

import ModalComponent from '@/components/ModalComponent.vue'
import type { ContractAddress } from '@/types';
import { onMounted, ref } from 'vue';
import TeamContractAdmins from './TeamContractAdmins.vue';
// Define props
const props = defineProps<{
  contracts: ContractAddress[]
}>();


const contractAdminDialog=ref({title:'', show:false,admins:['']})


const  handleRemoveAdmin=(contractIndex: number, admin: string) => {
  console.log(`Removing admin: ${admin} from contract at index: ${contractIndex}`);
  // Implement the removal logic here
}

const openAdminsModal= (admins: string[])=> {
  contractAdminDialog.value.admins = admins;
  contractAdminDialog.value.show=true;
}


</script>
