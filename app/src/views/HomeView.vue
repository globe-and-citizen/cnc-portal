<script setup lang="ts">
import ButtonUI from '@/components/ButtonUI.vue'
import TableComponent from '@/components/TableComponent.vue'

const people = [
  {
    id: 1,
    name: 'Lindsay Walton',
    title: 'Front-end Developer',
    email: 'lindsay.walton@example.com',
    role: 'Member'
  },
  {
    id: 2,
    name: 'Courtney Henry',
    title: 'Designer',
    email: 'courtney.henry@example.com',
    role: 'Admin'
  },
  {
    id: 3,
    name: 'Tom Cook',
    title: 'Director of Product',
    email: 'tom.cook@example.com',
    role: 'Member'
  },
  {
    id: 4,
    name: 'Whitney Francis',
    title: 'Copywriter',
    email: 'whitney.francis@example.com',
    role: 'Admin'
  },
  {
    id: 5,
    name: 'Leonard Krasner',
    title: 'Senior Designer',
    email: 'leonard.krasner@example.com',
    role: 'Owner'
  },
  {
    id: 6,
    name: 'Floyd Miles',
    title: 'Principal Designer',
    email: 'floyd.miles@example.com',
    role: 'Member'
  }
]

const columns = [
  {
    key: 'id',
    label: 'ID',
    sortable: true
  },
  {
    key: 'name',
    label: 'User name',
    selected: true,
    sortable: true
  },
  {
    key: 'title',
    label: 'Job position'
  },
  {
    key: 'email',
    label: 'Email'
  },
  {
    key: 'role'
  },
  {
    key: 'action',
    label: 'Action'
  }
]
</script>

<template>
  <div class="p-5 bg-base-200 flex gap-4 flex-col">
    <h1 data-test="title">Welcome To the CNC portal</h1>
    <p>
      Our Website is still in construction. Look into our wonderfull tip feature and try to tip your
      team
    </p>
    <div class="card bg-white p-8">
      <div class="card-body">
        <h2 class="card-title">Empty Table</h2>
      </div>
      <TableComponent> </TableComponent>
    </div>
    <div class="card bg-white p-8">
      <div class="card-body">
        <h2 class="card-title">Table With data</h2>
      </div>
      <TableComponent :rows="people" :columns="columns">
        <template #title-header="{ column }">
          <span>Custom label: {{ column.label }}</span>
        </template>
        <template #action-data="{ column }">
          <span>Custom data: {{ column.label }}</span>
        </template>
      </TableComponent>
    </div>
    <ButtonUI class="mt-6" variant="secondary" data-test="tip-button">
      <RouterLink to="/teams" data-test="tip-button">Tip your Team</RouterLink>
    </ButtonUI>
  </div>
</template>
