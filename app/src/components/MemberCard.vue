<template>
  <tr @click="emits('toggleUpdateMemberForm', member)" class="cursor-pointer">
    <th>{{ member.id }}</th>
    <th>{{ member.name }}</th>
    <th>{{ member.walletAddress }}</th>
    <th>Action</th>
  </tr>

  <dialog
    id="my_modal_20"
    v-if="showUpdateMemberForm"
    class="modal modal-bottom sm:modal-middle"
    :class="{ 'modal-open': showUpdateMemberForm }"
  >
    <div class="modal-box">
      <button class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2">
        <span @click="emits('toggleUpdateMemberForm', {})">x</span>
      </button>
      <h1 class="font-bold text-2xl">Update Member Details</h1>
      <hr class="" />
      <label
        :class="{ 'input-error': !updateMemberInput.isValid }"
        class="input input-bordered flex items-center gap-2 input-md mt-2"
      >
        <input type="text" class="w-24" v-model="updateMemberInput.name" />
        |
        <input type="text" class="grow" v-model="updateMemberInput.walletAddress" />
      </label>
      <div class="flex mt-2 justify-between">
        <button class="btn btn-error size-sm" @click="emits('deleteMember', updateMemberInput.id)">
          Delete
        </button>
        <button class="btn btn-primary" @click="emits('updateMember', updateMemberInput.id)">
          Update
        </button>
      </div>
    </div>
    <div></div>
  </dialog>
</template>
<script setup lang="ts">
import type { MemberInput } from '@/types/types'
import { ref, watch } from 'vue'

const emits = defineEmits(['toggleUpdateMemberForm', 'updateMember', 'deleteMember'])
const props = defineProps<{
  showUpdateMemberForm: boolean
  member: Partial<MemberInput>
  updateMemberInput: Partial<MemberInput>
}>()
const member = ref(props.member)
const updateMemberInput = ref(props.updateMemberInput)
const showUpdateMemberForm = ref<boolean>(props.showUpdateMemberForm)

watch(
  [() => props.showUpdateMemberForm, props.updateMemberInput, updateMemberInput],
  ([showForm]) => {
    showUpdateMemberForm.value = showForm
    updateMemberInput.value = props.updateMemberInput
  },
  { deep: true }
)
</script>
