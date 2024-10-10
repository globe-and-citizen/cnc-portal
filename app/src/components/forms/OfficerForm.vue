<template>
  <div class="flex flex-col">
    <h3 class="text-xl font-bold">Manage deployments</h3>
    <hr />

    <div class="flex items-center justify-center mt-4">
      <button
        class="btn btn-primary btn-sm"
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
          <div v-if="showCreateTeam && !isLoadingGetTeam">
            <CreateOfficerTeam :team="team" @getTeam="emits('getTeam')" />
          </div>
          <div v-if="!showCreateTeam && !isLoadingGetTeam">
            <div class="flex flex-col">
              <h5 class="text-md font-bold">Founders</h5>
              <div v-for="(founderAddress, index) in founders" :key="index">
                <span v-if="team && team.members" class="badge badge-primary badge-sm">
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
              <div v-for="(memberAddress, index) in members" :key="index">
                <span v-if="team && team.members" class="badge badge-secondary badge-sm">
                  {{
                    team.members.find((member: Member) => member.address == memberAddress)?.name ||
                    'Unknown Member'
                  }}
                  | {{ memberAddress }}
                </span>
              </div>
            </div>
            <div class="flex flex-col">
              <h5 class="text-md font-bold">Deployments</h5>
              <div>
                <span v-if="isBankDeployed" class="badge badge-primary badge-sm">
                  Bank deployed at: {{ team?.bankAddress }}
                </span>
              </div>
              <div>
                <span v-if="isVotingDeployed" class="badge badge-primary badge-sm">
                  Voting deployed at: {{ team?.votingAddress }}
                </span>
              </div>
              <div>
                <span v-if="isBoDDeployed" class="badge badge-primary badge-sm">
                  BoD deployed at: {{ team?.boardOfDirectorsAddress }}
                </span>
              </div>
              <div>
                <span v-if="isExpenseDeployed" class="badge badge-primary badge-sm">
                  Expense deployed at: {{ team?.expenseAccountAddress }}
                </span>
              </div>
            </div>
            <div class="flex justify-between mt-4">
              <button
                class="btn btn-primary btn-sm"
                v-if="!isBankDeployed && !isLoadingDeployBank"
                @click="deployBankAccount"
              >
                Deploy Bank
              </button>
              <LoadingButton :color="'primary min-w-24'" v-if="isLoadingDeployBank" />
              <button
                class="btn btn-primary btn-sm"
                v-if="!isExpenseDeployed && !isLoadingDeployExpense"
                @click="deployExpenseAccount"
              >
                Deploy Expense
              </button>
              <LoadingButton :color="'primary min-w-24'" v-if="isLoadingDeployExpense" />
              <button
                class="btn btn-primary btn-sm"
                v-if="!isVotingDeployed && !isLoadingDeployVoting"
                @click="deployVotingContract"
              >
                Deploy Voting
              </button>
              <LoadingButton :color="'primary min-w-24'" v-if="isLoadingDeployVoting" />
            </div>
          </div>
          <div v-if="isLoadingGetTeam">
            <span class="loading loading-spinner loading-lg"></span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import CreateOfficerTeam from '@/components/forms/CreateOfficerTeam.vue'
import { ref, watch, onMounted } from 'vue'
import {
  useDeployOfficerContract,
  useDeployBank,
  useDeployVoting,
  useGetOfficerTeam,
  useDeployExpenseAccount
} from '@/composables/officer'
import { useToastStore } from '@/stores'
import LoadingButton from '@/components/LoadingButton.vue'
import type { Member } from '@/types'
import { ethers } from 'ethers'
import { useCustomFetch } from '@/composables/useCustomFetch'

const { addErrorToast, addSuccessToast } = useToastStore()

const props = defineProps(['team'])
const emits = defineEmits(['getTeam'])

const showCreateTeam = ref(false)
const isBankDeployed = ref(false)
const isVotingDeployed = ref(false)
const isBoDDeployed = ref(false)
const isExpenseDeployed = ref(false)
const founders = ref<string[]>([])
const members = ref<string[]>([])

// Setup composables
const {
  execute: deployOfficer,
  isLoading: createOfficerLoading,
  error: deployOfficerError,
  isSuccess: deployOfficerSuccess
} = useDeployOfficerContract()
const {
  execute: deployBank,
  isLoading: isLoadingDeployBank,
  isSuccess: deployBankSuccess,
  error: deployBankError
} = useDeployBank()
const {
  execute: deployVoting,
  isLoading: isLoadingDeployVoting,
  isSuccess: deployVotingSuccess,
  error: deployVotingError
} = useDeployVoting()
const {
  execute: deployExpense,
  isLoading: isLoadingDeployExpense,
  isSuccess: deployExpenseSuccess,
  error: deployExpenseError
} = useDeployExpenseAccount()

// Fetch officer team details using composable
const { execute: fetchOfficerTeam, isLoading: isLoadingGetTeam, officerTeam } = useGetOfficerTeam()

// Deploy Officer Contract
const deployOfficerContract = async () => {
  try {
    await deployOfficer(props.team.id)
  } catch (e) {
    addErrorToast('Failed to deploy officer contract')
  }
}

// Deploy Bank
const deployBankAccount = async () => {
  await deployBank(props.team.officerAddress)
}

// Deploy Voting
const deployVotingContract = async () => {
  await deployVoting(props.team.officerAddress)
}

const deployExpenseAccount = async () => {
  await deployExpense(props.team.officerAddress)
}

// Watch officer team data and update state
watch(officerTeam, async (value) => {
  if (value) {
    if (value.founders.length === 0) {
      showCreateTeam.value = true
    } else {
      showCreateTeam.value = false
      founders.value = value.founders
      members.value = value.members
      isBankDeployed.value = value.bankAddress != ethers.ZeroAddress
      isVotingDeployed.value = value.votingAddress != ethers.ZeroAddress
      isBoDDeployed.value = value.bodAddress != ethers.ZeroAddress
      isExpenseDeployed.value = value.expenseAccountAddress != ethers.ZeroAddress
      if (props.team.bankAddress != value.bankAddress && isBankDeployed.value) {
        await useCustomFetch<string>(`teams/${props.team.id}`)
          .put({ bankAddress: value.bankAddress })
          .json()
        emits('getTeam')
      }
      if (props.team.votingAddress != value.votingAddress && isVotingDeployed.value) {
        await useCustomFetch<string>(`teams/${props.team.id}`)
          .put({ votingAddress: value.votingAddress })
          .json()
        emits('getTeam')
      }
      if (props.team.boardOfDirectorsAddress != value.bodAddress && isBoDDeployed.value) {
        await useCustomFetch<string>(`teams/${props.team.id}`)
          .put({ boardOfDirectorsAddress: value.bodAddress })
          .json()
        emits('getTeam')
      }
      if (
        props.team.expenseAccountAddress != value.expenseAccountAddress &&
        value.expenseAccountAddress != ethers.ZeroAddress
      ) {
        console.log('updating expense account')
        await useCustomFetch<string>(`teams/${props.team.id}`)
          .put({ expenseAccountAddress: value.expenseAccountAddress })
          .json()
        emits('getTeam')
      }
    }
  }
})
watch(deployExpenseSuccess, (value) => {
  if (value) {
    addSuccessToast('Expense account deployed successfully')
    emits('getTeam')
  }
})
watch(deployExpenseError, (value) => {
  if (value) {
    addErrorToast('Failed to deploy expense account')
  }
})

watch(deployOfficerSuccess, (value) => {
  if (value) {
    addSuccessToast('Officer contract deployed successfully')
    emits('getTeam')
  }
})
watch(deployOfficerSuccess, (value) => {
  if (value) {
    addSuccessToast('Officer contract deployed successfully')
    emits('getTeam')
  }
})
watch(deployOfficerError, (value) => {
  if (value) {
    addErrorToast('Failed to deploy officer contract')
  }
})
watch(deployBankSuccess, (value) => {
  if (value) {
    addSuccessToast('Bank deployed successfully')
    emits('getTeam')
  }
})
watch(deployBankError, (value) => {
  if (value) {
    addErrorToast('Failed to deploy bank')
  }
})
watch(deployVotingSuccess, (value) => {
  if (value) {
    addSuccessToast('Voting deployed successfully')
    emits('getTeam')
  }
})
watch(deployVotingError, (value) => {
  if (value) {
    addErrorToast('Failed to deploy voting')
  }
})
// Fetch the officer team when mounted
onMounted(() => {
  if (props.team.officerAddress) {
    fetchOfficerTeam(props.team.officerAddress)
  }
})
</script>
