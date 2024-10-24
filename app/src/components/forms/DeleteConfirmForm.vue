<template>
  <h3 class="font-bold text-lg">Confirmation</h3>
  <hr class="" />
  <p class="py-4">
    <slot></slot>
  </p>
  <div class="modal-action justify-center">
    <LoadingButton v-if="isLoading" color="error min-w-24 " />
    <button v-else class="btn btn-error" @click="emit('deleteItem')">Delete</button>
    <button class="btn btn-primary" @click="emit('toggleDeleteConfirmModal')">Cancel</button>
  </div>
</template>

<script setup lang="ts">
// TODO : delete this compoent and improve the modale component
import LoadingButton from '../LoadingButton.vue'

const emit = defineEmits(['toggleDeleteConfirmModal', 'deleteItem'])
defineProps<{
  isLoading: boolean
}>()
</script>
