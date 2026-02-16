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
  <div class="">
    <h1 data-test="title" class="text-2xl font-bold">Welcome To the CNC portal</h1>
    <p>Our Website is still in construction. Please play with the features available.</p>
  </div>
</template>
