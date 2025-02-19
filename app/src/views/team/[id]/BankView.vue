<template>
  <div>
    <div>
      <div>
        <BankBalanceSection
          v-if="teamStore.currentTeam"
          ref="bankBalanceSection"
          :bank-address="typedBankAddress"
          @balance-updated="$forceUpdate()"
        />
      </div>

      <TokenHoldingsSection :tokens-with-rank="tokensWithRank" />
      <TransactionsHistorySection />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { NETWORK } from '@/constant'
import { type Address } from 'viem'
import BankBalanceSection from '@/components/sections/BankView/BankBalanceSection.vue'
import TokenHoldingsSection from '@/components/sections/BankView/TokenHoldingsSection.vue'
import TransactionsHistorySection from '@/components/sections/BankView/TransactionsHistorySection.vue'
import { useTeamStore } from '@/stores'

const teamStore = useTeamStore()
const typedBankAddress = computed(() => teamStore.currentTeam?.bankAddress as Address | undefined)

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

const bankBalanceSection = ref()
</script>
