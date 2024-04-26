<template>
  <div class="card w-full bg-white">
    <div class="card-body flex justify-center items-center">
      <h1 class="card-title">Add Member</h1>

      <div class="w-6 h-6 cursor-pointer" @click="emits('toggleAddMemberModal')">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="lightgreen"
          viewBox="0 0 24 24"
          strokeWidth="{10.5}"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v6m3-3H9m12 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
          />
        </svg>
      </div>
    </div>
  </div>
  <AddMemberModal
    :formData="formData"
    :showAddMemberForm="showAddMemberForm"
    @updateForm="formData = $event"
    @addInput="emits('addInput')"
    @removeInput="emits('removeInput')"
    @addMembers="emits('addMembers')"
    @toggleAddMemberModal="emits('toggleAddMemberModal')"
  />
</template>
<script setup lang="ts">
import { ref, defineProps, defineEmits, watch } from 'vue'
import AddMemberModal from '@/components/AddMemberModal.vue'

const props = defineProps<{
  formData: Array<{ name: string; walletAddress: string; isValid: boolean }>
  showAddMemberForm: boolean
}>()

const emits = defineEmits([
  'updateForm',
  'addInput',
  'removeInput',
  'addMembers',
  'toggleAddMemberModal'
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
