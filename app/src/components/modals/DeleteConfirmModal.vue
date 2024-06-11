<template>
  <dialog id="my_modal_2" class="modal" :class="{ 'modal-open': props.showDeleteConfirmModal }">
    <div class="modal-box">
      <form method="dialog">
        <button
          class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
          @click="emits('toggleDeleteConfirmModal')"
        >
          ✕
        </button>
      </form>
      <h3 class="font-bold text-lg">Confirmation</h3>
      <p class="py-4">
        Are you sure you want to delete
        <span class="font-bold">{{ props.member.name }}</span>
        with address <span class="font-bold">{{ props.member.address }}</span>
        from the team?
      </p>
      <div class="modal-action justify-center">
        <button class="btn btn-error" @click="emits('deleteMember')">Delete</button>
        <button class="btn btn-primary" @click="emits('toggleDeleteConfirmModal')">Cancel</button>
      </div>
    </div>
  </dialog>
</template>
<script setup lang="ts">
import type { MemberInput } from '@/types'
const emits = defineEmits(['toggleDeleteConfirmModal', 'deleteMember'])
const props = defineProps<{
  showDeleteConfirmModal: boolean
  member: Partial<MemberInput>
}>()
</script>
