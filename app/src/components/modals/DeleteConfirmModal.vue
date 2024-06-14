<template>
  <dialog id="my_modal_2" class="modal" :class="{ 'modal-open': showDeleteConfirmModal }">
    <div class="modal-box">
      <form method="dialog">
        <button
          class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
          @click="emit('toggleDeleteConfirmModal')"
        >
          ✕
        </button>
      </form>
      <h3 class="font-bold text-lg">Confirmation</h3>
      <hr class="" />
      <p class="py-4">
        <slot></slot>
      </p>
      <div class="modal-action justify-center">
        <button class="btn btn-error" @click="emit('deleteItem')">Delete</button>
        <button class="btn btn-primary" @click="emit('toggleDeleteConfirmModal')">Cancel</button>
      </div>
    </div>
  </dialog>
</template>

<script setup lang="ts">
const emit = defineEmits(['toggleDeleteConfirmModal', 'deleteItem'])
defineProps<{
  showDeleteConfirmModal: boolean
}>()
</script>
