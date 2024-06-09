<template>
  <tr class="cursor-pointer hover">
    <th>{{ member.name }}</th>
    <th>{{ member.address }}</th>
    <th>
      <button
        v-if="!isOwner"
        class="btn btn-error btn-xs"
        @click="showDeleteConfirmModal = !showDeleteConfirmModal"
      >
        Delete
      </button>
    </th>
  </tr>
  <DeleteConfirmModal
    :showDeleteConfirmModal="showDeleteConfirmModal"
    @toggleDeleteConfirmModal="showDeleteConfirmModal = !showDeleteConfirmModal"
    @deleteMember="emits('deleteMember', teamId, member.address)"
    :member="member"
  />
</template>
<script setup lang="ts">
import type { MemberInput } from '@/types'
import DeleteConfirmModal from '@/components/modals/DeleteConfirmModal.vue'
import { ref } from 'vue'

const emits = defineEmits(['deleteMember'])
const showDeleteConfirmModal = ref(false)
const props = defineProps<{
  member: Partial<MemberInput>
  teamId: Number
  isOwner: Boolean
}>()
const member = ref(props.member)
</script>
