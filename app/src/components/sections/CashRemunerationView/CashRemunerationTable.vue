<template>
  <div class="card bg-base-100 w-full shadow-xl">
    <TableComponent :rows="claims" :columns="columns"></TableComponent>
  </div>
</template>

<script setup lang="ts">
import TableComponent, { type TableColumn } from '@/components/TableComponent.vue'

const claims = [
  {
    id: 1,
    name: 'Lindsay Walton',
    img: 'https://randomuser.me/api/portraits',
    address: '0x1234567890',
    hourlyRate: '10',
    hoursWorked: 10,
    status: 'Pending',
    createdAt: new Date().toLocaleDateString()
  },
  {
    id: 2,
    name: 'Courtney Henry',
    img: 'https://randomuser.me/api/portraits',
    address: '0x1234567890',
    hourlyRate: '10',
    hoursWorked: 10,
    status: 'Approved',
    createdAt: new Date().toLocaleDateString()
  },
  {
    id: 3,
    name: 'Tom Cook',
    img: 'https://randomuser.me/api/portraits',
    address: '0x1234567890',
    hourlyRate: '10',
    hoursWorked: 10,
    status: 'Disabled',
    createdAt: new Date().toLocaleDateString()
  },
  {
    id: 4,
    name: 'Whitney Francis',
    img: 'https://randomuser.me/api/portraits',
    address: '0x1234567890',
    hourlyRate: '10',
    hoursWorked: 10,
    status: 'Pending',
    createdAt: new Date().toLocaleDateString()
  },
  {
    id: 5,
    name: 'Leonard Krasner',
    img: 'https://randomuser.me/api/portraits',
    address: '0x1234567890',
    hourlyRate: '10',
    hoursWorked: 10,
    status: 'Withdrawn',
    createdAt: new Date().toLocaleDateString()
  }
]

const columns = [
  {
    key: 'createdAt',
    label: 'Date',
    sortable: true
  },
  {
    key: 'name',
    label: 'Member',
    sortable: false
  },
  {
    key: 'hoursWorked',
    label: 'Hour',
    sortable: false
  },
  {
    key: 'hourlyRate',
    label: 'Rate',
    sortable: false
  },
  {
    key: 'status',
    label: 'Status'
  },
  {
    key: 'action',
    label: 'Action',
    sortable: false
  }
] as TableColumn[]
</script>
