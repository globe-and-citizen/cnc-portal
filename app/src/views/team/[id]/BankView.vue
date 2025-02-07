<template>
  <div class="min-h-screen bg-base-100">
    <!-- Main Content -->
    <div class="p-6">
      <!-- Header Section -->
      <div class="mb-8">
        <div class="flex items-center gap-2 text-sm text-gray-600 mb-4">
          <span>CNC Team</span>
          <span>•</span>
          <span>Bank Account</span>
        </div>

        <div class="flex justify-between items-start mb-6">
          <div>
            <h2 class="text-lg font-medium mb-1">Balance</h2>
            <div class="flex items-baseline gap-2">
              <span class="text-4xl font-bold">1260</span>
              <span class="text-gray-600">USDT</span>
            </div>
            <div class="text-sm text-gray-500 mt-1">≈ 1250 CAD</div>
          </div>
          <div class="flex gap-2">
            <ButtonUI variant="secondary">Deposit</ButtonUI>
            <ButtonUI variant="secondary">Transfer</ButtonUI>
            <ButtonUI variant="secondary">Send To Members</ButtonUI>
          </div>
        </div>

        <div class="text-sm text-gray-600">
          Contract Address:
          <span class="font-mono">0x70997970C51812dc3A010C7d01b50e0d17dc79C8</span>
        </div>
      </div>

      <!-- Token Holdings -->
      <div class="mb-8">
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
              <img :src="row.icon" class="w-6 h-6 rounded-full" :alt="row.name" />
              <div>
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

      <!-- Transactions History -->
      <div>
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
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                />
              </svg>
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
          <template #receipts-data>
            <a href="#" class="text-primary hover:underline">Receipt</a>
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
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { svgs } from '@web3icons/core'

import TableComponent from '@/components/TableComponent.vue'
import ButtonUI from '@/components/ButtonUI.vue'

interface Token {
  name: string
  network: string
  icon: string
  price: number
  balance: number
  amount: number
}

interface TokenWithRank extends Token {
  rank: number
}

const tokens = ref<Token[]>([
  {
    name: 'Pol',
    network: 'Polygon',
    icon: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/master_CNC_Portal_17_feb_2024-u8KQr8bjr72u5KatKqAYvxJNlJMaTf.png',
    price: 10,
    balance: 40,
    amount: 4
  },
  {
    name: 'USDT',
    network: 'USDT',
    icon: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/master_CNC_Portal_17_feb_2024-u8KQr8bjr72u5KatKqAYvxJNlJMaTf.png',
    price: 10,
    balance: 40,
    amount: 4
  },
  {
    name: 'USDC',
    network: 'USDC',
    icon: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/master_CNC_Portal_17_feb_2024-u8KQr8bjr72u5KatKqAYvxJNlJMaTf.png',
    price: 10,
    balance: 40,
    amount: 4
  }
])

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
    amountCAD: 12
  }
  // Add more transaction data as needed
])
</script>

<style>
:root {
  --primary: #4046dd;
  --success: #00ab55;
}

.btn-primary {
  background-color: var(--primary);
  border-color: var(--primary);
}

.btn-success {
  background-color: var(--success);
  border-color: var(--success);
}

.badge-success {
  background-color: var(--success);
}
</style>
