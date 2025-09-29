<template>
  <ButtonUI
    variant="primary"
    :loading="createOfficerLoading"
    :disabled="disable || createOfficerLoading"
    data-test="deploy-contracts-button"
    @click="deployOfficerContract()"
  >
    Deploy Contracts
  </ButtonUI>
</template>

<script lang="ts" setup>
import { useUserDataStore } from '@/stores/user'
import ButtonUI from '@/components/ButtonUI.vue'
import { useToastStore } from '@/stores/useToastStore'
import type { Team } from '@/types'
import { useWriteContract, useWaitForTransactionReceipt, useWatchContractEvent } from '@wagmi/vue'
import { encodeFunctionData, type Address } from 'viem'
import { ref, watch, computed } from 'vue'

// Contract ABIs
import OfficerABI from '@/artifacts/abi/officer.json'
import BankABI from '@/artifacts/abi/bank.json'
// import VotingABI from '@/artifacts/abi/voting.json'

import ExpenseAccountEIP712ABI from '@/artifacts/abi/expense-account-eip712.json'
import CashRemunerationEIP712ABI from '@/artifacts/abi/CashRemunerationEIP712.json'
import FACTORY_BEACON_ABI from '@/artifacts/abi/factory-beacon.json'
import ElectionsABI from '@/artifacts/abi/elections.json'
import { DIVIDEND_SPLITTER_ABI } from '@/artifacts/abi/dividend-splitter'

import {
  BANK_BEACON_ADDRESS,
  BOD_BEACON_ADDRESS,
  CASH_REMUNERATION_EIP712_BEACON_ADDRESS,
  EXPENSE_ACCOUNT_EIP712_BEACON_ADDRESS,
  INVESTOR_V1_BEACON_ADDRESS,
  OFFICER_BEACON,
  PROPOSALS_BEACON_ADDRESS,
  TIPS_ADDRESS,
  USDC_ADDRESS,
  USDT_ADDRESS,
  validateAddresses,
  // VOTING_BEACON_ADDRESS,
  ELECTIONS_BEACON_ADDRESS,
  DIVIDEND_SPLITTER_BEACON_ADDRESS
} from '@/constant'
import { INVESTOR_ABI } from '@/artifacts/abi/investorsV1'
import { useCustomFetch } from '@/composables/useCustomFetch'
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
const splitterCreated = ref(false)
// Store
const userDataStore = useUserDataStore()
const { addSuccessToast, addErrorToast } = useToastStore()

const loading = ref(false)
const dynamicLoading = ref({
  status: false,
  message: ''
})

// Officer contract creation
// Create officer contract hooks
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

// Combined loading state
const createOfficerLoading = computed(
  () => officerContractCreating.value || isConfirmingCreateOfficer.value || loading.value
)

const deployOfficerContract = async () => {
  loading.value = true
  try {
    // TODO: Check if the address in the store is the same as the address in the connected wallet
    const currentUserAddress = userDataStore.address as Address

    console.log('Validating addresses')
    validateAddresses()
    if (!props.createdTeamData?.id) {
      loading.value = false
      return
    }

    const beaconConfigs = [
      {
        beaconType: 'Bank',
        beaconAddress: BANK_BEACON_ADDRESS
      },
      // {
      //   beaconType: 'Voting',
      //   beaconAddress: VOTING_BEACON_ADDRESS
      // },
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
        beaconType: 'InvestorsV1',
        beaconAddress: INVESTOR_V1_BEACON_ADDRESS
      },
      {
        beaconType: 'DividendSplitter',
        beaconAddress: DIVIDEND_SPLITTER_BEACON_ADDRESS
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
        abi: BankABI,
        functionName: 'initialize',
        args: [TIPS_ADDRESS, USDT_ADDRESS, USDC_ADDRESS, currentUserAddress]
      })
    })
    deployments.push({
      contractType: 'InvestorsV1',
      initializerData: encodeFunctionData({
        abi: INVESTOR_ABI,
        functionName: 'initialize',
        args: [
          props.investorContractInput.name,
          props.investorContractInput.symbol,
          currentUserAddress
        ]
      })
    })
    deployments.push({
      contractType: 'DividendSplitter',
      initializerData: encodeFunctionData({
        abi: DIVIDEND_SPLITTER_ABI,
        functionName: 'initialize',
        args: [currentUserAddress]
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
        abi: ExpenseAccountEIP712ABI,
        functionName: 'initialize',
        args: [currentUserAddress, USDT_ADDRESS, USDC_ADDRESS]
      })
    })

    // Cash remuneration EIP712
    deployments.push({
      contractType: 'CashRemunerationEIP712',
      initializerData: encodeFunctionData({
        abi: CashRemunerationEIP712ABI,
        functionName: 'initialize',
        args: [currentUserAddress, [USDC_ADDRESS]]
      })
    })

    // Elections contract
    deployments.push({
      contractType: 'Elections',
      initializerData: encodeFunctionData({
        abi: ElectionsABI,
        functionName: 'initialize',
        args: [currentUserAddress]
      })
    })

    const encodedFunction = encodeFunctionData({
      abi: OfficerABI,
      functionName: 'initialize',
      args: [currentUserAddress, beaconConfigs, deployments, true]
    })

    createOfficer({
      address: OFFICER_BEACON as Address,
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
    loading.value = false
  } finally {
    dynamicLoading.value = {
      ...dynamicLoading.value,
      message: 'Officer Contract Ready for deployement'
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
    if (!logs.length) {
      log.error('No logs found')
      loading.value = false
      return
    }
    if (logs[0].transactionHash !== createOfficerHash.value) {
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

    const { error: updateTeamError } = await useCustomFetch<string>(
      `teams/${props.createdTeamData.id}`
    )
      .put({
        officerAddress: proxyAddress
      })
      .json()
    if (updateTeamError.value) {
      log.error('Error updating officer address')
      addErrorToast('Error updating officer address')
      loading.value = false
      return
    }
    const { error: updateContractsError } = await useCustomFetch('contract/sync')
      .put({ teamId: props.createdTeamData.id })
      .json()

    if (updateContractsError.value) {
      log.error('Error updating contracts')
      addErrorToast('Error updating contracts')
      loading.value = false
      return
    }
    dynamicLoading.value = {
      message: 'Loaded',
      status: false
    }
    loading.value = false
    emits('contractDeployed')
  }
})
</script>
