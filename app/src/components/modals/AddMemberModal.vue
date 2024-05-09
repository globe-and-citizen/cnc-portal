<template>
  <dialog
    id="my_modal_10"
    class="modal modal-bottom sm:modal-middle"
    :class="{ 'modal-open': showAddMemberForm }"
  >
    <div class="modal-box">
      <button
        class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
        @click="emits('toggleAddMemberModal')"
      >
        ✕
      </button>
      <h1 class="font-bold text-2xl">Add New Member</h1>
      <hr class="" />
      <div v-for="(input, index) in formData" :key="index" class="input-group mt-3">
        <label
          class="input input-bordered flex items-center gap-2 input-md"
          :class="{ 'input-error': !input.isValid }"
        >
          <input
            type="text"
            class="w-24"
            v-model="input.name"
            :placeholder="'Member Name ' + (index + 1)"
          />
          |
          <input
            type="text"
            class="grow"
            v-model="input.walletAddress"
            :placeholder="'Wallet Address ' + (index + 1)"
          />
          <span class="badge badge-primary">Mandatory</span>
        </label>
      </div>
      <div class="flex justify-end pt-3">
        <div class="w-6 h-6 cursor-pointer" @click="emits('addInput')">
          <IconPlus />
        </div>
        <div class="w-6 h-6 cursor-pointer" @click="emits('removeInput')">
          <IconMinus />
        </div>
      </div>
      <div class="flex justify-center" @click="emits('addMembers')">
        <button class="btn btn-primary justify-center">Add</button>
      </div>
    </div>
  </dialog>
</template>
<script setup lang="ts">
import { ref, watch } from 'vue'
import IconPlus from '@/components/icons/IconPlus.vue'
import IconMinus from '@/components/icons/IconMinus.vue'
const emits = defineEmits([
  'updateForm',
  'addInput',
  'removeInput',
  'addMembers',
  'toggleAddMemberModal'
])
const props = defineProps<{
  formData: Array<{ name: string; walletAddress: string; isValid: boolean }>
  showAddMemberForm: boolean
}>()
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
