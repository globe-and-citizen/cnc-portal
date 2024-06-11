<template>
  <tr class="cursor-pointer hover">
    <th>{{ member.name }}</th>
    <th>{{ member.address }}</th>
    <th>
      <button
        v-if="member.address != ownerAddress && ownerAddress == useUserDataStore().address"
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
