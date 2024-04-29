<template>
  <dialog
    id="my_modal_5"
    class="modal modal-bottom sm:modal-middle"
    :class="{ 'modal-open': showEditUserModal }"
  >
    <div class="modal-box">
      <button
        class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
        @click="emits('toggleEditUserModal')"
      >
        ✕
      </button>

      <h1 class="font-bold text-2xl">User</h1>
      <hr class="" />
      <div class="flex flex-col gap-5">
        <label class="input input-bordered flex items-center gap-2 input-md mt-4">
          <span class="w-24">Name</span>
          <input type="text" class="grow" placeholder="John Doe" v-model="updateUserInput.name" />
        </label>
        <label
          class="input input-bordered flex items-center gap-2 input-md"
          :class="{ 'input-error': !updateUserInput.isValid }"
        >
          <span class="w-24">Wallet Address</span>
          <input
            type="text"
            class="grow"
            placeholder="Enter wallet address"
            v-model="updateUserInput.walletAddress"
          />
        </label>
      </div>
      <div class="modal-action justify-center">
        <button class="btn btn-primary" @click="emits('updateUser')">Save</button>
      </div>
    </div>
  </dialog>
</template>

<script setup lang="ts">
import { ref, defineProps, defineEmits, watch } from 'vue'

const emits = defineEmits(['updateUser', 'toggleEditUserModal'])
const props = defineProps<{
  showEditUserModal: boolean
  updateUserInput: { name: string; walletAddress: string; isValid: boolean }
}>()
const updateUserInput = ref(props.updateUserInput)

const showEditUserModal = ref<boolean>(props.showEditUserModal)
watch(
  [() => props.showEditUserModal, () => props.updateUserInput, updateUserInput],
  ([showForm, updateUserInputNew]) => {
    showEditUserModal.value = showForm
    updateUserInput.value = updateUserInputNew
  },
  { deep: true }
)

// Watch for changes in the props
</script>
