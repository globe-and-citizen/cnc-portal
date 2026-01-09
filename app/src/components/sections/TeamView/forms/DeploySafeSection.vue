<template>
  <div class="space-y-4">
    <!-- Safe Deployment Info -->
    <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
      <h3 class="font-medium text-blue-900 mb-2">Safe Wallet Configuration</h3>
      <ul class="text-sm text-blue-800 space-y-1">
        <li>• Owner: {{ userDataStore.address }}</li>
        <li>• Threshold: 1 of 1 signature required</li>
        <li>• Multi-signature capabilities enabled</li>
      </ul>
    </div>

    <!-- Deploy Button -->
    <ButtonUI
      variant="primary"
      :loading="isSafeDeploying"
      :disabled="isSafeDeploying || !canDeploy"
      data-test="deploy-safe-button"
      @click="deploySafeForTeam"
    >
      {{ isSafeDeploying ? 'Deploying Safe Wallet...' : 'Deploy Safe Wallet' }}
    </ButtonUI>

    <!-- Loading Messages -->
    <div v-if="isSafeDeploying" class="text-center py-4">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
      <p class="text-sm text-gray-600">{{ loadingMessage }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { isAddress } from 'viem'
import ButtonUI from '@/components/ButtonUI.vue'
import { useUserDataStore } from '@/stores/user'
import { useToastStore } from '@/stores/useToastStore'
import { useSafe } from '@/composables/useSafe'
import { useCustomFetch } from '@/composables/useCustomFetch'
import type { Team } from '@/types'
import { log } from '@/utils'

interface Props {
  createdTeamData: Partial<Team>
}

const props = defineProps<Props>()
const emit = defineEmits<{
  safeDeployed: [safeAddress: string]
}>()

const userDataStore = useUserDataStore()
const { addSuccessToast, addErrorToast } = useToastStore()
const { deploySafe, isBusy: isSafeDeploying } = useSafe()

const loadingMessage = ref('')

const canDeploy = computed(() => {
  return !!(props.createdTeamData?.id && userDataStore.address && isAddress(userDataStore.address))
})

const deploySafeForTeam = async () => {
  if (!props.createdTeamData?.id) {
    addErrorToast('Team data not found')
    return
  }

  const currentUserAddress = userDataStore.address

  if (!currentUserAddress || !isAddress(currentUserAddress)) {
    addErrorToast('Invalid wallet address. Please connect your wallet.')
    return
  }

  loadingMessage.value = 'Deploying Safe wallet...'

  try {
    // Deploy the Safe with current user as sole owner, threshold 1
    const safeAddress = await deploySafe([currentUserAddress], 1)

    loadingMessage.value = 'Updating team with Safe address...'

    // Update team with Safe address
    const { error: updateError } = await useCustomFetch<Team>(`teams/${props.createdTeamData.id}`)
      .put({
        safeAddress: safeAddress
      })
      .json()

    if (updateError.value) {
      log.error('Error updating team with Safe address:', updateError.value)
      addErrorToast('Failed to update team with Safe address')
      return
    }

    addSuccessToast(`Safe wallet deployed successfully at ${safeAddress}`)
    loadingMessage.value = ''
    emit('safeDeployed', safeAddress)
  } catch (error) {
    log.error('Error deploying Safe:', error)
    addErrorToast('Failed to deploy Safe wallet. Please try again.')
    loadingMessage.value = ''
  }
}
</script>
