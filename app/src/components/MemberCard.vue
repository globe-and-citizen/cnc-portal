<template>
  <tr @click="emits('toggleUpdateMemberModal', member)" class="cursor-pointer hover">
    <th>{{ member.id }}</th>
    <th>{{ member.name }}</th>
    <th>{{ member.walletAddress }}</th>
    <th>Action</th>
  </tr>
  <UpdateMemberModal
    :showUpdateMemberModal="showUpdateMemberModal"
    :updateMemberInput="updateMemberInput"
    @toggleUpdateMemberModal="emits('toggleUpdateMemberModal', {})"
    @updateMember="(id) => emits('updateMember', id)"
    @deleteMember="(id) => emits('deleteMember', id)"
  />
</template>
<script setup lang="ts">
import type { MemberInput } from '@/types'
import UpdateMemberModal from '@/components/modals/UpdateMemberModal.vue'
import { ref, watch } from 'vue'

const emits = defineEmits(['toggleUpdateMemberModal', 'updateMember', 'deleteMember'])
const props = defineProps<{
  showUpdateMemberModal: boolean
  member: Partial<MemberInput>
  updateMemberInput: Partial<MemberInput>
}>()
const member = ref(props.member)
const updateMemberInput = ref(props.updateMemberInput)
const showUpdateMemberModal = ref<boolean>(props.showUpdateMemberModal)

watch(
  [() => props.showUpdateMemberModal, props.updateMemberInput, updateMemberInput],
  ([showForm]) => {
    showUpdateMemberModal.value = showForm
    updateMemberInput.value = props.updateMemberInput
  },
  { deep: true }
)
</script>
