<template>
  <UCard>
    <template #header>
      <h3 class="text-lg font-semibold">Your Pending Dividends</h3>
    </template>

    <div class="flex flex-col gap-4">
      <!-- Loading State -->
      <div v-if="isLoading" class="flex justify-center py-8">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>

      <!-- Empty State -->
      <UAlert
        v-else-if="!tableRows.length"
        color="neutral"
        variant="soft"
        icon="i-heroicons-information-circle"
        title="No pending dividends"
        description="You don't have any pending dividends at this time."
      />

      <!-- Table -->
      <UTable v-else :data="tableRows" :columns="columns">
        <template #token-cell="{ row }">
          <div class="flex items-center gap-3">
            <img
              v-if="row.original.icon"
              :src="row.original.icon"
              :alt="row.original.name"
              class="w-8 h-8 rounded-full"
            />
            <div v-else class="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
              <span class="text-gray-500 font-medium">{{ row.original.name.charAt(0) }}</span>
            </div>
            <div class="flex flex-col">
              <span class="font-medium">{{ row.original.name }}</span>
              <span class="text-sm text-gray-500">{{ row.original.symbol }}</span>
            </div>
          </div>
        </template>

        <template #balance-cell="{ row }">
          <span class="font-semibold">{{ row.original.formattedBalance }}</span>
        </template>

        <template #action-cell="{ row }">
          <UButton
            color="primary"
            size="sm"
            data-test="claim-dividend"
            :disabled="
              row.original.balance === '0' ||
              (isWriteLoading && currentClaimingToken === row.original.tokenAddress)
            "
            :loading="isWriteLoading && currentClaimingToken === row.original.tokenAddress"
            @click="() => executeClaim(row.original.tokenAddress, row.original.isNative)"
          >
            {{
              isWriteLoading && currentClaimingToken === row.original.tokenAddress
                ? 'Claiming'
                : 'Claim'
            }}
          </UButton>
        </template>
      </UTable>
    </div>
  </UCard>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { zeroAddress, type Address, formatUnits } from 'viem'
import type { TableColumn } from '@nuxt/ui'
import EthereumIcon from '@/assets/Ethereum.png'
import USDCIcon from '@/assets/usdc.png'
import MaticIcon from '@/assets/matic-logo.png'
import { useToastStore, useUserDataStore } from '@/stores'
import { useBankContract, useGetDividendBalances } from '@/composables/bank'

// Define row type for better TypeScript support
interface DividendRow {
  tokenAddress: Address
  name: string
  symbol: string
  balance: string
  formattedBalance: string
  decimals: number
  icon: string | null
  isNative: boolean
  error: Error | null
}

const toast = useToastStore()
const { address: currentAddress } = useUserDataStore()

// Fetch dividend balances using the new composable
const { data, isLoading, refetch } = useGetDividendBalances(currentAddress as Address)
const { claimDividend, claimTokenDividend, isLoading: isWriteLoading } = useBankContract()

const columns: TableColumn<DividendRow>[] = [
  { accessorKey: 'name', header: 'Token', id: 'token' },
  { accessorKey: 'formattedBalance', header: 'Dividend Balance', id: 'balance' },
  { id: 'action', header: 'Action' }
]

// Get token icon based on symbol
const getTokenIcon = (symbol: string) => {
  if (symbol === 'USDC' || symbol === 'USDCe') return USDCIcon
  if (symbol === 'POL') return MaticIcon
  if (symbol === 'ETH') return EthereumIcon
  return null
}

// Transform data into table rows
const tableRows = computed<DividendRow[]>(() => {
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
