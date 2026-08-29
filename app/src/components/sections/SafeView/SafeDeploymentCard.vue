<template>
  <UCard class="h-full">
    <div class="mb-4 flex items-center gap-3">
      <IconifyIcon icon="heroicons:shield-check" class="text-primary h-8 w-8" />
      <div>
        <h2 class="text-lg font-semibold">Deploy a new Safe</h2>
        <p class="text-sm text-gray-500">
          Create a new wallet with the team owner as its first signer.
        </p>
      </div>
    </div>

    <div class="bg-elevated mb-4 rounded-lg p-4">
      <div class="space-y-2 text-sm">
        <div class="flex flex-col gap-1">
          <span class="text-gray-500">Owner:</span>
          <AddressToolTip
            v-if="userDataStore.address"
            :address="userDataStore.address"
            class="max-w-full font-mono text-xs break-all"
          />
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
      description="Your wallet will ask you to confirm an on-chain deployment. CNC then registers the deployed Safe with this team."
    />

    <UAlert
      v-if="!canDeploy"
      class="mt-4"
      color="warning"
      variant="soft"
      icon="i-lucide-lock-keyhole"
      :description="deployPermissionHint"
      data-test="safe-deployment-permission-notice"
    />

    <UAlert
      v-if="registrationRetryAddress"
      class="mt-4"
      color="warning"
      variant="soft"
      icon="i-lucide-triangle-alert"
      description="Your Safe was deployed, but it is not linked to the team yet. Retry registration before leaving this page."
      data-test="safe-registration-pending"
    />

    <template #footer>
      <div class="flex justify-end gap-2">
        <TeamArchivedTooltip v-slot="{ disabled: archivedDisabled }">
          <UButton
            v-if="registrationRetryAddress"
            color="primary"
            :loading="isRegistering"
            :disabled="isRegistering || archivedDisabled"
            data-test="retry-safe-registration-button"
            @click="retryRegistration"
          >
            Retry registration
          </UButton>
          <UButton
            v-else
            color="primary"
            :loading="isDeploying || isRegistering"
            :disabled="isDeploying || isRegistering || !canDeploy || archivedDisabled"
            :title="deployPermissionHint"
            data-test="deploy-safe-button"
            @click="handleDeploySafe"
          >
            {{ isDeploying ? 'Deploying Safe...' : 'Deploy Safe Wallet' }}
          </UButton>
        </TeamArchivedTooltip>
      </div>
    </template>
  </UCard>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { Icon as IconifyIcon } from '@iconify/vue'
import { isAddress, type Address } from 'viem'
import { useTeamStore, useUserDataStore } from '@/stores'

import { useDeploySafe } from '@/composables/safe/useSafeDeployment'
import { useCreateContractMutation } from '@/queries/contract.queries'
import { log } from '@/utils'
import { NETWORK } from '@/constant'
import { useToast } from '@nuxt/ui/composables'
import TeamArchivedTooltip from '@/components/ui/TeamArchivedTooltip.vue'
import AddressToolTip from '@/components/ui/AddressToolTip.vue'

interface Props {
  teamId: number
  teamOwnerAddress?: string
}

const props = defineProps<Props>()
const emits = defineEmits<{
  safeDeployed: [address: Address]
}>()
const toast = useToast()

// Stores
const teamStore = useTeamStore()
const userDataStore = useUserDataStore()

const { mutate: deploySafe, isPending: isDeploying } = useDeploySafe()
const { mutate: createContract, isPending: isRegistering } = useCreateContractMutation()
const registrationRetryAddress = ref<Address>()

const canDeploy = computed(
  () =>
    !!userDataStore.address &&
    isAddress(userDataStore.address) &&
    (props.teamOwnerAddress ?? teamStore.currentTeam?.ownerAddress)?.toLowerCase() ===
      userDataStore.address.toLowerCase()
)

const networkName = computed(() => NETWORK || 'Polygon')

const deployPermissionHint = computed(() => {
  if (!userDataStore.address) return 'Connect the team owner wallet to deploy a Safe.'
  if (!canDeploy.value) return 'Only the team owner can deploy and attach a Safe.'
  return 'Deploy a new Safe and register it with this team.'
})

const showDeploySuccess = (safeAddress: Address) => {
  toast.add({
    title: 'Success',
    description: 'Safe wallet deployed successfully',
    color: 'success'
  })

  log.info('Safe deployed:', safeAddress)
  emits('safeDeployed', safeAddress)
}

function registerSafe(safeAddress: Address) {
  createContract(
    {
      body: {
        teamId: String(props.teamId),
        contractAddress: safeAddress,
        contractType: 'Safe',
        deployer: userDataStore.address!
      }
    },
    {
      onSuccess: () => {
        registrationRetryAddress.value = undefined
        showDeploySuccess(safeAddress)
      },
      onError: (err) => {
        registrationRetryAddress.value = safeAddress
        const message = err instanceof Error ? err.message : 'Failed to register Safe contract'
        toast.add({
          title: 'Registration pending',
          description: `Safe deployed on-chain, but registration failed: ${message}`,
          color: 'warning'
        })
        log.error('Safe registration failed:', err)
      }
    }
  )
}

function retryRegistration() {
  if (registrationRetryAddress.value) {
    registerSafe(registrationRetryAddress.value)
  }
}

/**
 * Deploy Safe wallet for the team
 */
const handleDeploySafe = () => {
  if (!canDeploy.value) {
    toast.add({
      title: 'Safe deployment unavailable',
      description: deployPermissionHint.value,
      color: 'error'
    })
    return
  }

  deploySafe(
    {
      owners: [userDataStore.address!],
      threshold: 1
    },
    {
      onSuccess: ({ safeAddress }) => registerSafe(safeAddress),
      onError: (err) => {
        const message = err instanceof Error ? err.message : 'Failed to deploy Safe'
        toast.add({
          title: 'Error',
          description: message.includes('User rejected')
            ? 'Transaction approval rejected'
            : message,
          color: 'error'
        })
      }
    }
  )
}
</script>
