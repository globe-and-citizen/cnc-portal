<!-- TokenHoldingsSection.vue -->
<template>
  <CardComponent title="Token Holding">
    <TableComponent
      :rows="tokensWithRank"
      :loading="
        currencyStore.usdc.isLoading ||
        isLoadingNetworkCuerrencyBalance ||
        isLoadingUsdcBalance ||
        currencyStore.nativeToken.isLoading
      "
      :columns="[
        { key: 'rank', label: 'RANK' },
        { key: 'token', label: 'Token', sortable: true, class: 'min-w-32' },
        { key: 'amount', label: 'Amount', sortable: true, class: 'min-w-32' },
        { key: 'price', label: 'Coin Price', sortable: true, class: 'min-w-40' },
        { key: 'balance', label: 'Balance', sortable: true, class: 'min-w-32' }
      ]"
    >
      <template #token-data="{ row }">
        <div class="flex items-center gap-2 lg:w-48">
          <img :src="row.icon" :alt="row.name" class="w-8 h-8 rounded-full" />
          <div class="flex flex-col">
            <div class="font-medium">{{ row.name }}</div>
            <div class="text-sm text-gray-500">{{ row.network }}</div>
          </div>
        </div>
      </template>
      <template #rank-data="{ row }">
        {{ row.rank }}
      </template>
      <template #amount-data="{ row }"> {{ row.amount }} {{ row.network }} </template>
      <template #price-data="{ row }"> {{ row.price }} / {{ row.network }} </template>
      <template #balance-data="{ row }">
        {{ row.balance }}
      </template>
    </TableComponent>
  </CardComponent>
</template>

<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import TableComponent from '@/components/TableComponent.vue'
import CardComponent from '@/components/CardComponent.vue'
import { NETWORK, USDC_ADDRESS } from '@/constant'
import EthereumIcon from '@/assets/Ethereum.png'
import USDCIcon from '@/assets/usdc.png'
import MaticIcon from '@/assets/matic-logo.png'
import { log, parseError } from '@/utils'
import { useBalance, useChainId, useReadContract } from '@wagmi/vue'
import { formatEther, type Address } from 'viem'
import ERC20ABI from '@/artifacts/abi/erc20.json'
import { useCurrencyStore } from '@/stores/currencyStore'

const props = defineProps<{
  address: string
}>()

const currencyStore = useCurrencyStore()

const chainId = useChainId()

const {
  data: networkCurrencyBalance,
  isLoading: isLoadingNetworkCuerrencyBalance,
  error: networkCurrencyBalanceError,
  refetch: refetchNetworkCurrencyBalance
} = useBalance({
  address: props.address as unknown as Address,
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
  args: [props.address as unknown as Address]
})

// Computed properties for prices
const networkCurrencyPrice = computed(() => {
  return currencyStore.nativeToken.priceInLocal || 1
})
const usdcPrice = computed(() => {
  return currencyStore.usdc.priceInLocal || 1
})

const networkIcon = computed(() => {
  if (Number(NETWORK.chainId) === 137) return MaticIcon
  return EthereumIcon
})
const tokens = computed(() => [
  {
    name: NETWORK.currencySymbol,
    network: NETWORK.currencySymbol,
    price: Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyStore.localCurrency.code
    }).format(networkCurrencyPrice.value),
    balance: Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyStore.localCurrency.code
    }).format(Number(formattedNetworkCurrencyBalance.value) * networkCurrencyPrice.value),
    amount: Intl.NumberFormat('en-US', {
      style: 'decimal',
      minimumFractionDigits: 3,
      maximumFractionDigits: 3
    }).format(Number(formattedNetworkCurrencyBalance.value)),
    icon: networkIcon.value
  },
  {
    name: 'USDC',
    network: 'USDC',
    price: Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyStore.localCurrency.code
    }).format(usdcPrice.value || 0),
    balance: Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyStore.localCurrency.code
    }).format(Number(formattedUsdcBalance.value) * (usdcPrice.value || 0)),
    amount: Intl.NumberFormat('en-US', {
      style: 'decimal',
      minimumFractionDigits: 3,
      maximumFractionDigits: 3
    }).format(Number(formattedUsdcBalance.value)),
    icon: USDCIcon
  }
])

const formattedNetworkCurrencyBalance = computed(() =>
  networkCurrencyBalance.value?.value ? formatEther(networkCurrencyBalance.value.value) : `0`
)

const formattedUsdcBalance = computed(() =>
  usdcBalance.value ? Number(usdcBalance.value) / 1e6 : `0`
)

const tokensWithRank = computed(() =>
  tokens.value.map((token, index) => ({
    ...token,
    price: token.price || 1,
    balance: token.balance,
    amount: token.amount,
    rank: index + 1
  }))
)

watch(networkCurrencyBalanceError, (newError) => {
  if (newError) {
    log.error('networkCurrencyBalanceError.value', parseError(newError))
  }
})

watch(usdcBalanceError, (newError) => {
  if (newError) {
    log.error('usdcBalanceError.value', parseError(newError))
  }
})

onMounted(async () => {
  await refetchNetworkCurrencyBalance()
  await refetchUsdcBalance()
})
</script>
