<template>
  <div class="overflow-x-auto">
    <table class="table">
      <thead>
        <tr>
          <th v-for="heading in headings" :key="heading">{{ heading }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(row, rowIndex) in data.roles" :key="rowIndex" class="hover">
          <th>{{ rowIndex + 1 }}</th>
          <td>{{ row.name }}</td>
          <td>{{ row.description }}</td>
          <td class="flex justify-end">
            <button class="btn btn-primary mr-2" @click="handleClick(rowIndex)">
              View Details
            </button>
          </td>
        </tr>
      </tbody>
    </table>
  </div>

  <ModalComponent v-model="showModal">
    <AddRoleForm
      v-model="data.roles[selectedIndex]"
      :is-single-view="true"
      @close-modal="showModal = !showModal"
    />
  </ModalComponent>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import ModalComponent from '@/components/ModalComponent.vue'
import AddRoleForm from './AddRoleForm.vue'

interface TableProps {
  headings: string[]
}
const showModal = ref(false)
const selectedIndex = ref(-1)

const handleClick = (rowIndex: number) => {
  selectedIndex.value = rowIndex
  showModal.value = !showModal.value
}

defineProps<TableProps>()
const data = defineModel({
  default: {
    roles: [
      {
        name: '',
        description: '',
        entitlements: [{ type: '', rule: '' }]
      }
    ]
  }
})
</script>

<style>
/* Add any additional styles you need */
</style>
