<script setup lang="ts">
import { ref } from 'vue'
import DeployContractSection from './DeployContractSection.vue'
import useVuelidate from '@vuelidate/core'
import { minLength, required } from '@vuelidate/validators'
import type { Team } from '@/types'

defineEmits(['done'])
const investorContractInput = ref({
  name: '',
  symbol: ''
})
const props = defineProps<{
  team: Partial<Team>
}>()

const investorContractInputRules = {
  investorContractInput: {
    name: { required, minLength: minLength(4) },
    symbol: { required, minLength: minLength(3) }
  }
}

// Validation Instances
const $vInvestor = useVuelidate(investorContractInputRules, { investorContractInput })
</script>

<template>
  <div class="flex flex-col gap-5">
    <!-- Step Indicator -->
    <div class="steps w-full mb-4">
      <a class="step step-primary">Team Details</a>
      <a class="step step-primary">Members</a>
      <a class="step step-primary">Investor Contract</a>
    </div>

    <!-- Step 3: Investor Contract -->
    <div data-test="step-3">
      <span class="font-bold text-2xl mb-4">Investor Contract Details</span>
      <hr class="mb-6" />
      <div class="flex flex-col gap-5">
        <label class="input input-bordered flex items-center gap-2 input-md">
          <span class="w-24">Share Name</span>
          <input
            type="text"
            class="grow"
            placeholder="Company Shares"
            data-test="share-name-input"
            v-model="investorContractInput.name"
            @keyup.stop="$vInvestor.investorContractInput.name.$touch()"
            name="shareName"
          />
        </label>
        <div
          class="pl-4 text-red-500 text-sm"
          v-for="error of $vInvestor.investorContractInput.name.$errors"
          data-test="share-name-error"
          :key="error.$uid"
        >
          {{ error.$message }}
        </div>

        <label class="input input-bordered flex items-center gap-2 input-md">
          <span class="w-24">Symbol</span>
          <input
            type="text"
            class="grow"
            placeholder="SHR"
            data-test="share-symbol-input"
            v-model="investorContractInput.symbol"
            @keyup.stop="$vInvestor.investorContractInput.symbol.$touch()"
            name="shareSymbol"
          />
        </label>
        <div
          class="pl-4 text-red-500 text-sm"
          v-for="error of $vInvestor.investorContractInput.symbol.$errors"
          data-test="share-symbol-error"
          :key="error.$uid"
        >
          {{ error.$message }}
        </div>
      </div>
    </div>

    <!-- Navigation Buttons -->
    <div class="flex justify-between mt-6">
      <DeployContractSection
        :disabled="$vInvestor.$invalid"
        :investorContractInput="investorContractInput"
        :createdTeamData="props.team"
        @contractDeployed="$emit('done')"
      >
        Deploy Contracts
      </DeployContractSection>
    </div>
  </div>
</template>
