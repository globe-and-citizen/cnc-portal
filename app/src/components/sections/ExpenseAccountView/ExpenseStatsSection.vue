<template>
  <div class="flex gap-10">
    <div class="card bg-white w-1/3 shadow-xl">
      <div class="card-body">
        <h2 class="card-title">Balance</h2>
        <div
          class="font-extrabold text-neutral flex gap-2 items-baseline"
          data-test="network-currency-balance"
        >
          <span class="inline-block h-10 text-4xl">
            <span
              class="loading loading-spinner loading-lg"
              v-if="isLoadingNetworkCurrencyBalance"
            ></span>
            <span v-else>{{ formattedNetworkCurrencyBalance }} </span>
          </span>
          <span class="text-xs">{{ NETWORK.currencySymbol }}</span>
        </div>
        <div class="text-lg mt-2" data-test="usdc-balance">
          <div v-if="isLoadingUsdcBalance">
            <span class="loading loading-spinner loading-md"></span>
          </div>
          <div v-else>
            <div>USDC: {{ usdcBalance ? Number(usdcBalance) / 1e6 : '0' }}</div>
          </div>
        </div>
      </div>
    </div>

    <div class="card bg-blue-100 text-blue-800 w-1/3 shadow-xl">
      <div class="card-body">
        <div class="font-extrabold flex gap-2 items-baseline">
          <span class="inline-block h-10 text-4xl">
            <span class="loading loading-spinner loading-lg" v-if="false"></span>
            <span v-else>10 </span>
          </span>
          <span class="text-xs">{{ NETWORK.currencySymbol }}</span>
        </div>
        <h2 class="card-title">Spent this month</h2>
      </div>
    </div>
    <div class="card bg-orange-200 text-orange-800 w-1/3 shadow-xl">
      <div class="card-body">
        <h2 class="card-title">Approved Address</h2>
        <div class="font-extrabold flex gap-2 items-baseline">
          <span class="inline-block h-10 text-4xl">
            <span class="loading loading-spinner loading-lg" v-if="false"></span>
            <span v-else>20 </span>
          </span>
          <span class="text-xs">User</span>
        </div>
      </div>
    </div>
  </div>

  <div class="flex sm:flex-row justify-end sm:items-start gap-4 mb-8">
    <div class="flex flex-wrap gap-2 sm:gap-4" data-test="expense-account-address">
      <span class="text-sm">Expense Account Address </span>
      <AddressToolTip
        :address="teamStore.currentTeam?.expenseAccountEip712Address ?? ''"
        class="text-xs"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import AddressToolTip from '@/components/AddressToolTip.vue'
import { NETWORK, USDC_ADDRESS } from '@/constant'
import { useTeamStore, useExpenseStore } from '@/stores'
import { useBalance, useReadContract, useChainId } from '@wagmi/vue'
import { formatEther, type Address } from 'viem'
import ERC20ABI from '@/artifacts/abi/erc20.json'
import { log, parseError } from '@/utils'

//#region  Composables
const teamStore = useTeamStore()
const chainId = useChainId()
const expenseStore = useExpenseStore()

const {
  data: networkCurrencyBalance,
  isLoading: isLoadingNetworkCurrencyBalance,
  error: networkCurrencyBalanceError,
  refetch: refetchNetworkCurrencyBalance
} = useBalance({
  address: teamStore.currentTeam?.expenseAccountEip712Address as unknown as Address,
  chainId
})

// Token balances
const {
  data: usdcBalance,
  isLoading: isLoadingUsdcBalance,
  refetch: refetchUsdcBalance,
  error: usdcBalanceError
} = useReadContract({
  address: USDC_ADDRESS as Address,
  abi: ERC20ABI,
  functionName: 'balanceOf',
  args: [teamStore.currentTeam?.expenseAccountEip712Address as unknown as Address]
})
//#endregion

//Computed Values
const formattedNetworkCurrencyBalance = computed(() =>
  networkCurrencyBalance.value ? formatEther(networkCurrencyBalance.value.value) : '0'
)

//#region Watch
watch(
  () => expenseStore.reload,
  async (newState) => {
    if (newState) {
      await refetchNetworkCurrencyBalance()
      await refetchUsdcBalance()
    }
  }
)
watch(networkCurrencyBalanceError, (newError) => {
  if (newError) {
    log.error('networkCurrencyBalanceError.value: ', parseError(newError))
  }
})
watch(usdcBalanceError, (newError) => {
  if (newError) {
    log.error('usdcBalanceError.value: ', parseError(newError))
  }
})
//#endregion

onMounted(async () => {
  await refetchNetworkCurrencyBalance()
  await refetchUsdcBalance()
})
</script>
