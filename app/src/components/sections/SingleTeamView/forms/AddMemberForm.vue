<template>
  <h1 class="font-bold text-2xl">Add New Member</h1>
  <hr />
  <div class="flex flex-col gap-5 pt-5">
    <MultiSelectMemberInput v-model="formData" />

    <div v-if="addMembersError">
      <div class="alert alert-warning" v-if="statusCode === 401">
        You don't have the right for this
      </div>
      <div class="alert alert-danger" v-else>Something went wrong, Unable to add team Members</div>
    </div>

    <ButtonUI
      variant="primary"
      class="justify-center"
      :loading="addMembersLoading"
      :disabled="addMembersLoading"
      @click="executeAddMembers"
      >Add Members</ButtonUI
    >
  </div>

  <div class="divider m-0"></div>
</template>
<script setup lang="ts">
import { ref, watch } from 'vue'
import ButtonUI from '@/components/ButtonUI.vue'
import MultiSelectMemberInput from '@/components/sections/TeamView/forms/MultiSelectMemberInput.vue'
import { useCustomFetch } from '@/composables/useCustomFetch'
import { useToastStore } from '@/stores'

const emits = defineEmits(['memberAdded'])
const { addSuccessToast, addErrorToast } = useToastStore()

const props = defineProps<{
  teamId: string
}>()

const formData = ref([])
const {
  execute: executeAddMembers,
  error: addMembersError,
  isFetching: addMembersLoading,
  statusCode
} = useCustomFetch(`teams/${props.teamId}/member`, { immediate: false })
  .post({ data: formData.value })
  .json<{ member: string }>()

watch(addMembersError, () => {
  if (addMembersError.value) {
    addErrorToast(addMembersError.value || 'Failed to add members')
  }
})

watch(addMembersLoading, () => {
  if (!addMembersLoading.value && !addMembersError.value) {
    addSuccessToast('Members added successfully')
    emits('memberAdded')
  }
})
</script>
