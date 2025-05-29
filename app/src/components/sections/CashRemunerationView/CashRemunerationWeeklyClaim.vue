<template>
  <CardComponent title="Weekly Claim" class="w-full pb-7">
    <WeeklyClaimComponent> 
     <TableComponent
        :rows="teamClaimData ?? undefined"
        :columns="columns"
        :loading="isTeamClaimDataFetching"
      >
        <template v-for="col in columns" #[`${col.key}-data`]="{ row }" :key="col.key">
          <span>
            {{ row[col.key] }}
          </span>
        </template>
      </TableComponent>
    </WeeklyClaimComponent>
  </CardComponent>
</template>

<script setup lang="ts">
import CardComponent from '@/components/CardComponent.vue'
import WeeklyClaimComponent from '@/components/WeeklyClaimComponent.vue'
import TableComponent, { type TableColumn, type TableRow } from '@/components/TableComponent.vue'

// Table columns configuration
const columns = [
  {
    key: 'createdAt',
    label: 'Date',
    sortable: true,
    class: 'text-black text-base'
  },
  {
    key: 'member',
    label: 'Member',
    sortable: false,
    class: 'text-black text-base'
  },
  {
    key: 'hoursWorked',
    label: 'Hour Worked',
    sortable: false,
    class: 'text-black text-base'
  },
  {
    key: 'hourlyRate',
    label: 'Hourly Rate',
    sortable: false,
    class: 'text-black text-base'
  },
  {
    key: 'status',
    label: 'Status',
    sortable: false,
    class: 'text-black text-base'
  },
  {
    key: 'action',
    label: 'Action',
    sortable: false,
    class: 'text-black text-base'
  }
] as TableColumn[]
</script>
