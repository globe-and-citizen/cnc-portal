<template>
  <CardComponent>
    <div class="overflow-x-auto flex flex-col gap-4 card bg-white p-6">
      <div class="w-full flex justify-between">
        <span class="font-bold text-lg">Your Pending Dividends</span>
      </div>

      <div class="bg-base-100 w-full">
        <TableComponent :rows="pendingDividends" :columns="columns" :loading="isReadLoading">
          <template #shareholder-data="{ row }">
            <AddressToolTip :address="row.address" />
          </template>

          <template #amount-data="{ row }">
            <span class="font-bold"
              >{{ Number(formatEther(row.amount)).toFixed(6) }} {{ tokenSymbol(zeroAddress) }}</span
            >
          </template>

          <template #action-data>
            <ButtonUI
              variant="primary"
              size="sm"
              data-test="claim-dividend"
              @click="executeClaim"
              :disabled="isWriteLoading"
              :loading="isWriteLoading"
            >
              {{ isWriteLoading ? 'Claiming ' : 'Claim' }}
            </ButtonUI>
          </template>
        </TableComponent>
      </div>
    </div>
  </CardComponent>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { formatEther, type Address, zeroAddress } from 'viem'

import { useToastStore, useUserDataStore } from '@/stores'
import CardComponent from '@/components/CardComponent.vue'
import TableComponent, { type TableColumn } from '@/components/TableComponent.vue'
import ButtonUI from '@/components/ButtonUI.vue'
import AddressToolTip from '@/components/AddressToolTip.vue'
import { log } from '@/utils'
import { useBankContract } from '@/composables/bank'
import { tokenSymbol } from '@/utils'

const { useDividendBalance, claimDividend, isLoading: isWriteLoading } = useBankContract()

const toastStore = useToastStore()
const { address: currentAddress } = useUserDataStore()

// Read contract state
const { data: dividendBalance, isLoading: isReadLoading } = useDividendBalance(
  currentAddress as Address
)

// Table columns
const columns: TableColumn[] = [
  {
    key: 'shareholder',
    label: 'Address',
    sortable: false,
    class: 'text-black text-base'
  },
  {
    key: 'amount',
    label: 'Amount',
    sortable: true,
    class: 'text-black text-base'
  },
  {
    key: 'action',
    label: 'Action',
    sortable: false,
    class: 'text-black text-base'
  }
]

// Format data for table
const pendingDividends = computed(() => {
  if (!currentAddress || !dividendBalance.value) return []

  return [
    {
      address: currentAddress,
      amount: dividendBalance.value as bigint
    }
  ]
})

// Execute claim using write contract
const executeClaim = async () => {
  try {
    await claimDividend()
  } catch (e) {
    log.error('Failed to claim dividend:', e)
    toastStore.addErrorToast('Failed to claim dividend')
  }
}
</script>
