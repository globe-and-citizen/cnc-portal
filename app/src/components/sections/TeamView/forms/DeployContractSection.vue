<template>
  <div class="space-y-4">
    <!-- Deploy Button with dynamic message -->
    <ButtonUI
      variant="primary"
      :loading="createOfficerLoading || isSafeDeploying"
      :disabled="disable || createOfficerLoading || isSafeDeploying"
      data-test="deploy-contracts-button"
      @click="deployOfficerContract"
    >
      {{ deployButtonText }}
    </ButtonUI>
  </div>
</template>

<script lang="ts" setup>
import { useUserDataStore } from '@/stores/user'
import ButtonUI from '@/components/ButtonUI.vue'
import { useToastStore } from '@/stores/useToastStore'
import type { Team } from '@/types'
import { useWriteContract, useWaitForTransactionReceipt, useWatchContractEvent } from '@wagmi/vue'
import { encodeFunctionData, type Address, isAddress } from 'viem'
import { ref, watch, computed } from 'vue'
import { useSafeDeployment } from '@/composables/safe'
import { OFFICER_BEACON, validateAddresses } from '@/constant'
import { OFFICER_ABI } from '@/artifacts/abi/officer'
import { FACTORY_BEACON_ABI } from '@/artifacts/abi/factory-beacon'
import { useUpdateTeamMutation } from '@/queries/team.queries'
import { useSyncContractsMutation } from '@/queries/contract.queries'
import {
  log,
  validateBeaconAddresses,
  getBeaconConfigs,
  getDeploymentConfigs,
  handleBeaconProxyCreatedLogs
} from '@/utils'

const props = withDefaults(
  defineProps<{
    investorContractInput: { name: string; symbol: string }
    createdTeamData: Partial<Team>
    disable?: boolean
  }>(),
  {
    disable: false
  }
)
const emits = defineEmits(['contractDeployed'])
// Store
const userDataStore = useUserDataStore()
const { addSuccessToast, addErrorToast } = useToastStore()
const { deploySafe, isDeploying: isSafeDeploying } = useSafeDeployment()
const safeLoadingMessage = ref('')
const loading = ref(false)
const dynamicLoading = ref({
  status: false,
  message: ''
})

// Mutations for team and contract updates
const { mutateAsync: updateTeam, error: updateTeamError } = useUpdateTeamMutation()
const { mutateAsync: syncContracts, error: syncContractsError } = useSyncContractsMutation()

// Officer contract creation
const {
  isPending: officerContractCreating,
  data: createOfficerHash,
  error: createOfficerError,
  writeContract: createOfficer
} = useWriteContract()

const { isLoading: isConfirmingCreateOfficer, isSuccess: isConfirmedCreateOfficer } =
  useWaitForTransactionReceipt({
    hash: createOfficerHash
  })

const createOfficerLoading = computed(
  () => officerContractCreating.value || isConfirmingCreateOfficer.value || loading.value
)

const deployButtonText = computed(() => {
  if (isSafeDeploying.value) {
    return 'Deploying Safe Wallet...'
  }
  if (createOfficerLoading.value) {
    return 'Deploying Officer Contracts...'
  }
  return 'Deploy Team Contracts'
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

  safeLoadingMessage.value = 'Deploying Safe wallet...'

  try {
    const safeAddress = await deploySafe([currentUserAddress], 1)
    safeLoadingMessage.value = 'Updating team with Safe address...'

    await updateTeam({
      pathParams: { id: props.createdTeamData.id! },
      body: { safeAddress: (safeAddress ?? undefined) as `0x${string}` | undefined }
    })

    addSuccessToast(`Safe wallet deployed successfully`)
    safeLoadingMessage.value = ''
    emits('contractDeployed')
  } catch (error) {
    log.error('Error deploying Safe:', error)
    addErrorToast('Failed to deploy Safe wallet. Please try again.')
    safeLoadingMessage.value = ''
  }
}

const deployOfficerContract = async () => {
  loading.value = true
  try {
    // TODO: Check if the address in the store is the same as the address in the connected wallet
    const currentUserAddress = userDataStore.address as Address
    validateAddresses()

    if (!props.createdTeamData?.id) {
      loading.value = false
      return
    }

    // Validate all beacon addresses are defined
    try {
      validateBeaconAddresses()
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'One or more beacon addresses are not defined'
      addErrorToast(errorMessage)
      loading.value = false
      return
    }

    // Get beacon and deployment configurations
    const beaconConfigs = getBeaconConfigs()
    const deployments = getDeploymentConfigs(currentUserAddress, props.investorContractInput)

    const encodedFunction = encodeFunctionData({
      abi: OFFICER_ABI,
      functionName: 'initialize',
      args: [currentUserAddress, beaconConfigs, deployments, true]
    })

    if (!OFFICER_BEACON) {
      log.error('Officer Beacon address is not defined')
      addErrorToast('Officer Beacon address is not defined')
      loading.value = false
      return
    }
    createOfficer({
      address: OFFICER_BEACON,
      abi: FACTORY_BEACON_ABI,
      functionName: 'createBeaconProxy',
      args: [encodedFunction]
    })
  } catch (error) {
    // console.log('Error deploying contract V2', error)
    loading.value = false
    if (typeof error === 'object' && error !== null && 'message' in error) {
      console.log('Error deploying contract V2', error.message)
    } else {
      console.log('Error deploying contract V2')
    }
    // log.error('Error deploying contract')
    // log.error(String( || error))
    addErrorToast('Error deploying contract')
    console.error(error)
    loading.value = false
  } finally {
    dynamicLoading.value = {
      ...dynamicLoading.value,
      message: 'Officer Contract Ready for deployment'
    }
  }
}

watch(createOfficerError, (error) => {
  if (error) {
    log.error('Failed to create officer contract')
    log.error(String(error))
    addErrorToast('Failed to create officer contract')
    loading.value = false
  }
})

watch([isConfirmingCreateOfficer, isConfirmedCreateOfficer], ([isConfirming, isConfirmed]) => {
  if (!isConfirming && isConfirmed) {
    dynamicLoading.value = {
      ...dynamicLoading.value,
      message: 'Officer Contract deployed successfully'
    }
    addSuccessToast('Officer contract deployed successfully')
    // Continue with team creation
  }
})

useWatchContractEvent({
  address: OFFICER_BEACON as Address,
  abi: FACTORY_BEACON_ABI,
  eventName: 'BeaconProxyCreated',
  async onLogs(logs) {
    console.log('try get BeaconProxyCreated logs')
    const currentAddress = userDataStore.address as Address

    // Use utility function to handle logs
    const proxyAddress = handleBeaconProxyCreatedLogs(logs, createOfficerHash.value, currentAddress)

    if (!proxyAddress) {
      addErrorToast('Failed to process contract deployment event')
      loading.value = false
      return
    }

    if (!props.createdTeamData.id) {
      log.error('No team data found')
      addErrorToast('No team data found')
      loading.value = false
      return
    }

    const teamId = props.createdTeamData.id

    await updateTeam({
      pathParams: { id: teamId },
      body: { officerAddress: proxyAddress }
    })

    if (updateTeamError.value) {
      log.error('Error updating officer address')
      addErrorToast('Error updating officer address')
      loading.value = false
      return
    }

    await syncContracts({ body: { teamId } })

    if (syncContractsError.value) {
      log.error('Error updating contracts')
      addErrorToast('Error updating contracts')
      loading.value = false
      return
    }

    dynamicLoading.value = {
      message: 'Officer contracts synced successfully',
      status: false
    }
    loading.value = false

    await deploySafeForTeam()
  }
})
</script>
