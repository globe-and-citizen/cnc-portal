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
import { encodeFunctionData, zeroAddress, type Address, isAddress } from 'viem'
import { ref, watch, computed } from 'vue'
import { useSafeDeployment } from '@/composables/safe'
import {
  BANK_BEACON_ADDRESS,
  BOD_BEACON_ADDRESS,
  CASH_REMUNERATION_EIP712_BEACON_ADDRESS,
  EXPENSE_ACCOUNT_EIP712_BEACON_ADDRESS,
  INVESTOR_V1_BEACON_ADDRESS,
  OFFICER_BEACON,
  PROPOSALS_BEACON_ADDRESS,
  USDC_ADDRESS,
  USDT_ADDRESS,
  validateAddresses,
  // VOTING_BEACON_ADDRESS,
  ELECTIONS_BEACON_ADDRESS,
  USDC_E_ADDRESS
  // OFFICER_ADDRESS
} from '@/constant'
import { OFFICER_ABI } from '@/artifacts/abi/officer'
import { BANK_ABI } from '@/artifacts/abi/bank'
import { EXPENSE_ACCOUNT_EIP712_ABI } from '@/artifacts/abi/expense-account-eip712'
import { CASH_REMUNERATION_EIP712_ABI } from '@/artifacts/abi/cash-remuneration-eip712'
import { FACTORY_BEACON_ABI } from '@/artifacts/abi/factory-beacon'
import { ELECTIONS_ABI } from '@/artifacts/abi/elections'
import { INVESTOR_ABI } from '@/artifacts/abi/investorsV1'
import { useUpdateTeamMutation } from '@/queries/team.queries'
import { useSyncContractsMutation } from '@/queries/contract.queries'
import { log } from '@/utils'
import { PROPOSALS_ABI } from '@/artifacts/abi/proposals'

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
const { mutateAsync: updateTeam } = useUpdateTeamMutation()
const { mutateAsync: syncContracts } = useSyncContractsMutation()

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
      id: props.createdTeamData.id!,
      teamData: { safeAddress: (safeAddress ?? undefined) as `0x${string}` | undefined }
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

    if (
      !BANK_BEACON_ADDRESS ||
      !BOD_BEACON_ADDRESS ||
      !PROPOSALS_BEACON_ADDRESS ||
      !EXPENSE_ACCOUNT_EIP712_BEACON_ADDRESS ||
      !CASH_REMUNERATION_EIP712_BEACON_ADDRESS ||
      !INVESTOR_V1_BEACON_ADDRESS ||
      !ELECTIONS_BEACON_ADDRESS
    ) {
      addErrorToast('One or more beacon addresses are not defined. Cannot deploy contracts.')
      loading.value = false
      return
    }

    const beaconConfigs: Array<{ beaconType: string; beaconAddress: Address }> = [
      {
        beaconType: 'Bank',
        beaconAddress: BANK_BEACON_ADDRESS
      },
      {
        beaconType: 'BoardOfDirectors',
        beaconAddress: BOD_BEACON_ADDRESS
      },
      {
        beaconType: 'Proposals',
        beaconAddress: PROPOSALS_BEACON_ADDRESS
      },
      {
        beaconType: 'ExpenseAccountEIP712',
        beaconAddress: EXPENSE_ACCOUNT_EIP712_BEACON_ADDRESS
      },
      {
        beaconType: 'CashRemunerationEIP712',
        beaconAddress: CASH_REMUNERATION_EIP712_BEACON_ADDRESS
      },
      {
        beaconType: 'InvestorV1',
        beaconAddress: INVESTOR_V1_BEACON_ADDRESS
      },
      {
        beaconType: 'Elections',
        beaconAddress: ELECTIONS_BEACON_ADDRESS
      }
    ]
    const deployments = []

    // Bank contract
    deployments.push({
      contractType: 'Bank',
      initializerData: encodeFunctionData({
        abi: BANK_ABI,
        functionName: 'initialize',
        args: [[USDT_ADDRESS, USDC_ADDRESS, USDC_E_ADDRESS], currentUserAddress]
      })
    })
    deployments.push({
      contractType: 'InvestorV1',
      initializerData: encodeFunctionData({
        abi: INVESTOR_ABI,
        functionName: 'initialize',
        args: [
          props.investorContractInput.name,
          props.investorContractInput.symbol,
          zeroAddress // currentUserAddress
        ]
      })
    })

    // Voting contract
    // deployments.push({
    //   contractType: 'Voting',
    //   initializerData: encodeFunctionData({
    //     abi: VotingABI,
    //     functionName: 'initialize',
    //     args: [currentUserAddress]
    //   })
    // })

    // Proposal contract
    deployments.push({
      contractType: 'Proposals',
      initializerData: encodeFunctionData({
        abi: PROPOSALS_ABI,
        functionName: 'initialize',
        args: [currentUserAddress]
      })
    })

    // Expense account EIP712
    deployments.push({
      contractType: 'ExpenseAccountEIP712',
      initializerData: encodeFunctionData({
        abi: EXPENSE_ACCOUNT_EIP712_ABI,
        functionName: 'initialize',
        args: [currentUserAddress, USDT_ADDRESS, USDC_ADDRESS]
      })
    })

    // Cash remuneration EIP712
    deployments.push({
      contractType: 'CashRemunerationEIP712',
      initializerData: encodeFunctionData({
        abi: CASH_REMUNERATION_EIP712_ABI,
        functionName: 'initialize',
        args: [/*currentUserAddress*/ zeroAddress, [USDC_ADDRESS, USDC_E_ADDRESS]]
      })
    })

    // Elections contract
    deployments.push({
      contractType: 'Elections',
      initializerData: encodeFunctionData({
        abi: ELECTIONS_ABI,
        functionName: 'initialize',
        args: [currentUserAddress]
      })
    })

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
    if (!logs.length) {
      log.error('No logs found')
      loading.value = false
      return
    }
    if (!logs[0] || logs[0].transactionHash !== createOfficerHash.value) {
      log.error('Transaction hash does not match')
      loading.value = false
      return
    }

    interface ILogs {
      args: {
        deployer: Address
        proxy: Address
      }
    }
    const deployer = (logs[0] as unknown as ILogs).args.deployer
    const proxyAddress = (logs[0] as unknown as ILogs).args.proxy
    const currentAddress = userDataStore.address as Address

    if (currentAddress !== deployer) {
      log.error('Deployer address does not match, with the current user address')
      addErrorToast('Deployer address does not match, with the current user address')
      loading.value = false
      return
    }
    if (!props.createdTeamData.id) {
      log.error('No team data found')
      addErrorToast('No team data found')
      loading.value = false
      return
    }

    try {
      await updateTeam({
        id: props.createdTeamData.id,
        teamData: { officerAddress: proxyAddress }
      })
    } catch {
      log.error('Error updating officer address')
      addErrorToast('Error updating officer address')
      loading.value = false
      return
    }

    try {
      await syncContracts({ teamId: props.createdTeamData.id })
    } catch {
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
