<template>
  <CardComponent>
    <div class="overflow-x-auto flex flex-col gap-4 card bg-white p-6">
      <div class="w-full flex justify-between">
        <span class="font-bold text-lg">Your Pending Dividends</span>
      </div>

      <!-- headless fetchers (one per discovered token) -->
      <div class="hidden">
        <TokenDividendAmountFetcher
          v-for="t in discoveredTokens"
          :key="t.tokenAddress + '-' + (currentAddress || '')"
          :token-address="t.tokenAddress"
          :shareholder="currentAddress as Address"
          @update="onAmountUpdate"
        />
      </div>

      <div class="bg-base-100 w-full">
        <TableComponent :rows="filteredRows" :columns="columns" :loading="isBalancesLoading">
          <template #shareholder-data="{ row }">
            <AddressToolTip :address="row.address" />
          </template>

          <template #token-data="{ row }">
            <span>{{ row.tokenSymbol }}</span>
          </template>

          <template #amount-data="{ row }">
            <span class="font-bold">
              {{ formattedAmount(row.tokenAddress, row.decimals) }} {{ row.tokenSymbol }}
            </span>
          </template>

          <template #action-data="{ row }">
            <ButtonUI
              variant="primary"
              size="sm"
              data-test="claim-dividend"
              @click="() => executeClaim(row.tokenAddress)"
              :disabled="isWriteLoading && currentClaimingToken === row.tokenAddress"
              :loading="isWriteLoading && currentClaimingToken === row.tokenAddress"
            >
              {{
                isWriteLoading && currentClaimingToken === row.tokenAddress ? 'Claiming' : 'Claim'
              }}
            </ButtonUI>
          </template>
        </TableComponent>
      </div>
    </div>
  </CardComponent>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { zeroAddress, type Address, formatUnits } from 'viem'
import CardComponent from '@/components/CardComponent.vue'
import TableComponent, { type TableColumn } from '@/components/TableComponent.vue'
import ButtonUI from '@/components/ButtonUI.vue'
import AddressToolTip from '@/components/AddressToolTip.vue'
import TokenDividendAmountFetcher from '@/components/sections/SherTokenView/TokenDividendAmountFetcher.vue'
import { useToastStore, useUserDataStore, useTeamStore } from '@/stores'
import { useContractBalance } from '@/composables/useContractBalance'
import { useBankContract } from '@/composables/bank'
import { tokenSymbol } from '@/utils'

const toast = useToastStore()
const { address: currentAddress } = useUserDataStore()
const teamStore = useTeamStore()

const bankAddress = teamStore.getContractAddressByType('Bank') as Address | undefined
const { balances, isLoading: isBalancesLoading } = useContractBalance(bankAddress as Address)

const { claimDividend, claimTokenDividend, isLoading: isWriteLoading } = useBankContract()

const columns: TableColumn[] = [
  { key: 'shareholder', label: 'Address', sortable: false, class: 'text-black text-base' },
  { key: 'token', label: 'Token', sortable: true, class: 'text-black text-base' },
  { key: 'amount', label: 'Amount', sortable: true, class: 'text-black text-base' },
  { key: 'action', label: 'Action', sortable: false, class: 'text-black text-base' }
]

// Discover tokens (native + ERC20) from bank balances
const discoveredTokens = computed(() =>
  balances.value
    .filter((b) => b.token && b.token.symbol) // guard
    .map((b) => ({
      tokenAddress: b.token.id === 'native' ? zeroAddress : (b.token.address as Address),
      tokenSymbol: b.token.symbol ?? tokenSymbol(b.token.address as Address),
      decimals: b.token.decimals ?? 18
    }))
)

// Aggregated per-token user pending dividend (emitted by fetchers)
const amounts = ref<Record<string, bigint>>({})

const onAmountUpdate = ({ tokenAddress, amount }: { tokenAddress: Address; amount: bigint }) => {
  amounts.value[tokenAddress.toLowerCase()] = amount
}

type Row = {
  address: string
  tokenAddress: Address
  tokenSymbol: string
  decimals: number
}

// Only rows with amount > 0n
const filteredRows = computed<Row[]>(() => {
  if (!currentAddress) return []
  return discoveredTokens.value
    .filter((t) => (amounts.value[t.tokenAddress.toLowerCase()] ?? 0n) > 0n)
    .map((t) => ({
      address: currentAddress as string,
      tokenAddress: t.tokenAddress,
      tokenSymbol: t.tokenSymbol,
      decimals: t.decimals
    }))
})

const currentClaimingToken = ref<Address | null>(null)

const formattedAmount = (tokenAddr: Address, decimals: number) => {
  const amt = amounts.value[tokenAddr.toLowerCase()] ?? 0n
  return formatUnits(amt, decimals)
}

const executeClaim = async (tokenAddr: Address) => {
  currentClaimingToken.value = tokenAddr
  try {
    if (tokenAddr === zeroAddress) await claimDividend()
    else await claimTokenDividend(tokenAddr)
    toast.addSuccessToast('Claim successful')
  } catch {
    toast.addErrorToast('Failed to claim dividend')
  } finally {
    currentClaimingToken.value = null
  }
}
</script>
