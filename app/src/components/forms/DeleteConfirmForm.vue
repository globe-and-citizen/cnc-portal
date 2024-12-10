<template>
  <h3 class="font-bold text-lg">Confirmation</h3>
  <hr class="" />
  <p class="py-4">
    <slot></slot>
  </p>
  <div class="modal-action justify-center">
    <ButtonUI variant="error" @click="emit('deleteItem')" :loading="isLoading" :disabled="isLoading">Delete</ButtonUI>
    <ButtonUI variant="primary" outline @click="emit('toggleDeleteConfirmModal')">Cancel</ButtonUI>
  </div>
</template>

<script setup lang="ts">
// TODO : delete this compoent and improve the modale component
import ButtonUI from '../ButtonUI.vue';

const emit = defineEmits(['toggleDeleteConfirmModal', 'deleteItem'])
defineProps<{
  isLoading: boolean
}>()
</script>
