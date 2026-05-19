<template>
  <UCard>
    <div class="mb-4 flex items-center gap-3">
      <IconifyIcon icon="heroicons:shield-check" class="text-primary h-8 w-8" />
      <div>
        <h2 class="text-lg font-semibold">Deploy Team Safe</h2>
        <p class="text-sm text-gray-500">Your team's multi-signature wallet is not deployed yet</p>
      </div>
    </div>

    <div class="bg-elevated mb-4 rounded-lg p-4">
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

    <UAlert
      color="info"
      variant="soft"
      icon="heroicons:information-circle"
      description="This will create a Gnosis Safe wallet for your team. You can add more owners later."
    />

    <template #footer>
      <div class="flex justify-end gap-2">
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
    </template>
  </UCard>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Icon as IconifyIcon } from '@iconify/vue'
import { isAddress } from 'viem'
import { useTeamStore, useUserDataStore } from '@/stores'

import { useDeploySafeMutation } from '@/queries/safe.mutations'
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

const { mutateAsync: deploySafe, isPending: isDeploying } = useDeploySafeMutation()
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

  let safeAddress: string
  try {
    safeAddress = await deploySafe({
      owners: [userDataStore.address!],
      threshold: 1
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to deploy Safe'
    toast.add({
      title: 'Error',
      description: message.includes('User rejected') ? 'Transaction approval rejected' : message,
      color: 'error'
    })
    return
  }

  // Save Safe contract to database
  try {
    await createContract({
      body: {
        teamId: String(props.teamId),
        contractAddress: safeAddress,
        contractType: 'Safe',
        deployer: userDataStore.address!
      }
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to register Safe contract'
    toast.add({
      title: 'Warning',
      description: `Safe deployed on-chain, but registration failed: ${message}`,
      color: 'warning'
    })
    log.error('Safe registration failed:', err)
  }

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
