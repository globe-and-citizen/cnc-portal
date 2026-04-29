<template>
  <div class="card bg-base-200 shadow-xl">
    <div class="card-body">
      <div class="mb-4 flex items-center gap-3">
        <IconifyIcon icon="heroicons:shield-check" class="text-primary h-8 w-8" />
        <div>
          <h2 class="card-title">Deploy Team Safe</h2>
          <p class="text-sm text-gray-500">
            Your team's multi-signature wallet is not deployed yet
          </p>
        </div>
      </div>

      <div class="bg-base-300 mb-4 rounded-lg p-4">
        <div class="space-y-2 text-sm">
          <div class="flex justify-between">
            <span class="text-gray-500">Owner:</span>
            <span class="font-mono">{{ userDataStore.address }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-500">Threshold:</span>
            <span class="font-semibold">1 of 1</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-500">Network:</span>
            <span class="font-semibold">{{ networkName.networkName }}</span>
          </div>
        </div>
      </div>

      <div class="alert alert-info mb-4">
        <IconifyIcon icon="heroicons:information-circle" class="h-5 w-5" />
        <span class="text-sm"
          >This will create a Gnosis Safe wallet for your team. You can add more owners later.</span
        >
      </div>

      <div class="card-actions justify-end">
        <UButton
          color="primary"
          :loading="isDeploying"
          :disabled="isDeploying || !canDeploy"
          data-test="deploy-safe-button"
          @click="handleDeploySafe"
        >
          {{ isDeploying ? 'Deploying Safe...' : 'Deploy Safe Wallet' }}
        </UButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Icon as IconifyIcon } from '@iconify/vue'
import { isAddress } from 'viem'
import { useTeamStore, useUserDataStore } from '@/stores'

import { useSafeDeployment } from '@/composables/safe'
import { useCreateContractMutation } from '@/queries/contract.queries'
import { log } from '@/utils'
import { NETWORK } from '@/constant'
import { useToast } from '@nuxt/ui/composables'

interface Props {
  teamId: number
}

const props = defineProps<Props>()
const emits = defineEmits(['safeDeployed'])
const toast = useToast()

// Stores
const teamStore = useTeamStore()
const userDataStore = useUserDataStore()

// Composables
const { deploySafe, isDeploying } = useSafeDeployment()
const { mutateAsync: createContract } = useCreateContractMutation()

const canDeploy = computed(
  () =>
    !!userDataStore.address &&
    isAddress(userDataStore.address) &&
    teamStore.currentTeam?.ownerAddress == userDataStore.address
)

const networkName = computed(() => NETWORK || 'Polygon')

/**
 * Deploy Safe wallet for the team
 */
const handleDeploySafe = async () => {
  if (!canDeploy.value) {
    toast.add({ title: 'Error', description: 'connect your wallet', color: 'error' })
    return
  }

  const safeAddress = await deploySafe([userDataStore.address!], 1)

  if (!safeAddress) {
    // Error already handled by deploySafe composable
    return
  }

  // Save Safe contract to database
  await createContract({
    body: {
      teamId: String(props.teamId),
      contractAddress: safeAddress,
      contractType: 'Safe',
      deployer: userDataStore.address!
    }
  })

  toast.add({
    title: 'Success',
    description: 'Safe wallet deployed successfully',
    color: 'success'
  })

  log.info('Safe deployed:', safeAddress)

  // Notify parent component
  emits('safeDeployed', safeAddress)
}
</script>
