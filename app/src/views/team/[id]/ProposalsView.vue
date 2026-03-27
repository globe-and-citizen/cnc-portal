<template>
  <div class="flex flex-col gap-4">
    <div class="flex flex-row justify-between items-center">
      <div class="flex flex-row gap-2 items-center">
        <select class="select select-bordered w-40">
          <option v-for="type in types" :key="type.value" :value="type.value">
            {{ type.label }}
          </option>
        </select>
        <select class="select select-bordered w-40">
          <option v-for="creator in creators" :key="creator.value" :value="creator.value">
            {{ creator.label }}
          </option>
        </select>
        <select class="select select-bordered w-40">
          <option v-for="status in statuses" :key="status.value" :value="status.value">
            {{ status.label }}
          </option>
        </select>
      </div>
      <UButton
        color="primary"
        @click="createProposalModal = { mount: true, show: true }"
        label="Create Proposal"
      />
    </div>

    <ProposalsList ref="proposalsListRef" />
    <UModal
      v-if="createProposalModal.mount"
      v-model:open="createProposalModal.show"
      :close="{ onClick: () => { createProposalModal = { mount: false, show: false } } }"
    >
      <template #body>
        <CreateProposalForm
          :loading="false"
          @close-modal="createProposalModal = { mount: false, show: false }"
          @proposal-created="handleProposalCreated"
        />
      </template>
    </UModal>
  </div>
</template>
<script setup lang="ts">
import CreateProposalForm from '@/components/sections/ProposalsView/forms/CreateProposalForm.vue'
import ProposalsList from '@/components/sections/ProposalsView/ProposalsList.vue'
import { ref } from 'vue'

const createProposalModal = ref({ mount: false, show: false })
const proposalsListRef = ref<InstanceType<typeof ProposalsList> | null>(null)

const types = [
  { label: 'All Types', value: '' },
  { label: 'Financial', value: 'Financial' },
  { label: 'Technical', value: 'Technical' },
  { label: 'Operational', value: 'Operational' }
]

const creators = [{ label: 'All Creators', value: '' }]

const statuses = [
  { label: 'All Status', value: '' },
  { label: 'Active', value: 0 },
  { label: 'Approved', value: 1 },
  { label: 'Rejected', value: 2 },
  { label: 'Tied', value: 3 }
]

const handleProposalCreated = () => {
  // Close the modal
  createProposalModal.value = { mount: false, show: false }
  // Refresh the proposals list
  if (proposalsListRef.value?.refreshProposals) {
    proposalsListRef.value.refreshProposals()
  }
}
</script>
