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

        <!-- Balance Card -->
        <div class="card bg-base-100 shadow-sm mb-4">
          <div class="card-body">
            <div class="flex justify-between items-start">
              <div>
                <h2 class="text-lg font-medium mb-1">Balance</h2>
                <div class="flex items-baseline gap-2">
                  <span class="text-4xl font-bold">
                    <span class="inline-block min-w-16 h-10">
                      <span
                        class="loading loading-spinner loading-lg"
                        v-if="balanceLoading || isLoadingUsdcBalance"
                      ></span>
                      <span v-else>{{ teamBalance?.formatted }}</span>
                    </span>
                  </span>
                  <span class="text-gray-600">{{ NETWORK.currencySymbol }}</span>
                </div>
                <div class="text-sm text-gray-500 mt-1">≈ $ 1.28</div>
                <div class="mt-2">
                  <span>USDC Balance: </span>
                  <span>{{ usdcBalance ? Number(usdcBalance) / 1e6 : '0' }}</span>
                </div>
              </div>
              <div class="flex gap-2">
                <ButtonUI
                  v-if="team?.bankAddress"
                  variant="secondary"
                  class="flex items-center gap-2"
                  @click="depositModal = true"
                >
                  <PlusIcon class="w-5 h-5" />
                  Deposit
                </ButtonUI>
                <ButtonUI
                  v-if="team?.bankAddress"
                  variant="secondary"
                  class="flex items-center gap-2"
                  @click="transferModal = true"
                >
                  <ArrowsRightLeftIcon class="w-5 h-5" />
                  Transfer
                </ButtonUI>
                <!-- <ButtonUI
                  v-if="team?.bankAddress"
                  variant="secondary"
                  class="flex items-center gap-2"
                  @click="tokenDepositModal = true"
                >
                  <UserGroupIcon class="w-5 h-5" />
                  Send To Members
                </ButtonUI> -->
              </div>
            </div>

            <div class="text-sm text-gray-600 mt-4">
              Contract Address:
              <span class="font-mono">{{ team?.bankAddress }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Token Holdings Card -->
      <div class="card bg-base-100 shadow-sm mb-8">
        <div class="card-body">
          <h3 class="text-lg font-medium mb-4">Token Holding</h3>
          <TableComponent
            :rows="tokensWithRank"
            :columns="[
              { key: 'rank', label: 'RANK' },
              { key: 'token', label: 'Token', sortable: true },
              { key: 'amount', label: 'Amount', sortable: true },
              { key: 'price', label: 'Coin Price', sortable: true },
              { key: 'balance', label: 'Balance', sortable: true }
            ]"
          >
            <template #token-data="{ row }">
              <div class="flex flex-col">
                <div class="font-medium">{{ row.name }}</div>
                <div class="text-sm text-gray-500">{{ row.network }}</div>
              </div>
            </template>
            <template #rank-data="{ row }">
              {{ row.rank }}
            </template>
            <template #price-data="{ row }"> ${{ row.price }} </template>
            <template #balance-data="{ row }"> ${{ row.balance }} </template>
          </TableComponent>
        </div>
      </div>

      <!-- Transactions History Card -->
      <div class="card bg-base-100 shadow-sm">
        <div class="card-body">
          <div class="flex justify-between items-center mb-4">
            <h3 class="text-lg font-medium">Bank Transactions History</h3>
            <div class="flex items-center gap-4">
              <div class="flex">
                <input class="input input-bordered join-item" placeholder="1st January" />
                <span class="join-item flex items-center px-2">-</span>
                <input class="input input-bordered join-item" placeholder="30 January" />
              </div>
              <button class="btn btn-success gap-2">
                Export
                <ArrowDownTrayIcon class="h-4 w-4" />
              </button>
            </div>
          </div>

          <TableComponent
            :rows="transactions"
            :columns="[
              { key: 'hash', label: 'Tx Hash', sortable: true },
              { key: 'date', label: 'Date', sortable: true },
              { key: 'type', label: 'Type', sortable: true },
              { key: 'from', label: 'From', sortable: true },
              { key: 'to', label: 'To', sortable: true },
              { key: 'amountUSD', label: 'Amount (USD)', sortable: true },
              { key: 'amountCAD', label: 'Amount (CAD)', sortable: true },
              { key: 'receipts', label: 'Receipts' }
            ]"
          >
            <template #type-data="{ row }">
              <span :class="`badge ${row.type === 'Deposit' ? 'badge-success' : 'badge-error'}`">
                {{ row.type }}
              </span>
            </template>
            <template #receipts-data="{ row }">
              <a
                :href="row.receipt"
                target="_blank"
                class="text-primary hover:text-primary-focus transition-colors duration-200 flex items-center gap-2"
              >
                <DocumentTextIcon class="h-4 w-4" />
                Receipt
              </a>
            </template>
          </TableComponent>

          <!-- Pagination -->
          <div class="flex justify-between items-center mt-4">
            <div class="text-sm text-gray-600">
              Rows per page:
              <select class="select select-bordered select-sm w-20">
                <option>20</option>
                <option>50</option>
                <option>100</option>
              </select>
            </div>
            <div class="join">
              <button class="join-item btn btn-sm">«</button>
              <button class="join-item btn btn-sm">1-5 of 20</button>
              <button class="join-item btn btn-sm">»</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <ModalComponent v-model="depositModal">
      <DepositBankForm
        v-if="depositModal"
        @close-modal="() => (depositModal = false)"
        @deposit="depositToBank"
        :loading="depositLoading || isConfirmingDeposit"
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
        :bank-balance="teamBalance?.formatted || '0'"
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
import {
  PlusIcon,
  ArrowsRightLeftIcon,
  UserGroupIcon,
  DocumentTextIcon,
  ArrowDownTrayIcon
} from '@heroicons/vue/24/outline'
import TableComponent from '@/components/TableComponent.vue'
import ButtonUI from '@/components/ButtonUI.vue'
import {
  useBalance,
  useReadContract,
  useChainId,
  useSendTransaction,
  useWaitForTransactionReceipt,
  useWriteContract
} from '@wagmi/vue'
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
import { useUserDataStore } from '@/stores/user'
import BankABI from '@/artifacts/abi/bank.json'

const route = useRoute()
const { addErrorToast, addSuccessToast } = useToastStore()
const chainId = useChainId()
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

// Balance fetching
const {
  data: teamBalance,
  isLoading: balanceLoading,
  error: balanceError,
  refetch: fetchBalance
} = useBalance({
  address: bankAddress as unknown as Address,
  chainId
})

// USDC Balance
const {
  data: usdcBalance,
  isLoading: isLoadingUsdcBalance,
  refetch: fetchUsdcBalance,
  error: usdcBalanceError
} = useReadContract({
  address: USDC_ADDRESS as Address,
  abi: ERC20ABI,
  functionName: 'balanceOf',
  args: [bankAddress as unknown as Address]
})

// Template data
const tokens = computed<Token[]>(() => [
  {
    name: 'ETH',
    network: 'Ethereum',
    price: 0, // TODO: Add price fetching
    balance: teamBalance.value ? Number(teamBalance.value.formatted) : 0,
    amount: teamBalance.value ? Number(teamBalance.value.formatted) : 0
  },
  {
    name: 'USDC',
    network: 'USDC',
    price: 1, // USDC is a stablecoin pegged to USD
    balance: usdcBalance.value ? Number(usdcBalance.value) / 1e6 : 0,
    amount: usdcBalance.value ? Number(usdcBalance.value) / 1e6 : 0
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

const transactions = ref([
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
  data: approveHash,
  isPending: isPendingApprove
} = useWriteContract()

const { isLoading: isConfirmingApprove } = useWaitForTransactionReceipt({
  hash: approveHash
})

// Add functions
const depositToBank = async (amount: string) => {
  if (bankAddress.value) {
    sendTransaction({
      to: bankAddress.value,
      value: parseEther(amount)
    })
  }
}

const transferFromBank = async (to: string, amount: string) => {
  if (!bankAddress.value) return
  transfer({
    address: bankAddress.value,
    abi: BankABI,
    functionName: 'transfer',
    args: [to, parseEther(amount)]
  })
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

// Async initialization function
const init = async () => {
  await executeFetchTeam()
  fetchBalance()
  fetchUsdcBalance()
}

//#region Watch
watch(
  () => team.value,
  async (newVal) => {
    if (newVal) await init()
  }
)

watch(teamError, () => {
  if (teamError.value) {
    addErrorToast('Failed to fetch team data')
    log.error('Failed to fetch team data:', parseError(teamError.value))
  }
})

watch(balanceError, () => {
  if (balanceError.value) {
    addErrorToast('Failed to fetch team balance')
    log.error('Failed to fetch team balance:', parseError(balanceError.value))
  }
})

watch(usdcBalanceError, () => {
  if (usdcBalanceError.value) {
    addErrorToast('Failed to fetch USDC balance')
    log.error('Failed to fetch USDC balance:', parseError(usdcBalanceError.value))
  }
})

watch(isConfirmingDeposit, (newIsConfirming, oldIsConfirming) => {
  if (!newIsConfirming && oldIsConfirming) {
    addSuccessToast('Deposited successfully')
    depositModal.value = false
    fetchBalance()
  }
})

watch(isConfirmingTransfer, (newIsConfirming, oldIsConfirming) => {
  if (!newIsConfirming && oldIsConfirming) {
    addSuccessToast('Transferred successfully')
    transferModal.value = false
    fetchBalance()
  }
})

watch(isConfirmingTokenDeposit, (newIsConfirming, oldIsConfirming) => {
  if (!newIsConfirming && oldIsConfirming) {
    addSuccessToast('Token deposited successfully')
    fetchUsdcBalance()
    tokenDepositModal.value = false
    tokenAmount.value = ''
  }
})

//#endregion

onMounted(async () => {
  await init()
})
</script>
