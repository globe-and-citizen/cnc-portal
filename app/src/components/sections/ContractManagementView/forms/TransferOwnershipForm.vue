<template>
  <div class="flex flex-col gap-5">
    <!-- Step 1: Select Owner -->
    <div v-if="currentStep === 1" data-test="step-1">
      <span class="font-bold text-xl mb-4">Transfer ownership</span>
      <p class="mt-4">Do you want to transfer ownership to the BOD or to a member?</p>
      <hr class="mt-6" />

      <!-- Selectable Cards Container -->
      <div class="flex gap-4 mt-6">
        <!-- BOD Card -->
        <TransferOptionCard
          label="Transfer to BOD"
          :isSelected="selectedOption === 'bod'"
          icon="heroicons:user-group-solid"
          @selected="selectedOption = 'bod'"
        />

        <!-- Member Card -->
        <TransferOptionCard
          label="Transfer to Member"
          :isSelected="selectedOption === 'member'"
          icon="heroicons:user-solid"
          @selected="selectedOption = 'member'"
        />
      </div>
    </div>

    <div v-if="currentStep === 2">
      <!-- Transfer to BOD -->
      <div v-if="selectedOption === 'bod'" data-test="step-2">
        <span class="font-bold text-xl mb-6">Recap of the transfer ownership</span>
        <p class="mt-4">
          You will transfer ownership to the BOD. Only the members of the BOD will be able to manage
          this contract.
        </p>
        <hr class="mt-6" />
      </div>

      <!-- Transfer to Member -->
      <div v-else-if="selectedOption === 'member'" data-test="step-3">
        <span class="font-bold text-xl mb-4">Select member</span>
        <p class="mt-4">Select the member address to transfer ownership.</p>
        <hr class="mt-6" />
        <SelectMemberInput
          v-model="input"
          @select-member="(user) => console.log('Selected Member: ', user)"
        />
      </div>
    </div>

    <!-- Navigation Buttons -->
    <div v-if="currentStep == 1" class="mt-6">
      <ButtonUI variant="primary" class="w-full" data-test="next-button" @click="handleContinue">
        Continue
      </ButtonUI>
    </div>
    <div v-if="currentStep == 2" class="flex justify-between mt-6">
      <ButtonUI variant="error" @click="currentStep--" data-test="back-button">
        <span><IconifyIcon icon="heroicons:arrow-left" /></span> Back
      </ButtonUI>
      <ButtonUI
        :loading="loading"
        variant="primary"
        data-test="transfer-ownership-button"
        @click="handleTransferOwnership"
        :disabled="!formValid || loading"
      >
        Transfer Ownership
      </ButtonUI>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import ButtonUI from '@/components/ButtonUI.vue'
import SelectMemberInput from '@/components/utils/SelectMemberInput.vue'
import { onClickOutside } from '@vueuse/core'
import { Icon as IconifyIcon } from '@iconify/vue'
import TransferOptionCard from '../TransferOptionCard.vue'
import { useTeamStore } from '@/stores'
import { isAddress, type Address } from 'viem'

defineProps<{ loading: boolean }>()
const emits = defineEmits(['transfer-ownership'])
const teamStore = useTeamStore()

// Refs
const selectedOption = ref<'bod' | 'member' | null>(null)
const showDropdown = ref(false)
const formRef = ref<HTMLElement | null>(null)
const input = ref({ name: '', address: '' })
const currentStep = ref(1)
// Validation Rules

// Functions
const handleContinue = () => {
  if (currentStep.value < 3) {
    currentStep.value++
  }
}

const formValid = computed(() => isAddress(input.value.address) || selectedOption.value === 'bod')

const handleTransferOwnership = () => {
  if (selectedOption.value === 'member') {
    emits('transfer-ownership', input.value.address as Address)
  } else if (selectedOption.value === 'bod') {
    emits('transfer-ownership', teamStore.getContractAddressByType('BoardOfDirectors'))
  }
}

// Lifecycle Hooks
onMounted(() => {
  onClickOutside(formRef, () => {
    showDropdown.value = false
  })
})
</script>
