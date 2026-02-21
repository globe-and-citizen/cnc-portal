<template>
  <CardComponent title="Your Pending Dividends">
    <div class="overflow-x-auto flex flex-col gap-4 card bg-white p-6">
      <TableComponent :rows="tableRows" :columns="columns" :loading="isLoading">
        <template #token-data="{ row }">
          <div class="flex items-center gap-2">
            <img v-if="row.icon" :src="row.icon" :alt="row.name" class="w-8 h-8 rounded-full" />
            <div v-else class="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
              <span class="text-gray-500">{{ row.name.charAt(0) }}</span>
            </div>
            <div class="flex flex-col">
              <div class="font-medium">{{ row.name }}</div>
              <div class="text-sm text-gray-500">{{ row.symbol }}</div>
            </div>
          </div>
        </template>

        <template #balance-data="{ row }">
          <span class="font-bold">{{ row.formattedBalance }}</span>
        </template>

        <template #action-data="{ row }">
          <ButtonUI
            variant="primary"
            size="sm"
            data-test="claim-dividend"
            :disabled="
              row.balance === '0' || (isWriteLoading && currentClaimingToken === row.tokenAddress)
            "
            :loading="isWriteLoading && currentClaimingToken === row.tokenAddress"
            @click="() => executeClaim(row.tokenAddress, row.isNative)"
          >
            {{ isWriteLoading && currentClaimingToken === row.tokenAddress ? 'Claiming' : 'Claim' }}
          </ButtonUI>
        </template>
      </TableComponent>
    </div>
  </CardComponent>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { zeroAddress, type Address, formatUnits } from 'viem'
import CardComponent from '@/components/CardComponent.vue'
import EthereumIcon from '@/assets/Ethereum.png'
import USDCIcon from '@/assets/usdc.png'
import MaticIcon from '@/assets/matic-logo.png'
import TableComponent, { type TableColumn } from '@/components/TableComponent.vue'
import ButtonUI from '@/components/ButtonUI.vue'
import { useToastStore, useUserDataStore } from '@/stores'
import { useBankContract, useGetDividendBalances } from '@/composables/bank'

const toast = useToastStore()
const { address: currentAddress } = useUserDataStore()

// Fetch dividend balances using the new composable
const { data, isLoading, refetch } = useGetDividendBalances(currentAddress as Address)
const { claimDividend, claimTokenDividend, isLoading: isWriteLoading } = useBankContract()

const columns: TableColumn[] = [
  { key: 'token', label: 'Token', sortable: true, class: 'text-black text-base' },
  { key: 'balance', label: 'Dividend Balance', sortable: true, class: 'text-black text-base' },
  { key: 'action', label: 'Action', sortable: false, class: 'text-black text-base' }
]

// Get token icon based on symbol
const getTokenIcon = (symbol: string) => {
  if (symbol === 'USDC' || symbol === 'USDCe') return USDCIcon
  if (symbol === 'POL') return MaticIcon
  if (symbol === 'ETH') return EthereumIcon
  return null
}

// Transform data into table rows
const tableRows = computed(() => {
  if (!data.value) return []

  return data.value
    .filter((item) => item.balance > 0n) // Only show tokens with balance
    .map((item) => ({
      tokenAddress: item.token.address,
      name: item.token.name,
      symbol: item.token.symbol,
      balance: item.balance.toString(),
      formattedBalance: `${formatUnits(item.balance, item.token.decimals)} ${item.token.symbol}`,
      decimals: item.token.decimals,
      icon: getTokenIcon(item.token.symbol),
      isNative: item.token.address === zeroAddress,
      error: item.error
    }))
})

const currentClaimingToken = ref<Address | null>(null)

const executeClaim = async (tokenAddr: Address, isNative: boolean) => {
  currentClaimingToken.value = tokenAddr
  try {
    if (isNative) {
      await claimDividend()
    } else {
      await claimTokenDividend(tokenAddr)
    }
    toast.addSuccessToast('Dividend claimed successfully')
    // Refetch balances after successful claim
    await refetch()
  } catch (err) {
    toast.addErrorToast('Failed to claim dividend')
    console.error('Claim error:', err)
  } finally {
    currentClaimingToken.value = null
  }
}
</script>
