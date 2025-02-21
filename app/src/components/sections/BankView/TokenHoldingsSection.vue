<!-- TokenHoldingsSection.vue -->
<template>
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
          <div class="flex items-center gap-2">
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
        <template #price-data="{ row }"> ${{ row.price }} </template>
        <template #balance-data="{ row }"> ${{ row.balance }} </template>
      </TableComponent>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import TableComponent from '@/components/TableComponent.vue'
import { NETWORK } from '@/constant'
import EthereumIcon from '@/assets/Ethereum.png'
import USDCIcon from '@/assets/usdc.png'

interface Token {
  name: string
  network: string
  price: number // Price in USD
  balance: number // Balance in token's native unit
  amount: number // Amount in token's native unit
  icon: string
}

interface TokenWithRank extends Token {
  rank: number
}

interface BankBalanceSection {
  teamBalance?: {
    formatted?: string
  }
  formattedUsdcBalance?: string
}

const props = defineProps<{
  bankBalanceSection: BankBalanceSection
}>()

const tokens = computed(() => [
  {
    name: NETWORK.currencySymbol,
    network: NETWORK.currencySymbol,
    price: 0, // TODO: Add price fetching
    balance: props.bankBalanceSection?.teamBalance?.formatted
      ? Number(props.bankBalanceSection.teamBalance.formatted)
      : 0,
    amount: props.bankBalanceSection?.teamBalance?.formatted
      ? Number(props.bankBalanceSection.teamBalance.formatted)
      : 0,
    icon: EthereumIcon
  },
  {
    name: 'USDC',
    network: 'USDC',
    price: 1,
    balance: props.bankBalanceSection?.formattedUsdcBalance
      ? Number(props.bankBalanceSection.formattedUsdcBalance)
      : 0,
    amount: props.bankBalanceSection?.formattedUsdcBalance
      ? Number(props.bankBalanceSection.formattedUsdcBalance)
      : 0,
    icon: USDCIcon
  }
])

const tokensWithRank = computed<TokenWithRank[]>(() =>
  tokens.value.map((token, index) => ({
    ...token,
    rank: index + 1
  }))
)
</script>
