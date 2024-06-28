<template>
  <div class="flex flex-col gap-5 mt-4">
    <label class="input input-bordered flex items-center gap-2 input-md">
      <span class="w-24">Name</span>
      <input type="text" class="grow" placeholder="John Doe" v-model="user.name" />
    </label>
    <label class="input input-bordered flex items-center gap-2 input-md input-disabled">
      <span class="w-24">Wallet Address</span>
      <input
        type="text"
        class="grow"
        placeholder="Enter wallet address"
        :value="user.address"
        readonly
      />
    </label>
  </div>
  <div class="modal-action justify-center">
    <LoadingButton v-if="isLoading" color="primary min-w-24" />
    <button v-else class="btn btn-primary" @click="emits('submitEditUser')">Save</button>
  </div>
</template>

<script setup lang="ts">
import LoadingButton from '../LoadingButton.vue'
const user = defineModel({
  default: {
    name: '',
    address: ''
  }
})

defineProps<{
  isLoading: boolean
}>()
const emits = defineEmits(['submitEditUser'])
</script>

<style scoped></style>
