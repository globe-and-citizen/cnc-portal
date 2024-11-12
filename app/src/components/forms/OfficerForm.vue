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
          <div v-if="showCreateTeam && !isLoadingGetTeam">
            <CreateOfficerTeam :team="team" @getTeam="emits('getTeam')" />
          </div>
          <div v-if="!showCreateTeam && !isLoadingGetTeam">
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
            <div class="flex flex-col">
              <h5 class="text-md font-bold">Deployments</h5>
              <div>
                <span
                  data-test="bank-address"
                  v-if="isBankDeployed"
                  class="badge badge-primary badge-sm"
                >
                  Bank deployed at: {{ team?.bankAddress }}
                </span>
              </div>
              <div>
                <span
                  data-test="voting-address"
                  v-if="isVotingDeployed"
                  class="badge badge-primary badge-sm"
                >
                  Voting deployed at: {{ team?.votingAddress }}
                </span>
              </div>
              <div>
                <span
                  data-test="bod-address"
                  v-if="isBoDDeployed"
                  class="badge badge-primary badge-sm"
                >
                  BoD deployed at: {{ team?.boardOfDirectorsAddress }}
                </span>
              </div>
              <div>
                <span
                  data-test="expense-address"
                  v-if="isExpenseDeployed"
                  class="badge badge-primary badge-sm"
                >
                  Expense deployed at: {{ team?.expenseAccountAddress }}
                </span>
              </div>
              <div>
                <span
                  data-test="expense-eip712-address"
                  v-if="isExpenseEip712Deployed"
                  class="badge badge-primary badge-sm"
                >
                  Expense EIP712 deployed at: {{ team?.expenseAccountEip712Address }}
                </span>
              </div>
            </div>
            <div class="flex justify-between mt-4">
              <button
                class="btn btn-primary btn-sm"
                v-if="!isBankDeployed && !isLoadingDeployBank && !isConfirmingDeployBank"
                @click="deployBankAccount"
                data-test="deployBankButton"
              >
                Deploy Bank
              </button>
              <LoadingButton
                :color="'primary min-w-24'"
                data-test="loading-deploy-bank"
                v-if="isLoadingDeployBank || isConfirmingDeployBank"
              />
              <button
                class="btn btn-primary btn-sm"
                v-if="!isExpenseDeployed && !isLoadingDeployExpense && !isConfirmingDeployExpense"
                @click="deployExpenseAccount"
                data-test="deployExpenseButton"
              >
                Deploy Expense
              </button>
              <LoadingButton
                :color="'primary min-w-24'"
                data-test="loading-deploy-expense"
                v-if="isLoadingDeployExpense || isConfirmingDeployExpense"
              />

              <button
                class="btn btn-primary btn-sm"
                v-if="!isExpenseEip712Deployed && !isLoadingDeployExpenseEip712 && !isConfirmingDeployExpenseEip712"
                @click="deployExpenseAccountEip712"
                data-test="deployExpenseButtonEip712"
              >
                Deploy Expense EIP712
              </button>
              <LoadingButton
                :color="'primary min-w-24'"
                data-test="loading-deploy-expense-eip712"
                v-if="isLoadingDeployExpenseEip712 || isConfirmingDeployExpenseEip712"
              />

              <button
                class="btn btn-primary btn-sm"
                v-if="!isVotingDeployed && !isLoadingDeployVoting && !isConfirmingDeployVoting"
                @click="deployVotingContract"
                data-test="deployVotingButton"
              >
                Deploy Voting
              </button>
              <LoadingButton
                :color="'primary min-w-24'"
                data-test="loading-deploy-voting"
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
import { ref, watch, onMounted, computed } from 'vue'
import { useToastStore } from '@/stores'
import LoadingButton from '@/components/LoadingButton.vue'
import type { Member } from '@/types'
import { ethers } from 'ethers'
import { useCustomFetch } from '@/composables/useCustomFetch'
import { useReadContract, useWaitForTransactionReceipt, useWriteContract } from '@wagmi/vue'
import OfficerABI from '@/artifacts/abi/officer.json'
import FACTORY_BEACON_ABI from '@/artifacts/abi/factory-beacon.json'
import { encodeFunctionData, type Address } from 'viem'
import { useUserDataStore } from '@/stores/user'
import {
  BANK_BEACON_ADDRESS,
  BOD_BEACON_ADDRESS,
  TIPS_ADDRESS,
  EXPENSE_ACCOUNT_BEACON_ADDRESS,
  OFFICER_BEACON,
  VOTING_BEACON_ADDRESS,
  EXPENSE_ACCOUNT_EIP712_BEACON_ADDRESS
} from '@/constant'
import { useWatchContractEvent } from '@wagmi/vue'
import { log, parseError } from '@/utils'

const { addErrorToast, addSuccessToast } = useToastStore()

const props = defineProps(['team'])
const emits = defineEmits(['getTeam'])

const showCreateTeam = ref(false)
const isBankDeployed = ref(false)
const isVotingDeployed = ref(false)
const isBoDDeployed = ref(false)
const isExpenseDeployed = ref(false)
const isExpenseEip712Deployed = ref(false)
const founders = ref<string[]>([])
const members = ref<string[]>([])

// Setup composables

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

const {
  writeContract: deployExpenseEip712,
  isPending: isLoadingDeployExpenseEip712,
  data: deployExpenseEip712Hash,
  error: deployExpenseEip712Error
} = useWriteContract()
const { isLoading: isConfirmingDeployExpenseEip712, isSuccess: isConfirmedDeployExpenseEip712 } =
  useWaitForTransactionReceipt({ hash: deployExpenseEip712Hash })
watch(isConfirmingDeployExpenseEip712, (isConfirming, wasConfirming) => {
  if (wasConfirming && !isConfirming && isConfirmedDeployExpenseEip712.value) {
    addSuccessToast('Expense EIP712 account deployed successfully')
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

watch(createOfficerError, (value) => {
  if (value) {
    loading.value = false
    addErrorToast('Failed to deploy officer contract')
  }
})
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
    const encodedFunction = encodeFunctionData({
      abi: OfficerABI,
      functionName: 'initialize',
      args: [
        currentAddress,
        BANK_BEACON_ADDRESS,
        VOTING_BEACON_ADDRESS,
        BOD_BEACON_ADDRESS,
        EXPENSE_ACCOUNT_BEACON_ADDRESS,
        EXPENSE_ACCOUNT_EIP712_BEACON_ADDRESS
      ]
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

const deployExpenseAccountEip712 = async () => {
  deployExpenseEip712({
    address: props.team.officerAddress,
    abi: OfficerABI,
    functionName: 'deployExpenseAccountEip712'
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
    expenseAccountAddress: temp[5] as string,
    expenseAccountEip712Address: temp[6] as string
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
      isExpenseEip712Deployed.value = team.expenseAccountEip712Address != ethers.ZeroAddress
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
        if (props.team.boardOfDirectorsAddress != team.bodAddress && isBoDDeployed.value) {
          await useCustomFetch<string>(`teams/${props.team.id}`)
            .put({ boardOfDirectorsAddress: team.bodAddress })
            .json()
        }
        emits('getTeam')
      }

      if (
        props.team.expenseAccountAddress != team.expenseAccountAddress &&
        team.expenseAccountAddress != ethers.ZeroAddress
      ) {
        await useCustomFetch<string>(`teams/${props.team.id}`)
          .put({ expenseAccountAddress: team.expenseAccountAddress })
          .json()
        emits('getTeam')
      }
      //expense account eip 712
      if (
        props.team.expenseAccountEip712Address != team.expenseAccountEip712Address &&
        team.expenseAccountEip712Address != ethers.ZeroAddress
      ) {
        await useCustomFetch<string>(`teams/${props.team.id}`)
          .put({ expenseAccountEip712Address: team.expenseAccountEip712Address })
          .json()
        emits('getTeam')
      }
    }
  }
})

watch(deployExpenseError, (value) => {
  if (value) {
    console.log(`Failed to deploy officer contract`, value)
    addErrorToast('Failed to deploy expense account')
  }
})

watch(deployBankError, (value) => {
  if (value) {
    log.error(parseError(value))
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
  if (officerTeam.value) {
    const temp: Array<Object> = officerTeam.value as unknown as Array<Object>
    const team = {
      founders: temp[0] as string[],
      members: temp[1] as string[],
      bankAddress: temp[2] as string,
      votingAddress: temp[3] as string,
      bodAddress: temp[4] as string,
      expenseAccountAddress: temp[5] as string,
      expenseAccountEip712Address: temp[5] as string
    }
    if (team) {
      if (team.founders?.length === 0) {
        showCreateTeam.value = true
      } else {
        showCreateTeam.value = false
        founders.value = team.founders
        members.value = team.members
        isBankDeployed.value = team.bankAddress != ethers.ZeroAddress
        isVotingDeployed.value = team.votingAddress != ethers.ZeroAddress
        isBoDDeployed.value = team.bodAddress != ethers.ZeroAddress
        isExpenseDeployed.value = team.expenseAccountAddress != ethers.ZeroAddress
        isExpenseEip712Deployed.value = team.expenseAccountEip712Address != ethers.ZeroAddress
      }
    }
  }
})
</script>
