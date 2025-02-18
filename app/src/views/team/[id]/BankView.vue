<template>
  <div class="min-h-screen">
    <!-- Main Content -->
    <div class="p-6">
      <!-- Header Section -->
      <div class="mb-8">
        <div class="flex items-center gap-2 text-sm text-gray-600 mb-4">
          <span>CNC Team</span>
          <span>•</span>
          <span>Bank Account</span>
        </div>

        <div v-if="teamError" class="card bg-base-100 shadow-sm mb-4">
          <div class="card-body">
            <div class="flex justify-between items-start">
              <div class="text-error">
                Failed to load team data. Please try refreshing the page.
              </div>
            </div>
          </div>
        </div>

        <div v-else-if="!team" class="card bg-base-100 shadow-sm mb-4">
          <div class="card-body">
            <div class="flex justify-between items-start">
              <div class="loading loading-spinner loading-lg"></div>
            </div>
          </div>
        </div>

        <BankBalanceSection
          v-else
          ref="bankBalanceSection"
          :bank-address="typedBankAddress"
          @open-deposit="depositModal = true"
          @open-transfer="transferModal = true"
          @balance-updated="$forceUpdate()"
        />
      </div>

      <TokenHoldingsSection :tokens-with-rank="tokensWithRank" />
      <TransactionsHistorySection :transactions="transactions" />
    </div>

    <ModalComponent v-model="depositModal">
      <DepositBankForm
        v-if="depositModal"
        @close-modal="() => (depositModal = false)"
        @deposit="depositToBank"
        :loading="
          depositLoading ||
          isConfirmingDeposit ||
          isPendingApprove ||
          isConfirmingApprove ||
          tokenDepositLoading ||
          isConfirmingTokenDeposit
        "
        :loading-text="loadingText"
      />
    </ModalComponent>

    <ModalComponent v-model="transferModal">
      <TransferFromBankForm
        v-if="transferModal"
        @close-modal="() => (transferModal = false)"
        @transfer="transferFromBank"
        @searchMembers="(input: string) => searchUsers({ name: '', address: input })"
        :filteredMembers="foundUsers"
        :loading="transferLoading || isConfirmingTransfer"
        :bank-balance="bankBalanceSection?.teamBalance?.formatted || '0'"
        :usdc-balance="bankBalanceSection?.formattedUsdcBalance || '0'"
        service="Bank"
      />
    </ModalComponent>

    <ModalComponent v-model="tokenDepositModal">
      <div class="flex flex-col gap-4 justify-start">
        <span class="font-bold text-xl sm:text-2xl">Deposit USDC</span>
        <div class="form-control w-full">
          <label class="label">
            <span class="label-text">Amount</span>
          </label>
          <input
            type="number"
            class="input input-bordered w-full"
            placeholder="Enter amount"
            v-model="tokenAmount"
          />
        </div>
        <div class="text-center">
          <ButtonUI
            :loading="
              isConfirmingTokenDeposit ||
              tokenDepositLoading ||
              isConfirmingApprove ||
              isPendingApprove
            "
            :disabled="
              isConfirmingTokenDeposit ||
              tokenDepositLoading ||
              isConfirmingApprove ||
              isPendingApprove
            "
            class="w-full sm:w-44"
            @click="depositToken"
            variant="primary"
          >
            Deposit USDC
          </ButtonUI>
        </div>
      </div>
    </ModalComponent>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useSendTransaction, useWaitForTransactionReceipt, useWriteContract } from '@wagmi/vue'
import { NETWORK, USDC_ADDRESS } from '@/constant'
import type { Team, User } from '@/types'
import { useToastStore } from '@/stores/useToastStore'
import { log, parseError } from '@/utils'
import ERC20ABI from '@/artifacts/abi/erc20.json'
import { type Address } from 'viem'
import { useRoute } from 'vue-router'
import { useCustomFetch } from '@/composables/useCustomFetch'
import { parseEther } from 'viem'
import { readContract } from '@wagmi/core'
import { config } from '@/wagmi.config'
import DepositBankForm from '@/components/forms/DepositBankForm.vue'
import TransferFromBankForm from '@/components/forms/TransferFromBankForm.vue'
import ModalComponent from '@/components/ModalComponent.vue'
import ButtonUI from '@/components/ButtonUI.vue'
import { useUserDataStore } from '@/stores/user'
import BankABI from '@/artifacts/abi/bank.json'
import BankBalanceSection from '@/components/sections/BankView/BankBalanceSection.vue'
import TokenHoldingsSection from '@/components/sections/BankView/TokenHoldingsSection.vue'
import TransactionsHistorySection from '@/components/sections/BankView/TransactionsHistorySection.vue'

// Add type definitions
interface Transaction {
  hash: string
  date: string
  type: 'Deposit' | 'Transfer'
  from: string
  to: string
  amountUSD: number
  amountCAD: number
  receipt: string
}

const route = useRoute()
const { addErrorToast, addSuccessToast } = useToastStore()
const userDataStore = useUserDataStore()
const currentAddress = userDataStore.address

// Fetch team data
const {
  data: team,
  error: teamError,
  execute: executeFetchTeam
} = useCustomFetch(`teams/${String(route.params.id)}`)
  .get()
  .json<Team>()

// Computed bank address to handle undefined cases
const bankAddress = computed(() => {
  if (!team.value?.bankAddress) return undefined
  return team.value.bankAddress as Address
})

const typedBankAddress = computed(() => team.value?.bankAddress as Address | undefined)

// Template data
const tokens = computed(() => [
  {
    name: NETWORK.currencySymbol,
    network: NETWORK.currencySymbol,
    price: 0, // TODO: Add price fetching
    balance: bankBalanceSection.value?.teamBalance?.formatted
      ? Number(bankBalanceSection.value.teamBalance.formatted)
      : 0,
    amount: bankBalanceSection.value?.teamBalance?.formatted
      ? Number(bankBalanceSection.value.teamBalance.formatted)
      : 0
  },
  {
    name: 'USDC',
    network: 'USDC',
    price: 1,
    balance: bankBalanceSection.value?.formattedUsdcBalance
      ? Number(bankBalanceSection.value.formattedUsdcBalance)
      : 0,
    amount: bankBalanceSection.value?.formattedUsdcBalance
      ? Number(bankBalanceSection.value.formattedUsdcBalance)
      : 0
  }
])

interface Token {
  name: string
  network: string
  price: number // Price in USD
  balance: number // Balance in token's native unit
  amount: number // Amount in token's native unit
}

interface TokenWithRank extends Token {
  rank: number
}

const tokensWithRank = computed<TokenWithRank[]>(() =>
  tokens.value.map((token, index) => ({
    ...token,
    rank: index + 1
  }))
)

// Mock transactions data with correct type
const transactions = ref<Transaction[]>([
  {
    hash: '0xf39Fd..DD',
    date: '01/23/2025',
    type: 'Deposit',
    from: '0xf39Fd..DD',
    to: '0xf39Fd..DD',
    amountUSD: 10,
    amountCAD: 12,
    receipt: 'https://example.com/receipt'
  }
])

// Add refs for modals and form data
const depositModal = ref(false)
const transferModal = ref(false)
const tokenDepositModal = ref(false)
const tokenAmount = ref('')
const foundUsers = ref<User[]>([])

// Add contract interactions
const { sendTransaction, isPending: depositLoading, data: depositHash } = useSendTransaction()

const { isLoading: isConfirmingDeposit } = useWaitForTransactionReceipt({
  hash: depositHash
})

const {
  data: transferHash,
  isPending: transferLoading,
  writeContract: transfer
} = useWriteContract()

const { isLoading: isConfirmingTransfer } = useWaitForTransactionReceipt({
  hash: transferHash
})

const {
  writeContract: writeTokenDeposit,
  isPending: tokenDepositLoading,
  data: tokenDepositHash
} = useWriteContract()

const { isLoading: isConfirmingTokenDeposit } = useWaitForTransactionReceipt({
  hash: tokenDepositHash
})

const {
  writeContract: approve,
  isPending: isPendingApprove,
  data: approveHash
} = useWriteContract()

const { isLoading: isConfirmingApprove } = useWaitForTransactionReceipt({
  hash: approveHash
})

// Add ref for storing deposit amount during approval process
const depositAmount = ref('')

// Add functions
const depositToBank = async (data: { amount: string; token: string }) => {
  if (!bankAddress.value) return

  try {
    if (data.token === 'ETH') {
      sendTransaction({
        to: bankAddress.value,
        value: parseEther(data.amount)
      })
    } else if (data.token === 'USDC') {
      const amount = BigInt(Number(data.amount) * 1e6)
      depositAmount.value = data.amount // Store amount for after approval

      const allowance = await readContract(config, {
        address: USDC_ADDRESS as Address,
        abi: ERC20ABI,
        functionName: 'allowance',
        args: [currentAddress as Address, bankAddress.value]
      })

      const currentAllowance = allowance ? allowance.toString() : 0n
      if (Number(currentAllowance) < Number(amount)) {
        approve({
          address: USDC_ADDRESS as Address,
          abi: ERC20ABI,
          functionName: 'approve',
          args: [bankAddress.value, amount]
        })
      } else {
        // If already approved, deposit directly
        await handleUsdcDeposit(data.amount)
      }
    }
  } catch (error) {
    console.error(error)
    addErrorToast(`Failed to deposit ${data.token}`)
  }
}

// Add helper function for USDC deposit
const handleUsdcDeposit = async (amount: string) => {
  if (!bankAddress.value) return
  const tokenAmount = BigInt(Number(amount) * 1e6)

  writeTokenDeposit({
    address: bankAddress.value,
    abi: BankABI,
    functionName: 'depositToken',
    args: [USDC_ADDRESS as Address, tokenAmount]
  })
}

const transferFromBank = async (to: string, amount: string, description: string, token: string) => {
  if (!bankAddress.value) return

  try {
    if (token === NETWORK.currencySymbol) {
      transfer({
        address: bankAddress.value,
        abi: BankABI,
        functionName: 'transfer',
        args: [to, parseEther(amount)]
      })
    } else if (token === 'USDC') {
      const tokenAmount = BigInt(Number(amount) * 1e6)
      transfer({
        address: bankAddress.value,
        abi: BankABI,
        functionName: 'transferToken',
        args: [USDC_ADDRESS as Address, to, tokenAmount]
      })
    }
  } catch (error) {
    console.error(error)
    addErrorToast(`Failed to transfer ${token}`)
  }
}

const depositToken = async () => {
  if (!bankAddress.value || !tokenAmount.value) return
  const amount = BigInt(Number(tokenAmount.value) * 1e6)

  try {
    const allowance = await readContract(config, {
      address: USDC_ADDRESS as Address,
      abi: ERC20ABI,
      functionName: 'allowance',
      args: [currentAddress as Address, bankAddress.value]
    })
    const currentAllowance = allowance ? allowance.toString() : 0n
    if (Number(currentAllowance) < Number(amount)) {
      approve({
        address: USDC_ADDRESS as Address,
        abi: ERC20ABI,
        functionName: 'approve',
        args: [bankAddress.value, amount]
      })
    } else {
      writeTokenDeposit({
        address: bankAddress.value,
        abi: BankABI,
        functionName: 'depositToken',
        args: [USDC_ADDRESS as Address, amount]
      })
    }
  } catch (error) {
    console.error(error)
    addErrorToast('Failed to deposit token')
  }
}

const searchUsers = async (input: { name: string; address: string }) => {
  try {
    if (input.address) {
      const { data } = await useCustomFetch(`user/search?address=${input.address}`)
        .get()
        .json<{ users: User[] }>()
      foundUsers.value = data.value?.users || []
    }
  } catch (error) {
    console.error(error)
    addErrorToast('Failed to search users')
  }
}

// Add loading state text
const loadingText = computed(() => {
  if (isPendingApprove.value) return 'Approving USDC...'
  if (isConfirmingApprove.value) return 'Confirming USDC approval...'
  if (tokenDepositLoading.value) return 'Depositing USDC...'
  if (isConfirmingTokenDeposit.value) return 'Confirming USDC deposit...'
  if (depositLoading.value) return 'Depositing ETH...'
  if (isConfirmingDeposit.value) return 'Confirming ETH deposit...'
  return 'Processing...'
})

// Create a ref for the BankBalanceSection component
const bankBalanceSection = ref()

const refetchBalances = async () => {
  try {
    await bankBalanceSection.value?.fetchBalance()
    await bankBalanceSection.value?.fetchUsdcBalance()
  } catch (error: unknown) {
    console.error('Failed to fetch balances:', error)
    addErrorToast('Failed to fetch balance')
  }
}

//#region Watch

watch(teamError, () => {
  if (teamError.value) {
    addErrorToast('Failed to fetch team data')
    log.error('Failed to fetch team data:', parseError(teamError.value))
  }
})

watch(isConfirmingDeposit, (newIsConfirming, oldIsConfirming) => {
  if (!newIsConfirming && oldIsConfirming) {
    addSuccessToast('ETH deposited successfully')
    depositModal.value = false
    refetchBalances()
  }
})

watch(isConfirmingTransfer, (newIsConfirming, oldIsConfirming) => {
  if (!newIsConfirming && oldIsConfirming) {
    addSuccessToast('Transferred successfully')
    transferModal.value = false
    refetchBalances()
  }
})

watch(isConfirmingTokenDeposit, (newIsConfirming, oldIsConfirming) => {
  if (!newIsConfirming && oldIsConfirming) {
    addSuccessToast('USDC deposited successfully')
    depositModal.value = false
    refetchBalances()
    depositAmount.value = '' // Clear stored amount
  }
})

watch(isConfirmingApprove, async (newIsConfirming, oldIsConfirming) => {
  if (!newIsConfirming && oldIsConfirming) {
    addSuccessToast('Token approved successfully')
    // Continue with the deposit after approval
    if (depositAmount.value) {
      await handleUsdcDeposit(depositAmount.value)
    }
  }
})

//#endregion

onMounted(async () => {
  await executeFetchTeam()
  await refetchBalances()
})
</script>
