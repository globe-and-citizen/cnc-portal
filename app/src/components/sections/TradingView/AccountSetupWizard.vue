<template>
  <div class="flex items-center justify-center p-4">
    <div class="w-full" style="max-width: 900px">
      <!-- Heading -->
      <div class="text-center mb-10">
        <h1 class="text-3xl font-bold mb-2">Account Setup</h1>
        <p class="text-gray-500">
          Configure your trading wallet to start placing bets on Polymarket
        </p>
      </div>

      <StepIndicator :steps="steps" :current-step="currentStep" />

      <StepLabels :steps="steps" :current-step="currentStep" />

      <!-- Step Content -->
      <div class="card bg-base-100 shadow-xl p-8 max-w-2xl mx-auto">
        <PolymarketSafeDeployment
          v-if="currentStep === 1"
          :is-processing="isProcessing"
          @deploy-safe="handleDeploySafe"
        />

        <ApprovalAndConfig
          v-else-if="currentStep === 2"
          :is-processing="isProcessing || isLoading"
          @approve-and-configure="handleApproveAndConfigure"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import PolymarketSafeDeployment from './PolymarketSafeDeployment.vue'
import ApprovalAndConfig from './ApprovalAndConfig.vue'
import StepIndicator from './StepIndicators.vue'
import StepLabels from './StepLabels.vue'
import { useSafeDeployment, useRelayClient, useTokenApprovals } from '@/composables/trading'
import { log, parseError } from '@/utils'
import type { ApprovalCheckResult } from '@/utils/trading/approvalsUtil'
import { useUpdateUserMutation, useUserQuery } from '@/queries'
import { useUserDataStore, useTeamStore } from '@/stores'

const props = defineProps<{ initialStep: number }>()
// Emits
const emit = defineEmits(['setup-complete'])

const userDataStore = useUserDataStore()
const teamStore = useTeamStore()
const currentStep = ref(props.initialStep || 1)
const isProcessing = ref(false)
const { derivedSafeAddressFromEoa, isSafeDeployed, deploySafe } = useSafeDeployment()
const { checkAllApprovals, completeSetup } = useTokenApprovals()
const { getOrInitializeRelayClient, isLoading } = useRelayClient()
const userAddress = computed(() => userDataStore.address)
const {
  isPending: userIsUpdating,
  error: updateUserError,
  mutate: updateUserMutate,
  mutateAsync: updateUserMutateAsync
} = useUpdateUserMutation()

const steps = [
  {
    id: 1,
    title: 'Deploy Polymarket Safe',
    description: 'Create your multi-sig trading wallet on Polymarket'
  },
  {
    id: 2,
    title: 'Approve & Configure',
    description: 'Approve tokens and add owners in one transaction'
  }
]

const handleDeploySafe = async () => {
  isProcessing.value = true
  try {
    if (!derivedSafeAddressFromEoa.value) return
    console.log('Derived Safe Address:', derivedSafeAddressFromEoa.value)
    const relayClient = await getOrInitializeRelayClient()
    const isDeployed = await isSafeDeployed(relayClient, derivedSafeAddressFromEoa.value)
    console.log('Is Safe Deployed: ', isDeployed)
    if (!isDeployed) {
      const result = await deploySafe(relayClient)
      console.log('Safe Deployment Result: ', result)
      if (!result) return
    }

    if (currentStep.value < steps.length) {
      currentStep.value = currentStep.value + 1
    } else {
      // props.onComplete()
    }
  } catch (error) {
    log.info('deploy Safe error: ', parseError(error))
  } finally {
    isProcessing.value = false
  }
}

const handleApproveAndConfigure = async () => {
  isProcessing.value = true
  try {
    if (!derivedSafeAddressFromEoa.value) return
    console.log('Derived Safe Address:', derivedSafeAddressFromEoa.value)
    const relayClient = await getOrInitializeRelayClient()

    const approvalCheck: ApprovalCheckResult = await checkAllApprovals(
      derivedSafeAddressFromEoa.value
    )
    console.log('Approval Check Result: ', approvalCheck)

    if (!approvalCheck.isSetupComplete) {
      const result = await completeSetup(relayClient, derivedSafeAddressFromEoa.value)
      console.log('Approve and Configure Result: ', result)
      if (result) {
        console.log('')
        updateUserMutate(
          {
            address: userDataStore.address,
            userData: {
              traderSafeAddress: derivedSafeAddressFromEoa.value,
              teamId: teamStore.currentTeamId || undefined
            }
          },
          {
            onSuccess: () => {
              console.log('User updated sucessfully')
            },
            onError: () => {
              console.log(
                'Error updating user: ',
                updateUserError.value?.message || 'Failed to update user'
              )
            }
          }
        )
      } else return
    }

    if (currentStep.value < steps.length) {
      currentStep.value = currentStep.value + 1
    } else {
      // props.onComplete()
    }

    emit('setup-complete')
  } catch (error) {
    log.info('Approve and Configure error: ', parseError(error))
  } finally {
    isProcessing.value = false
  }
}
</script>
