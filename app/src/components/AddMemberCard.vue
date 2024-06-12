<template>
  <div class="card w-44 h-4 bg-base-100 flex flex-row justify-center items-center">
    <span
      class="w-4 h-4 cursor-pointer flex justify-center items-center"
      @click="emits('toggleAddMemberModal')"
    >
      <IconPlus />
    </span>
    <span class="flex justify-center items-center">Add Member</span>
  </div>
  <AddMemberModal
    :users="users"
    :formData="formData"
    :showAddMemberForm="showAddMemberForm"
    @searchUsers="(input) => emits('searchUsers', input)"
    @updateForm="formData = $event"
    @addInput="emits('addInput')"
    @removeInput="emits('removeInput')"
    @addMembers="emits('addMembers')"
    @toggleAddMemberModal="emits('toggleAddMemberModal')"
  />
</template>
<script setup lang="ts">
import { ref, defineProps, watch } from 'vue'
import type { User } from '@/types'
import AddMemberModal from '@/components/modals/AddMemberModal.vue'
import IconPlus from '@/components/icons/IconPlus.vue'

const props = defineProps<{
  formData: Array<{ name: string; address: string; isValid: boolean }>
  showAddMemberForm: boolean
  users: User[]
}>()

const emits = defineEmits([
  'updateForm',
  'addInput',
  'removeInput',
  'addMembers',
  'toggleAddMemberModal',
  'searchUsers'
])

const formData = ref(props.formData)

const showAddMemberForm = ref<boolean>(props.showAddMemberForm)
watch(
  [() => props.showAddMemberForm, formData],
  ([newShowAddMemberForm, newFormData]) => {
    emits('updateForm', newFormData)
    showAddMemberForm.value = newShowAddMemberForm
  },
  { deep: true }
)
</script>
