<template>
  <div class="overflow-x-auto">
    <table class="table">
      <thead>
        <tr>
          <th v-for="heading in headings" :key="heading">{{ heading }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(row, rowIndex) in roles /*.roles*/" :key="rowIndex" class="hover">
          <th>{{ rowIndex + 1 }}</th>
          <td>{{ row.name }}</td>
          <td>{{ row.description }}</td>
          <td class="flex justify-end">
            <button class="btn btn-primary mr-2" @click="handleClickUpdate(rowIndex)">
              Update
            </button>
            <button class="btn btn-active" @click="handleClickDelete(rowIndex)">Delete</button>
          </td>
        </tr>
      </tbody>
    </table>
  </div>

  <ModalComponent v-model="showModal">
    <AddRoleForm
      v-model="roles /*.roles*/[selectedIndex]"
      :is-single-view="true"
      @close-modal="showModal = !showModal"
      @reload="emits('reload')"
    />
    <!--<RoleContainer
      :role="selectedRole"
      @close-modal="showModal = !showModal"
      @reload="emits('reload')"
    />-->
  </ModalComponent>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import ModalComponent from '@/components/ui/ModalComponent.vue'
//import AddRoleForm from './AddRoleForm.vue'
import AddRoleForm from '@/components/forms/roles/AddRoleForm.vue'
import { useCustomFetch } from '@/composables/useCustomFetch'
import type { Role } from '@/types'

interface TableProps {
  headings: string[]
}
const showModal = ref(false)
const selectedIndex = ref(-1)
const roleEndPoint = ref('')

const {
  execute: deleteRoleAPI /*,
  data: deleteRes*/
} = useCustomFetch(roleEndPoint, {
  immediate: false
})
  .delete()
  .json()

const handleClickUpdate = (rowIndex: number) => {
  selectedIndex.value = rowIndex
  showModal.value = !showModal.value
}

const handleClickDelete = async (rowIndex: number) => {
  selectedIndex.value = rowIndex
  //@ts-ignore
  const id = roles.value[rowIndex].id
  roleEndPoint.value = `role/${id}`
  await deleteRoleAPI()
  emits('reload')
}

const emits = defineEmits(['reload'])

defineProps<TableProps>()

const roles = defineModel<Role[]>({
  default: [
    {
      name: '',
      description: '',
      entitlements: [{ entitlementTypeId: 0, value: '' }]
    }
  ]
})
</script>

<style>
/* Add any additional styles you need */
</style>
