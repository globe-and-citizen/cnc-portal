<template>
  <div class="min-h-screen flex flex-col items-center">
    <div>
      <h2 class="pt-10">Teams</h2>
    </div>
    <div
      v-if="teamsAreFetching"
      class="loading loading-spinner loading-lg"
      data-test="loading-state"
    ></div>

    <div class="pt-10" v-if="!teamsAreFetching && teams">
      <div
        class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-20"
        v-if="(teams?.length ?? 0) != 0"
      >
        <TeamCard
          v-for="team in teams"
          :key="team.id"
          :team="team"
          :data-test="`team-card-${team.id}`"
          class="cursor-pointer transition duration-300 hover:scale-105"
          @click="navigateToTeam(team.id)"
        />
        <div class="flex justify-center">
          <AddTeamCard
            data-test="add-team-card"
            @openAddTeamModal="showAddTeamModal = !showAddTeamModal"
            class="w-80 text-xl hover:scale-105 transform transition"
          />
        </div>
      </div>
      <div
        class="flex flex-col items-center animate-fade-in"
        v-if="teams.length == 0"
        data-test="empty-state"
      >
        <img src="../assets/login-illustration.png" alt="Login illustration" width="300" />

        <span class="font-bold text-sm text-gray-500 my-4"
          >You are currently not a part of any team, {{ useUserDataStore().name }}. Create a new
          team now!</span
        >

        <div class="flex justify-center" data-test="testing">
          <AddTeamCard
            data-test="add-team-card"
            @openAddTeamModal="showAddTeamModal = !showAddTeamModal"
            class="w-72 h-16 text-sm transform transition duration-300 hover:scale-105 animate-fade-in"
          />
        </div>
      </div>
    </div>
    <div class="flex flex-col items-center pt-10" data-test="error-state" v-if="teamError">
      <img src="../assets/login-illustration.png" alt="Login illustration" width="300" />

      <div class="alert alert-warning">
        We are unable to retrieve your teams. Please try again in some time.
      </div>
    </div>
    <ModalComponent v-model="showAddTeamModal">
      <AddTeamForm
        :isLoading="
          createTeamFetching ||
          isLoadingDeployOfficer ||
          isConfirmingDeployOfficer ||
          isLoadingDeployAll ||
          createOfficerLoading ||
          isConfirmingCreateOfficer ||
          isConfirmingDeployAll
        "
        :users="foundUsers"
        @searchUsers="(input) => searchUsers(input)"
        @addTeam="handleAddTeam"
      />
    </ModalComponent>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useWriteContract, useWaitForTransactionReceipt, useWatchContractEvent } from '@wagmi/vue'
import { encodeFunctionData, type Address } from 'viem'

import AddTeamCard from '@/components/sections/TeamView/AddTeamCard.vue'
import TeamCard from '@/components/sections/TeamView/TeamCard.vue'
import { type TeamInput, type User } from '@/types'
import { useToastStore } from '@/stores/useToastStore'
import { useCustomFetch } from '@/composables/useCustomFetch'
import type { TeamsResponse } from '@/types'
import AddTeamForm from '@/components/sections/TeamView/forms/AddTeamForm.vue'
import ModalComponent from '@/components/ModalComponent.vue'
import { useUserDataStore } from '@/stores/user'

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
  OFFICER_ADDRESS,
  OFFICER_BEACON,
  TIPS_ADDRESS,
  USDC_ADDRESS,
  USDT_ADDRESS,
  validateAddresses,
  VOTING_BEACON_ADDRESS
} from '@/constant'
import { INVESTOR_ABI } from '@/artifacts/abi/investorsV1'

const router = useRouter()
const { addSuccessToast, addErrorToast } = useToastStore()

const {
  isFetching: teamsAreFetching,
  error: teamError,
  data: teams,
  execute: executeFetchTeams
} = useCustomFetch<TeamsResponse>('teams').json()

watch(teamError, () => {
  if (teamError.value) {
    addErrorToast(teamError.value)
  }
})
const foundUsers = ref<User[]>([])
const showAddTeamModal = ref(false)

interface TeamInputWithOfficer extends TeamInput {
  officerAddress: Address
}

const team = ref<TeamInputWithOfficer>({
  name: '',
  description: '',
  members: [{ name: '', address: '' }],
  officerAddress: '' as Address
})
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

const loading = ref(false)
const createOfficerLoading = computed(
  () => officerContractCreating.value || isConfirmingCreateOfficer.value || loading.value
)
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

// Contract deployment states
const {
  writeContract: deployOfficer,
  isPending: isLoadingDeployOfficer,
  data: deployOfficerHash,
  error: deployOfficerError
} = useWriteContract()

const { isLoading: isConfirmingDeployOfficer, isSuccess: isConfirmedDeployOfficer } =
  useWaitForTransactionReceipt({ hash: deployOfficerHash })

const {
  writeContract: deployAll,
  isPending: isLoadingDeployAll,
  data: deployAllHash,
  error: deployAllError
} = useWriteContract()

const { isLoading: isConfirmingDeployAll, isSuccess: isConfirmedDeployAll } =
  useWaitForTransactionReceipt({ hash: deployAllHash })

// Team creation API call
const {
  isFetching: createTeamFetching,
  error: createTeamError,
  execute: executeCreateTeam,
  response: createTeamResponse
} = useCustomFetch('teams', {
  immediate: false
})
  .post(team)
  .json()

watch(createTeamError, () => {
  if (createTeamError.value) {
    addErrorToast(createTeamError.value)
  }
})

watch(
  [() => createTeamFetching.value, () => createTeamError.value, () => createTeamResponse.value],
  () => {
    if (!createTeamFetching.value && !createTeamError.value && createTeamResponse.value?.ok) {
      addSuccessToast('Team created successfully')
      team.value = {
        name: '',
        description: '',
        members: [],
        officerAddress: '' as Address
      }
      showAddTeamModal.value = false
      executeFetchTeams()
    }
  }
)

const searchUserName = ref('')
const searchUserAddress = ref('')
const lastUpdatedInput = ref<'name' | 'address'>('name')
const {
  execute: executeSearchUser,
  response: searchUserResponse,
  data: users
} = useCustomFetch('user/search', {
  immediate: false,
  beforeFetch: async ({ options, url, cancel }) => {
    const params = new URLSearchParams()
    if (lastUpdatedInput.value === 'name' && searchUserName.value) {
      params.append('name', searchUserName.value)
    } else if (lastUpdatedInput.value === 'address' && searchUserAddress.value) {
      params.append('address', searchUserAddress.value)
    }
    url += '?' + params.toString()
    return { options, url, cancel }
  }
})
  .get()
  .json()

watch(searchUserResponse, () => {
  if (searchUserResponse.value?.ok && users.value?.users) {
    foundUsers.value = users.value.users
  }
})
const searchUsers = async (input: { name: string; address: string }) => {
  try {
    if (input.name !== searchUserName.value) {
      searchUserName.value = input.name
      lastUpdatedInput.value = 'name'
    }
    if (input.address !== searchUserAddress.value) {
      searchUserAddress.value = input.address
      lastUpdatedInput.value = 'address'
    }
    await executeSearchUser()
  } catch (error: unknown) {
    if (error instanceof Error) {
      addErrorToast(error.message)
    } else {
      addErrorToast('An unknown error occurred')
    }
  }
}

// Watch for errors
watch(teamError, () => {
  if (teamError.value) {
    addErrorToast(teamError.value)
  }
})

watch(createTeamError, () => {
  if (createTeamError.value) {
    addErrorToast(createTeamError.value)
  }
})

watch(deployOfficerError, () => {
  if (deployOfficerError.value) {
    addErrorToast('Failed to deploy officer contract')
  }
})

watch(deployAllError, () => {
  if (deployAllError.value) {
    console.log(deployAllError.value)
    addErrorToast('Failed to deploy contracts')
  }
})

// Watch for successful operations
watch([isConfirmingDeployOfficer, isConfirmedDeployOfficer], ([isConfirming, isConfirmed]) => {
  if (!isConfirming && isConfirmed) {
    addSuccessToast('Officer contract deployed successfully')
    // Continue with team creation
  }
})

watch([isConfirmingDeployAll, isConfirmedDeployAll], ([isConfirming, isConfirmed]) => {
  if (!isConfirming && isConfirmed) {
    addSuccessToast('All contracts deployed successfully')
    executeFetchTeams()
  }
})

// Helper functions

const handleAddTeam = async (data: {
  team: TeamInput
  investorContract: { name: string; symbol: string }
}) => {
  team.value = {
    ...data.team,
    officerAddress: '' as Address // Will be set after deployment
  }
  try {
    deployOfficerContract(data.investorContract)
  } catch (error) {
    addErrorToast('Error creating team')
  }
}
const deployOfficerContract = async (investorContract: { name: string; symbol: string }) => {
  try {
    const currentAddress = useUserDataStore().address as Address
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
        args: [TIPS_ADDRESS, USDT_ADDRESS, USDC_ADDRESS, currentAddress]
      })
    })
    deployments.push({
      contractType: 'InvestorsV1',
      initializerData: encodeFunctionData({
        abi: INVESTOR_ABI,
        functionName: 'initialize',
        args: [investorContract.name, investorContract.symbol, currentAddress]
      })
    })

    // Voting contract
    deployments.push({
      contractType: 'Voting',
      initializerData: encodeFunctionData({
        abi: VotingABI,
        functionName: 'initialize',
        args: [currentAddress]
      })
    })

    // Expense account
    deployments.push({
      contractType: 'ExpenseAccount',
      initializerData: encodeFunctionData({
        abi: ExpenseAccountABI,
        functionName: 'initialize',
        args: [currentAddress]
      })
    })

    // Expense account EIP712
    deployments.push({
      contractType: 'ExpenseAccountEIP712',
      initializerData: encodeFunctionData({
        abi: ExpenseAccountEIP712ABI,
        functionName: 'initialize',
        args: [currentAddress]
      })
    })

    // Cash remuneration EIP712
    deployments.push({
      contractType: 'CashRemunerationEIP712',
      initializerData: encodeFunctionData({
        abi: CashRemunerationEIP712ABI,
        functionName: 'initialize',
        args: [currentAddress]
      })
    })

    const encodedFunction = encodeFunctionData({
      abi: OfficerABI,
      functionName: 'initialize',
      args: [currentAddress, beaconConfigs, deployments, true]
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
  }
}
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
    if (!proxyAddress || proxyAddress == team.value.officerAddress || deployer !== currentAddress)
      loading.value = false
    else {
      try {
        team.value.officerAddress = proxyAddress as Address
        console.log('team', team.value)
        executeCreateTeam()
        loading.value = false
      } catch (error) {
        console.log('Error updating officer address:', error)
        addErrorToast('Error updating officer address')
        loading.value = false
      }
    }
  }
})
const navigateToTeam = (id: number) => {
  router.push(`/teams/${id}`)
}
</script>
