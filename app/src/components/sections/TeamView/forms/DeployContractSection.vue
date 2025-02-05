<template>
  <ButtonUI
    variant="primary"
    class="w-44"
    :loading="createOfficerLoading"
    :disabled="createOfficerLoading"
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
// import type { TeamInput, User, Team } from '@/types'
import { useWriteContract, useWaitForTransactionReceipt, useWatchContractEvent } from '@wagmi/vue'
import { encodeFunctionData, type Address } from 'viem'
import { ref, watch, computed } from 'vue'

// Contract ABIs
import OfficerABI from '@/artifacts/abi/officer.json'
import BankABI from '@/artifacts/abi/bank.json'
import VotingABI from '@/artifacts/abi/voting.json'
import ExpenseAccountABI from '@/artifacts/abi/expense-account.json'
import ExpenseAccountEIP712ABI from '@/artifacts/abi/expense-account-eip712.json'
import CashRemunerationEIP712ABI from '@/artifacts/abi/CashRemunerationEIP712.json'
import FACTORY_BEACON_ABI from '@/artifacts/abi/factory-beacon.json'

import {
  BANK_BEACON_ADDRESS,
  BOD_BEACON_ADDRESS,
  CASH_REMUNERATION_EIP712_BEACON_ADDRESS,
  EXPENSE_ACCOUNT_BEACON_ADDRESS,
  EXPENSE_ACCOUNT_EIP712_BEACON_ADDRESS,
  INVESTOR_V1_BEACON_ADDRESS,
  OFFICER_BEACON,
  TIPS_ADDRESS,
  USDC_ADDRESS,
  USDT_ADDRESS,
  validateAddresses,
  VOTING_BEACON_ADDRESS
} from '@/constant'
import { INVESTOR_ABI } from '@/artifacts/abi/investorsV1'

// Props
const { investorContract } = defineProps<{
  investorContract: { name: string; symbol: string }
}>()

// Store
const userDataStore = useUserDataStore()
const { addSuccessToast, addErrorToast } = useToastStore()

const loading = ref(false)

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

const deployOfficerContract = async () => {
  loading.value = true
  try {
    // TODO: Check if the address in the store is the same as the address in the connected wallet
    const currentUserAddress = userDataStore.address as Address

    console.log('Validating addresses')
    validateAddresses()

    const beaconConfigs = [
      {
        beaconType: 'Bank',
        beaconAddress: BANK_BEACON_ADDRESS
      },
      {
        beaconType: 'Voting',
        beaconAddress: VOTING_BEACON_ADDRESS
      },
      {
        beaconType: 'BoardOfDirectors',
        beaconAddress: BOD_BEACON_ADDRESS
      },
      {
        beaconType: 'ExpenseAccount',
        beaconAddress: EXPENSE_ACCOUNT_BEACON_ADDRESS
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
        args: [investorContract.name, investorContract.symbol, currentUserAddress]
      })
    })

    // Voting contract
    deployments.push({
      contractType: 'Voting',
      initializerData: encodeFunctionData({
        abi: VotingABI,
        functionName: 'initialize',
        args: [currentUserAddress]
      })
    })

    // Expense account
    deployments.push({
      contractType: 'ExpenseAccount',
      initializerData: encodeFunctionData({
        abi: ExpenseAccountABI,
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
        args: [currentUserAddress]
      })
    })

    // Cash remuneration EIP712
    deployments.push({
      contractType: 'CashRemunerationEIP712',
      initializerData: encodeFunctionData({
        abi: CashRemunerationEIP712ABI,
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
    loading.value = false
    console.log(error)
    addErrorToast('Error deploying contract')
  } finally {
    loading.value = false
  }
}

watch(createOfficerError, (error) => {
  if (error) {
    addErrorToast('Failed to create officer contract')
    console.log(error)
  }
})

watch([isConfirmingCreateOfficer, isConfirmedCreateOfficer], ([isConfirming, isConfirmed]) => {
  if (!isConfirming && isConfirmed) {
    addSuccessToast('Officer contract deployed successfully')
    // Continue with team creation
  }
})

// useWatchContractEvent({
//   address: OFFICER_BEACON as Address,
//   abi: FACTORY_BEACON_ABI,
//   eventName: 'BeaconProxyCreated',
//   async onLogs(logs) {
//     interface ILogs {
//       args: {
//         deployer: string
//         proxy: string
//       }
//     }
//     const deployer = (logs[0] as unknown as ILogs).args.deployer
//     const proxyAddress = (logs[0] as unknown as ILogs).args.proxy
//     const currentAddress = userDataStore.address as Address
//     if (!proxyAddress || proxyAddress == team.value.officerAddress || deployer !== currentAddress) {
//       loading.value = false
//     } else {
//       try {
//         team.value.officerAddress = proxyAddress as Address
//         console.log('team.value', team.value)
//         // Update the team with officer address if we have the team ID
//         if (createTeamData.value?.id) {
//           await updateTeam(Number(createTeamData.value.id))
//         } else {
//           throw new Error('Team ID not found')
//         }
//         loading.value = false
//         loadingCreateTeam.value = false
//         // Close modal and reset after successful contract deployment
//         showAddTeamModal.value = false
//         team.value = {
//           name: '',
//           description: '',
//           members: [],
//           officerAddress: '' as Address
//         }
//         addSuccessToast('Contracts deployed successfully')
//         executeFetchTeams()
//       } catch (error) {
//         console.log('Error updating officer address:', error)
//         addErrorToast('Error updating officer address')
//         loading.value = false
//         loadingCreateTeam.value = false
//       }
//     }
//   }
// })
</script>
