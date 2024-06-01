<template>
  <dialog
    id="my_modal_5"
    class="modal modal-bottom sm:modal-middle"
    :class="{ 'modal-open': showAddTeamModal }"
  >
    <div class="modal-box">
      <button
        class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
        @click="emits('toggleAddTeamModal')"
      >
        ✕
      </button>

      <h1 class="font-bold text-2xl">Create New Team</h1>
      <hr class="" />
      <div class="flex flex-col gap-5">
        <label class="input input-bordered flex items-center gap-2 input-md mt-4">
          <span class="w-24">Team Name</span>
          <input type="text" class="grow" placeholder="Daisy" v-model="team.name" />
        </label>
        <label class="input input-bordered flex items-center gap-2 input-md">
          <span class="w-24">Description</span>
          <input
            type="text"
            class="grow"
            placeholder="Enter a short description"
            v-model="team.description"
          />
        </label>

        <div v-for="(input, index) in team.members" :key="index" class="input-group">
          <label
            class="input input-bordered flex items-center gap-2 input-md"
            :class="{ 'input-error': !input.isValid }"
          >
            <input
              type="text"
              class="w-24"
              v-model="input.name"
              @keyup.enter="
                () => {
                  emits('searchUsers', input)
                  dropdown = true
                }
              "
              :placeholder="'Member Name ' + (index + 1)"
            />
            |
            <input
              type="text"
              class="grow"
              v-model="input.address"
              @keyup.enter="
                () => {
                  emits('searchUsers', input)
                  dropdown = true
                }
              "
              :placeholder="'Wallet Address ' + (index + 1)"
            />
          </label>
        </div>
      </div>
      <div
        class="dropdown"
        :class="{ 'dropdown-open': !!users && users.length > 0 }"
        v-if="dropdown"
      >
        <ul class="p-2 shadow menu dropdown-content z-[1] bg-base-100 rounded-box w-96">
          <li v-for="user in users" :key="user.address">
            <a
              @click="
                () => {
                  const l = team.members.length - 1
                  if (l >= 0) {
                    team.members[l].name = user.name ?? ''
                    team.members[l].address = user.address ?? ''
                    dropdown = false
                  }
                }
              "
            >
              {{ user.name }} | {{ user.address }}
            </a>
          </li>
        </ul>
      </div>
      <div class="flex justify-end pt-3">
        <div class="w-6 h-6 cursor-pointer" @click="emits('addInput')">
          <IconPlus />
        </div>
        <div class="w-6 h-6 cursor-pointer" @click="emits('removeInput')">
          <IconMinus />
        </div>
      </div>

      <div class="modal-action justify-center">
        <!-- if there is a button in form, it will close the modal -->
        <button class="btn btn-primary" @click="emits('addTeam')">Submit</button>

        <!-- <button class="btn" @click="showModal = !showModal">Close</button> -->
      </div>
    </div>
  </dialog>
</template>
<script setup lang="ts">
import type { TeamInput, User } from '@/types'
import { ref, watch } from 'vue'
import IconPlus from '@/components/icons/IconPlus.vue'
import IconMinus from '@/components/icons/IconMinus.vue'

const emits = defineEmits([
  'addTeam',
  'addInput',
  'removeInput',
  'toggleAddTeamModal',
  'updateAddTeamModal',
  'searchUsers'
])
const props = defineProps<{
  showAddTeamModal: boolean
  team: TeamInput
  users: User[]
}>()
const dropdown = ref<boolean>(true)
const team = ref(props.team)
const showAddTeamModal = ref<boolean>(props.showAddTeamModal)

watch(
  [() => props.showAddTeamModal, team],
  ([newshowAddTeamModal, newFormDataTeam]) => {
    emits('updateAddTeamModal', newFormDataTeam)
    showAddTeamModal.value = newshowAddTeamModal
  },
  { deep: true }
)
</script>
