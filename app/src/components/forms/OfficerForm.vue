<template>
  <div class="flex flex-col">
    <h3 class="text-xl font-bold">Manage deployments</h3>
    <hr />

    <div class="flex items-center justify-center mt-4">
      <button
        class="btn btn-primary btn-sm"
        data-test="deploy-officer-button"
        v-if="!team?.officerAddress && !createOfficerLoading"
        @click="deployOfficerContract"
      >
        Create Officer Contract
      </button>
      <LoadingButton :color="'primary min-w-24'" v-if="createOfficerLoading" />

      <div v-if="team?.officerAddress && !createOfficerLoading">
        <div class="flex flex-col justify-center">
          <div>
            Officer contract deployed at:
            <span class="badge badge-primary badge-sm">
              {{ team?.officerAddress }}
            </span>
          </div>
          <div v-if="showCreateTeam && !isLoadingGetTeam && !isLoadingFetchDeployedContracts">
            <CreateOfficerTeam :team="team" @getTeam="emits('getTeam')" />
          </div>
          <div v-if="!showCreateTeam && !isLoadingGetTeam && !isLoadingFetchDeployedContracts">
            <div class="flex flex-col">
              <h5 class="text-md font-bold">Deployed Contracts</h5>
              <div v-if="deployedContracts && (deployedContracts as Array<IContract>)?.length != 0">
                <div
                  v-for="contract in deployedContracts"
                  :key="(contract as IContract).contractAddress"
                >
                  <span class="badge badge-primary badge-sm">
                    {{ (contract as IContract).contractType }}:
                    {{ (contract as IContract).contractAddress }}
                  </span>
                </div>
              </div>
            </div>

            <DeploymentActions
              :team="team"
              :founders="founders"
              :is-bank-deployed="isBankDeployed"
              :is-voting-deployed="isVotingDeployed"
              :isBoDDeployed="isBoDDeployed"
              :is-expense-deployed="isExpenseDeployed"
              :is-expense-eip712-deployed="isExpenseEip712Deployed"
              @get-team="emits('getTeam')"
            />
          </div>
          <div v-if="isLoadingGetTeam || isLoadingFetchDeployedContracts">
            <span class="loading loading-spinner loading-lg"></span>
          </div>
          <div v-if="!showCreateTeam && !isLoadingGetTeam && !isLoadingFetchDeployedContracts">
            <div class="flex flex-col">
              <h5 class="text-md font-bold">Founders</h5>
              <div v-for="(founderAddress, index) in founders" data-test="founder-div" :key="index">
                <span
                  v-if="team && team.members"
                  data-test="founder"
                  class="badge badge-primary badge-sm"
                >
                  {{
                    team.members.find((member: Member) => member.address == founderAddress)?.name ||
                    'Unknown Member'
                  }}
                  | {{ founderAddress }}
                </span>
              </div>
            </div>
            <div class="flex flex-col">
              <h5 class="text-md font-bold">Members</h5>
              <div v-for="(memberAddress, index) in members" data-test="member-div" :key="index">
                <span
                  v-if="team && team.members"
                  data-test="member"
                  class="badge badge-secondary badge-sm"
                >
                  {{
                    team.members.find((member: Member) => member.address == memberAddress)?.name ||
                    'Unknown Member'
                  }}
                  | {{ memberAddress }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, computed } from 'vue'
import { useToastStore } from '@/stores'
import { useUserDataStore } from '@/stores/user'
import LoadingButton from '@/components/LoadingButton.vue'
import CreateOfficerTeam from '@/components/forms/CreateOfficerTeam.vue'
import DeploymentActions from './DeploymentActions.vue'
import { useCustomFetch } from '@/composables/useCustomFetch'
import {
  useReadContract,
  useWaitForTransactionReceipt,
  useWriteContract,
  useWatchContractEvent
} from '@wagmi/vue'
import { encodeFunctionData, type Address } from 'viem'

import { log, parseError } from '@/utils'

// Contract-related imports
import OfficerABI from '@/artifacts/abi/officer.json'
import FACTORY_BEACON_ABI from '@/artifacts/abi/factory-beacon.json'
import {
  OFFICER_BEACON,
  BANK_BEACON_ADDRESS,
  VOTING_BEACON_ADDRESS,
  BOD_BEACON_ADDRESS,
  EXPENSE_ACCOUNT_BEACON_ADDRESS,
  EXPENSE_ACCOUNT_EIP712_BEACON_ADDRESS
} from '@/constant'
import type { Member } from '@/types'

const props = defineProps(['team'])
const emits = defineEmits(['getTeam'])
const { addErrorToast, addSuccessToast } = useToastStore()

// UI state
const showCreateTeam = ref(false)
const isBankDeployed = ref(false)
const isVotingDeployed = ref(false)
const isBoDDeployed = ref(false)
const isExpenseDeployed = ref(false)
const isExpenseEip712Deployed = ref(false)
const founders = ref<string[]>([])
const members = ref<string[]>([])

// Officer contract creation
const {
  isPending: officerContractCreating,
  data: createOfficerHash,
  error: createOfficerError,
  writeContract: createOfficer
} = useWriteContract()

const { isLoading: isConfirmingCreateOfficer } = useWaitForTransactionReceipt({
  hash: createOfficerHash
})

const loading = ref(false)
const createOfficerLoading = computed(
  () => officerContractCreating.value || isConfirmingCreateOfficer.value || loading.value
)

// Officer team data fetching
const {
  refetch: fetchOfficerTeam,
  isLoading: isLoadingGetTeam,
  data: officerTeam
} = useReadContract({
  address: props.team.officerAddress,
  functionName: 'getTeam',
  abi: OfficerABI,
  args: []
})

// Deployed contracts fetching
const {
  refetch: fetchDeployedContracts,
  data: deployedContracts,
  isLoading: isLoadingFetchDeployedContracts
} = useReadContract({
  address: props.team.officerAddress,
  functionName: 'getDeployedContracts',
  abi: OfficerABI,
  args: []
})

// Contract interface
interface IContract {
  contractType: string
  contractAddress: string
}

// Watch handlers
watch(createOfficerError, (value) => {
  if (value) {
    loading.value = false
    addErrorToast('Failed to deploy officer contract')
  }
})

watch(deployedContracts, async (value) => {
  if (!value) return

  const contracts = (value as Array<IContract>).map((contract) => ({
    contractType: contract.contractType,
    contractAddress: contract.contractAddress
  }))

  for (const contract of contracts) {
    let shouldUpdate = false
    let updateData = {}
    switch (contract.contractType) {
      case 'Bank':
        if (props.team.bankAddress) {
          isBankDeployed.value = true
        }
        if (props.team.bankAddress != contract.contractAddress) {
          shouldUpdate = true
          isBankDeployed.value = true
          updateData = { bankAddress: contract.contractAddress }
        }
        break
      case 'Voting':
        if (props.team.votingAddress) {
          isVotingDeployed.value = true
        }
        if (props.team.votingAddress !== contract.contractAddress) {
          shouldUpdate = true
          isVotingDeployed.value = true
          updateData = { votingAddress: contract.contractAddress }
        }
        break
      case 'BoardOfDirectors':
        if (props.team.boardOfDirectorsAddress) {
          isBoDDeployed.value = true
        }
        if (props.team.boardOfDirectorsAddress !== contract.contractAddress) {
          shouldUpdate = true
          isBoDDeployed.value = true
          updateData = { boardOfDirectorsAddress: contract.contractAddress }
        }
        break
      case 'ExpenseAccount':
        if (props.team.expenseAccountAddress) {
          isExpenseDeployed.value = true
        }
        if (props.team.expenseAccountAddress !== contract.contractAddress) {
          shouldUpdate = true
          isExpenseDeployed.value = true
          updateData = { expenseAccountAddress: contract.contractAddress }
        }
        break
      case 'ExpenseAccountEIP712':
        if (props.team.expenseAccountEip712Address) {
          isExpenseEip712Deployed.value = true
        }
        if (props.team.expenseAccountEip712Address !== contract.contractAddress) {
          shouldUpdate = true
          isExpenseEip712Deployed.value = true
          updateData = { expenseAccountEip712Address: contract.contractAddress }
        }
        break
    }

    if (shouldUpdate) {
      try {
        await useCustomFetch<string>(`teams/${props.team.id}`).put(updateData).json()
        emits('getTeam')
      } catch (error) {
        console.error(`Failed to update ${contract.contractType} address:`, error)
      }
    }
  }
})

watch(officerTeam, async (value) => {
  const temp: Array<Object> = value as Array<Object>
  const team = {
    founders: temp[0] as string[],
    members: temp[1] as string[]
  }
  if (team) {
    if (team.founders.length === 0) {
      showCreateTeam.value = true
    } else {
      showCreateTeam.value = false
      founders.value = team.founders
      members.value = team.members
    }
  }
})

// Contract event watching
useWatchContractEvent({
  address: OFFICER_BEACON as Address,
  abi: FACTORY_BEACON_ABI,
  eventName: 'BeaconProxyCreated',
  async onLogs(logs) {
    interface ILogs {
      args: {
        deployer: string
        proxy: string
      }
    }
    const deployer = (logs[0] as unknown as ILogs).args.deployer
    const proxyAddress = (logs[0] as unknown as ILogs).args.proxy
    const currentAddress = useUserDataStore().address as Address
    if (!proxyAddress || proxyAddress == props.team.officerAddress || deployer !== currentAddress)
      loading.value = false
    else {
      try {
        await useCustomFetch<string>(`teams/${props.team.id}`)
          .put({ officerAddress: proxyAddress })
          .json()
        addSuccessToast('Officer contract deployed successfully')
        emits('getTeam')
        loading.value = false
      } catch (error) {
        addErrorToast('Error updating officer address')
        loading.value = false
      }
    }
  }
})

// Deploy Officer Contract
const deployOfficerContract = async () => {
  try {
    const currentAddress = useUserDataStore().address as Address
    loading.value = true

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
      }
    ]

    const encodedFunction = encodeFunctionData({
      abi: OfficerABI,
      functionName: 'initialize',
      args: [currentAddress, beaconConfigs]
    })

    createOfficer({
      address: OFFICER_BEACON as Address,
      abi: FACTORY_BEACON_ABI,
      functionName: 'createBeaconProxy',
      args: [encodedFunction]
    })
  } catch (error) {
    loading.value = false
    log.error(parseError(error))
    addErrorToast('Error deploying contract')
  }
}

// Component lifecycle
onMounted(() => {
  if (props.team.officerAddress) {
    fetchOfficerTeam()
    fetchDeployedContracts()
  }

  if (officerTeam.value) {
    const temp: Array<Object> = officerTeam.value as unknown as Array<Object>
    const team = {
      founders: temp[0] as string[],
      members: temp[1] as string[]
    }
    if (team) {
      if (team.founders?.length === 0) {
        showCreateTeam.value = true
      } else {
        showCreateTeam.value = false
        founders.value = team.founders
        members.value = team.members
      }
    }
  }

  if (deployedContracts.value) {
    const contracts = deployedContracts.value as Array<IContract>
    const bankContract = contracts.find((contract) => contract.contractType === 'Bank')
    if (bankContract) {
      isBankDeployed.value = true
    }
    const votingContract = contracts.find((contract) => contract.contractType === 'Voting')
    if (votingContract) {
      isVotingDeployed.value = true
    }
    const bodContract = contracts.find((contract) => contract.contractType === 'BoardOfDirectors')
    if (bodContract) {
      isBoDDeployed.value = true
    }
    const expenseContract = contracts.find((contract) => contract.contractType === 'ExpenseAccount')
    if (expenseContract) {
      isExpenseDeployed.value = true
    }
    const expenseEip712Contract = contracts.find(
      (contract) => contract.contractType === 'ExpenseAccountEIP712'
    )
    if (expenseEip712Contract) {
      isExpenseEip712Deployed.value = true
    }
  }
})
</script>
