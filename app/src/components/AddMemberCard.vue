<template>
  <div class="card w-full bg-base-100">
    <div class="card-body flex justify-center items-center">
      <h1 class="card-title">Add Member</h1>

      <div class="w-6 h-6 cursor-pointer" @click="emits('toggleAddMemberModal')">
        <IconPlus />
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
import { ref, defineProps, watch } from 'vue'
import AddMemberModal from '@/components/modals/AddMemberModal.vue'
import IconPlus from '@/components/icons/IconPlus.vue'

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
