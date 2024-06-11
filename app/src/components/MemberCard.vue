<template>
  <div class="collapse collapse-arrow bg-base-100">
    <input type="radio" name="my-accordion-2" />
    <div class="collapse-title text-sm font-medium">
      <span>{{ member.name }}</span>
      <span>{{ member.address }}</span>
      <button
        v-if="member.address != ownerAddress && ownerAddress == useUserDataStore().address"
        class="btn btn-error btn-xs"
        @click="showDeleteConfirmModal = !showDeleteConfirmModal"
      >
        Delete
      </button>
    </div>
    <div class="collapse-content">HI</div>
  </div>

  <DeleteConfirmModal
    :showDeleteConfirmModal="showDeleteConfirmModal"
    @toggleDeleteConfirmModal="showDeleteConfirmModal = !showDeleteConfirmModal"
    @deleteItem="emits('deleteMember', teamId, member.address)"
  >
    Are you sure you want to delete
    <span class="font-bold">{{ member.name }}</span>
    with address <span class="font-bold">{{ member.address }}</span>
    from the team?
  </DeleteConfirmModal>
</template>
<script setup lang="ts">
import { useUserDataStore } from '@/stores/user'
import type { MemberInput } from '@/types'
import DeleteConfirmModal from '@/components/modals/DeleteConfirmModal.vue'
import { ref } from 'vue'

const emits = defineEmits(['deleteMember'])
const showDeleteConfirmModal = ref(false)
const props = defineProps<{
  member: Partial<MemberInput>
  teamId: Number
  ownerAddress: String
}>()
const member = ref(props.member)
</script>
