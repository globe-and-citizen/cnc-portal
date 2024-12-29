<template>
  <div class="flex flex-col gap-4 mt-4">
    <div class="flex flex-wrap gap-2">
      <ButtonUI
        size="sm"
        variant="primary"
        :loading="!isBankDeployed && isLoadingDeployBank && !isConfirmingDeployBank"
        :disabled="isBankDeployed || (isLoadingDeployBank && !isConfirmingDeployBank)"
        @click="deployBankAccount"
      >
        Deploy Bank
      </ButtonUI>

      <ButtonUI
        size="sm"
        variant="primary"
        :loading="!isVotingDeployed && isLoadingDeployVoting && !isConfirmingDeployVoting"
        :disabled="isVotingDeployed || (isLoadingDeployVoting && !isConfirmingDeployVoting)"
        @click="deployVotingContract"
      >
        Deploy Voting
      </ButtonUI>

      <ButtonUI
        size="sm"
        variant="primary"
        :loading="!isExpenseDeployed && isLoadingDeployExpense && !isConfirmingDeployExpense"
        :disabled="isExpenseDeployed || (isLoadingDeployExpense && !isConfirmingDeployExpense)"
        @click="deployExpenseAccount"
      >
        Deploy Expense
      </ButtonUI>

      <ButtonUI
        size="sm"
        variant="primary"
        :loading="
          !isExpenseEip712Deployed &&
          isLoadingDeployExpenseEip712 &&
          !isConfirmingDeployExpenseEip712
        "
        :disabled="
          isExpenseEip712Deployed ||
          (isLoadingDeployExpenseEip712 && !isConfirmingDeployExpenseEip712)
        "
        @click="deployExpenseAccountEip712"
      >
        Deploy Expense EIP712
      </ButtonUI>

      <ButtonUI
        size="sm"
        variant="primary"
        :loading="
          !isCashRemunerationEip712Deployed &&
          isLoadingDeployCashRemunerationEip712 &&
          !isConfirmingDeployCashRemunerationEip712
        "
        :disabled="
          isCashRemunerationEip712Deployed ||
          (isLoadingDeployCashRemunerationEip712 && !isConfirmingDeployCashRemunerationEip712)
        "
        @click="deployCashRemunerationEip712"
      >
        Deploy Cash Remuneration EIP712
      </ButtonUI>

      <ButtonUI
        size="sm"
        variant="primary"
        v-if="!isInvestorV1Deployed"
        @click="() => emits('openInvestorContractModal')"
      >
        Deploy Investor V1
      </ButtonUI>
    </div>

    <div class="flex justify-center">
      <ButtonUI
        size="sm"
        variant="primary"
        :loading="isLoadingDeployAll && !areAllContractsDeployed && !isConfirmingDeployAll"
        :disabled="areAllContractsDeployed || (isLoadingDeployAll && !isConfirmingDeployAll)"
        data-test="deploy-all-contracts"
        @click="deployAllContracts"
      >
        Deploy All Contracts
      </ButtonUI>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue'
import { useToastStore } from '@/stores'
import { useUserDataStore } from '@/stores/user'
import { useWriteContract, useWaitForTransactionReceipt } from '@wagmi/vue'
import { encodeFunctionData, type Address } from 'viem'
import { log, parseError } from '@/utils'

// Contract ABIs and constants
import OfficerABI from '@/artifacts/abi/officer.json'
import BankABI from '@/artifacts/abi/bank.json'
import VotingABI from '@/artifacts/abi/voting.json'
import ExpenseAccountABI from '@/artifacts/abi/expense-account.json'
import ExpenseAccountEIP712ABI from '@/artifacts/abi/expense-account-eip712.json'
import CashRemunerationEIP712ABI from '@/artifacts/abi/CashRemunerationEIP712.json'
import { TIPS_ADDRESS } from '@/constant'
import type { Team } from '@/types'
import ButtonUI from '../ButtonUI.vue'

const props = defineProps<{
  team: Team
  founders: string[]
  isBankDeployed: boolean
  isVotingDeployed: boolean
  isBoDDeployed: boolean
  isExpenseDeployed: boolean
  isExpenseEip712Deployed: boolean
  isCashRemunerationEip712Deployed: boolean
  isInvestorV1Deployed: boolean
}>()

const emits = defineEmits(['getTeam', 'openInvestorContractModal'])
const { addErrorToast, addSuccessToast } = useToastStore()

// remuneration deployment
const {
  writeContract: deployCashRemuneration,
  isPending: isLoadingDeployCashRemunerationEip712,
  data: deployCashRemunerationEip712Hash,
  error: deployCashRemunerationEip712Error
} = useWriteContract()

const {
  isLoading: isConfirmingDeployCashRemunerationEip712,
  isSuccess: isConfirmedDeployCashRemunerationEip712
} = useWaitForTransactionReceipt({ hash: deployCashRemunerationEip712Hash })

watch(isConfirmingDeployCashRemunerationEip712, (isConfirming, wasConfirming) => {
  if (wasConfirming && !isConfirming && isConfirmedDeployCashRemunerationEip712.value) {
    addSuccessToast('Cash Remuneration EIP712 deployed successfully')
    emits('getTeam')
  }
})

// Bank deployment
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

// Voting deployment
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

// Expense deployment
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

// Expense EIP712 deployment
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

// BoD deployment

// Deploy All Contracts
const {
  writeContract: deployAll,
  isPending: isLoadingDeployAll,
  error: deployAllError,
  data: deployAllData
} = useWriteContract()

const { isLoading: isConfirmingDeployAll, isSuccess: isConfirmedDeployAll } =
  useWaitForTransactionReceipt({
    hash: deployAllData
  })

watch(isConfirmingDeployAll, (isConfirming, wasConfirming) => {
  if (wasConfirming && !isConfirming && isConfirmedDeployAll.value) {
    addSuccessToast('All contracts deployed successfully')
    emits('getTeam')
  }
})

// Deployment functions
const deployBankAccount = async () => {
  const currentAddress = useUserDataStore().address as Address
  const initData = encodeFunctionData({
    abi: BankABI,
    functionName: 'initialize',
    args: [TIPS_ADDRESS, currentAddress]
  })

  deployBank({
    address: props.team.officerAddress as Address,
    abi: OfficerABI,
    functionName: 'deployBeaconProxy',
    args: ['Bank', initData]
  })
}

const deployVotingContract = async () => {
  const currentAddress = useUserDataStore().address as Address
  const initData = encodeFunctionData({
    abi: VotingABI,
    functionName: 'initialize',
    args: [currentAddress]
  })

  deployVoting({
    address: props.team.officerAddress as Address,
    abi: OfficerABI,
    functionName: 'deployBeaconProxy',
    args: ['Voting', initData]
  })
}

const deployExpenseAccount = async () => {
  const currentAddress = useUserDataStore().address as Address
  const initData = encodeFunctionData({
    abi: ExpenseAccountABI,
    functionName: 'initialize',
    args: [currentAddress]
  })

  deployExpense({
    address: props.team.officerAddress as Address,
    abi: OfficerABI,
    functionName: 'deployBeaconProxy',
    args: ['ExpenseAccount', initData]
  })
}
const deployCashRemunerationEip712 = async () => {
  const currentAddress = useUserDataStore().address as Address
  const initData = encodeFunctionData({
    abi: CashRemunerationEIP712ABI,
    functionName: 'initialize',
    args: [currentAddress]
  })

  deployCashRemuneration({
    address: props.team.officerAddress as Address,
    abi: OfficerABI,
    functionName: 'deployBeaconProxy',
    args: ['CashRemunerationEIP712', initData]
  })
}

const deployExpenseAccountEip712 = async () => {
  const currentAddress = useUserDataStore().address as Address
  const initData = encodeFunctionData({
    abi: ExpenseAccountEIP712ABI,
    functionName: 'initialize',
    args: [currentAddress]
  })

  deployExpenseEip712({
    address: props.team.officerAddress as Address,
    abi: OfficerABI,
    functionName: 'deployBeaconProxy',
    args: ['ExpenseAccountEIP712', initData]
  })
}

const areAllContractsDeployed = computed(() => {
  return (
    props.isBankDeployed &&
    props.isVotingDeployed &&
    props.isExpenseDeployed &&
    props.isExpenseEip712Deployed &&
    props.isBoDDeployed &&
    props.isCashRemunerationEip712Deployed &&
    props.isInvestorV1Deployed
  )
})

const deployAllContracts = async () => {
  const currentAddress = useUserDataStore().address as Address
  const deployments = []

  if (!props.isBankDeployed) {
    deployments.push({
      contractType: 'Bank',
      initializerData: encodeFunctionData({
        abi: BankABI,
        functionName: 'initialize',
        args: [TIPS_ADDRESS, currentAddress]
      })
    })
  }

  if (!props.isVotingDeployed) {
    deployments.push({
      contractType: 'Voting',
      initializerData: encodeFunctionData({
        abi: VotingABI,
        functionName: 'initialize',
        args: [currentAddress]
      })
    })
  }

  if (!props.isExpenseDeployed) {
    deployments.push({
      contractType: 'ExpenseAccount',
      initializerData: encodeFunctionData({
        abi: ExpenseAccountABI,
        functionName: 'initialize',
        args: [currentAddress]
      })
    })
  }

  if (!props.isExpenseEip712Deployed) {
    deployments.push({
      contractType: 'ExpenseAccountEIP712',
      initializerData: encodeFunctionData({
        abi: ExpenseAccountEIP712ABI,
        functionName: 'initialize',
        args: [currentAddress]
      })
    })
  }

  if (!props.isCashRemunerationEip712Deployed) {
    deployments.push({
      contractType: 'CashRemunerationEIP712',
      initializerData: encodeFunctionData({
        abi: CashRemunerationEIP712ABI,
        functionName: 'initialize',
        args: [currentAddress]
      })
    })
  }

  if (deployments.length > 0) {
    if (!props.isInvestorV1Deployed) {
      // Deploy on SingleTeamView
      emits('openInvestorContractModal', deployments)
    } else {
      try {
        deployAll({
          address: props.team.officerAddress as Address,
          abi: OfficerABI,
          functionName: 'deployAllContracts',
          args: [deployments]
        })
      } catch (error) {
        log.error(parseError(error))
        addErrorToast('Error deploying contracts')
      }
    }
  }
}

// Error watchers
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

watch(deployExpenseError, (value) => {
  if (value) {
    addErrorToast('Failed to deploy expense account')
  }
})

watch(deployCashRemunerationEip712Error, (value) => {
  if (value) addErrorToast('Failed to deploy cash remuneration')
})

watch(deployExpenseEip712Error, (value) => {
  if (value) addErrorToast('Failed to deploy expense account eip712')
})

watch(deployAllError, (value) => {
  if (value) {
    addErrorToast('Error deploying all contracts')
  }
})
</script>
