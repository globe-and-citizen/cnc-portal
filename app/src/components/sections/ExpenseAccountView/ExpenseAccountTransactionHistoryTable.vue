<template>
  <div class="card bg-base-100 w-full">
    <div class="flex flex-row justify-between mb-5">
      <span class="text-2xl font-bold">Expense Account Transfer History</span>
      <ButtonUI variant="success" @click="() => {}" data-test="approve-users-button">
        Export
      </ButtonUI>
    </div>
    <TableComponent :rows="dummyData" :columns="columns">
      <template #txHash-data="{ row }">
        <!--<span>{{ row.txHash?.slice(0, 6) }}...{{ row.txHash?.slice(-4) }}</span>-->
        <AddressToolTip :address="row.txHash ?? ''" :slice="true" type="transaction" />
      </template>
      <template #date-data="{ row }">
        {{ row.date }}
      </template>
      <template #type-data="{ row }">
        <span
          class="badge"
          :class="{
            'badge-success': row.type === 'deposit',
            'badge-info': row.type === 'transfer'
          }"
        >
          {{ row.type }}
        </span>
      </template>
      <template #from-data="{ row }">
        <!--<span>{{ row.from?.slice(0, 6) }}...{{ row.from?.slice(-4) }}</span>-->
        <AddressToolTip :address="row.from ?? ''" :slice="true" />
      </template>
      <template #to-data="{ row }">
        <!--<span>{{ row.to?.slice(0, 6) }}...{{ row.to?.slice(-4) }}</span>-->
        <AddressToolTip :address="row.to ?? ''" :slice="true" />
      </template>
      <template #amountUsd-data="{ row }">{{ row.amountUsd }}</template>
      <template #amountCad-data="{ row }">{{ row.amountCad }}</template>
      <template #receipt-data="{ row }">{{ row.receipt }}</template>
    </TableComponent>
  </div>
</template>
<script setup lang="ts">
import TableComponent, { type TableColumn } from '@/components/TableComponent.vue'
import AddressToolTip from '@/components/AddressToolTip.vue'
import ButtonUI from '@/components/ButtonUI.vue'

const dummyData = [
  {
    txHash: '0xfc9fc4e2c32197c0868a96134b027755e5f7eacb88ffdb7c8e70a27f38d5b55e',
    date: new Date().toLocaleDateString(),
    type: 'deposit',
    from: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
    to: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
    amountUsd: 10,
    amountCad: 12,
    receipt: 'Receipt'
  },
  {
    txHash: '0xfc9fc4e2c32197c0868a96134b027755e5f7eacb88ffdb7c8e70a27f38d5b55e',
    date: new Date().toLocaleDateString(),
    type: 'transfer',
    from: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
    to: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
    amountUsd: 10,
    amountCad: 12,
    receipt: 'Receipt'
  },
  {
    txHash: '0xfc9fc4e2c32197c0868a96134b027755e5f7eacb88ffdb7c8e70a27f38d5b55e',
    date: new Date().toLocaleDateString(),
    type: 'transfer',
    from: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
    to: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
    amountUsd: 10,
    amountCad: 12,
    receipt: 'Receipt'
  },
  {
    txHash: '0xfc9fc4e2c32197c0868a96134b027755e5f7eacb88ffdb7c8e70a27f38d5b55e',
    date: new Date().toLocaleDateString(),
    type: 'deposit',
    from: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
    to: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
    amountUsd: 10,
    amountCad: 12,
    receipt: 'Receipt'
  },
  {
    txHash: '0xfc9fc4e2c32197c0868a96134b027755e5f7eacb88ffdb7c8e70a27f38d5b55e',
    date: new Date().toLocaleDateString(),
    type: 'deposit',
    from: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
    to: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
    amountUsd: 10,
    amountCad: 12,
    receipt: 'Receipt'
  }
]

const columns = [
  {
    key: 'txHash',
    label: 'Tx Hash',
    sortable: false
  },
  {
    key: 'date',
    label: 'Date',
    sortable: true
  },
  {
    key: 'type',
    label: 'Type',
    sortable: false
  },
  {
    key: 'from',
    label: 'From',
    sortable: false
  },
  {
    key: 'to',
    label: 'To',
    sortable: false
  },
  {
    key: 'amountUsd',
    label: 'Amount (USD)',
    sortable: false
  },
  {
    key: 'amountCad',
    label: 'Amount (CAD)',
    sortable: false
  },
  {
    key: 'receipt',
    label: 'Receipts',
    sortable: false
  }
] as TableColumn[]
</script>
