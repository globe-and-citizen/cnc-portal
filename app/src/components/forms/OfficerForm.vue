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
                v-if="!isBankDeployed && !isLoadingDeployBank && !isConfirmingDeployBank"
                @click="deployBankAccount"
              >
                Deploy Bank
              </button>
              <LoadingButton
                :color="'primary min-w-24'"
                v-if="isLoadingDeployBank || isConfirmingDeployBank"
              />
              <button
                class="btn btn-primary btn-sm"
                v-if="!isExpenseDeployed && !isLoadingDeployExpense && !isConfirmingDeployExpense"
                @click="deployExpenseAccount"
              >
                Deploy Expense
              </button>
              <LoadingButton
                :color="'primary min-w-24'"
                v-if="isLoadingDeployExpense || isConfirmingDeployExpense"
              />
              <button
                class="btn btn-primary btn-sm"
                v-if="!isVotingDeployed && !isLoadingDeployVoting && !isConfirmingDeployVoting"
                @click="deployVotingContract"
              >
                Deploy Voting
              </button>
              <LoadingButton
                :color="'primary min-w-24'"
                v-if="isLoadingDeployVoting || isConfirmingDeployVoting"
              />
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
import { useDeployOfficerContract } from '@/composables/officer'
import { useToastStore } from '@/stores'
import LoadingButton from '@/components/LoadingButton.vue'
import type { Member } from '@/types'
import { ethers } from 'ethers'
import { useCustomFetch } from '@/composables/useCustomFetch'
import { useReadContract, useWaitForTransactionReceipt, useWriteContract } from '@wagmi/vue'
import OfficerABI from '@/artifacts/abi/officer.json'
import { TIPS_ADDRESS } from '@/constant'

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
  writeContract: deployBank,
  isPending: isLoadingDeployBank,
  data: deployBankHash,
  error: deployBankError
} = useWriteContract()
const { isLoading: isConfirmingDeployBank, isSuccess: isConfirmedDeployBank } =
  useWaitForTransactionReceipt({ hash: deployBankHash })

watch(isConfirmingDeployBank, (isConfirming, wasConfirming) => {
  if (wasConfirming && !isConfirming && isConfirmedDeployBank.value) {
    addSuccessToast('Bank deployed successfully')
    emits('getTeam')
  }
})
const {
  writeContract: deployVoting,
  isPending: isLoadingDeployVoting,
  data: deployVotingHash,
  error: deployVotingError
} = useWriteContract()
const { isLoading: isConfirmingDeployVoting, isSuccess: isConfirmedDeployVoting } =
  useWaitForTransactionReceipt({ hash: deployVotingHash })

watch(isConfirmingDeployVoting, (isConfirming, wasConfirming) => {
  if (wasConfirming && !isConfirming && isConfirmedDeployVoting.value) {
    addSuccessToast('Voting deployed successfully')
    emits('getTeam')
  }
})
const {
  writeContract: deployExpense,
  isPending: isLoadingDeployExpense,
  data: deployExpenseHash,
  error: deployExpenseError
} = useWriteContract()
const { isLoading: isConfirmingDeployExpense, isSuccess: isConfirmedDeployExpense } =
  useWaitForTransactionReceipt({ hash: deployExpenseHash })
watch(isConfirmingDeployExpense, (isConfirming, wasConfirming) => {
  if (wasConfirming && !isConfirming && isConfirmedDeployExpense.value) {
    addSuccessToast('Expense account deployed successfully')
    emits('getTeam')
  }
})

// Fetch officer team details using composable
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
  deployBank({
    address: props.team.officerAddress,
    abi: OfficerABI,
    functionName: 'deployBankAccount',
    args: [TIPS_ADDRESS]
  })
}

// Deploy Voting
const deployVotingContract = async () => {
  deployVoting({
    address: props.team.officerAddress,
    abi: OfficerABI,
    functionName: 'deployVotingContract'
  })
}

const deployExpenseAccount = async () => {
  deployExpense({
    address: props.team.officerAddress,
    abi: OfficerABI,
    functionName: 'deployExpenseAccount'
  })
}

// Watch officer team data and update state
watch(officerTeam, async (value) => {
  const temp: Array<Object> = value as Array<Object>
  const team = {
    founders: temp[0] as string[],
    members: temp[1] as string[],
    bankAddress: temp[2] as string,
    votingAddress: temp[3] as string,
    bodAddress: temp[4] as string,
    expenseAccountAddress: temp[5] as string
  }
  if (team) {
    if (team.founders.length === 0) {
      showCreateTeam.value = true
    } else {
      showCreateTeam.value = false
      founders.value = team.founders
      members.value = team.members
      isBankDeployed.value = team.bankAddress != ethers.ZeroAddress
      isVotingDeployed.value = team.votingAddress != ethers.ZeroAddress
      isBoDDeployed.value = team.bodAddress != ethers.ZeroAddress
      isExpenseDeployed.value = team.expenseAccountAddress != ethers.ZeroAddress
      if (props.team.bankAddress != team.bankAddress && isBankDeployed.value) {
        await useCustomFetch<string>(`teams/${props.team.id}`)
          .put({ bankAddress: team.bankAddress })
          .json()
        emits('getTeam')
      }
      if (props.team.votingAddress != team.votingAddress && isVotingDeployed.value) {
        await useCustomFetch<string>(`teams/${props.team.id}`)
          .put({ votingAddress: team.votingAddress })
          .json()
        emits('getTeam')
      }
      if (props.team.boardOfDirectorsAddress != team.bodAddress && isBoDDeployed.value) {
        await useCustomFetch<string>(`teams/${props.team.id}`)
          .put({ boardOfDirectorsAddress: team.bodAddress })
          .json()
        emits('getTeam')
      }
      if (
        props.team.expenseAccountAddress != team.expenseAccountAddress &&
        team.expenseAccountAddress != ethers.ZeroAddress
      ) {
        console.log('updating expense account')
        await useCustomFetch<string>(`teams/${props.team.id}`)
          .put({ expenseAccountAddress: team.expenseAccountAddress })
          .json()
        emits('getTeam')
      }
    }
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

watch(deployBankError, (value) => {
  if (value) {
    addErrorToast('Failed to deploy bank')
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
    fetchOfficerTeam()
  }
})
</script>
