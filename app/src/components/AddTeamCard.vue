<template>
  <div class="card w-80 bg-white flex justify-center items-center">
    <div class="card-body flex justify-center items-center">
      <h1 class="card-title">Add Team</h1>

      <div class="w-6 h-6 cursor-pointer" @click="emits('toggleAddTeamForm')">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="lightgreen"
          viewBox="0 0 24 24"
          strokeWidth="{10.5}"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v6m3-3H9m12 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
          />
        </svg>
      </div>
      <dialog
        id="my_modal_5"
        class="modal modal-bottom sm:modal-middle"
        :class="{ 'modal-open': showAddTeamForm }"
      >
        <div class="modal-box">
          <button
            class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
            @click="emits('toggleAddTeamForm')"
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
              <label class="input input-bordered flex items-center gap-2 input-md">
                <input
                  type="text"
                  class="w-24"
                  v-model="input.name"
                  :placeholder="'Member Name ' + (index + 1)"
                  :class="{ 'input-error': !input.isValid }"
                />
                |
                <input
                  type="text"
                  class="grow"
                  v-model="input.walletAddress"
                  :placeholder="'Wallet Address ' + (index + 1)"
                />
              </label>
            </div>
          </div>
          <div class="flex justify-end pt-3">
            <div class="w-6 h-6 cursor-pointer" @click="emits('addInput')">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="lightgreen"
                viewBox="0 0 24 24"
                strokeWidth="{10.5}"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v6m3-3H9m12 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                />
              </svg>
            </div>
            <div class="w-6 h-6 cursor-pointer" @click="emits('removeInput')">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="red"
                viewBox="0 0 24 24"
                strokeWidth="{1.5}"
                stroke="currentColor"
                className="w-6 h-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 12H9m12 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                />
              </svg>
            </div>
          </div>

          <div class="modal-action justify-center">
            <!-- if there is a button in form, it will close the modal -->
            <button class="btn btn-primary" @click="emits('addTeam')">Submit</button>

            <!-- <button class="btn" @click="showModal = !showModal">Close</button> -->
          </div>
        </div>
      </dialog>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { TeamInput } from '@/types/types'
import { ref, watch } from 'vue'

const emits = defineEmits(['addTeam', 'addInput', 'removeInput', 'toggleAddTeamForm'])
const props = defineProps<{
  showAddTeamForm: boolean
  team: TeamInput
}>()
const team = ref(props.team)
const showAddTeamForm = ref<boolean>(props.showAddTeamForm)

watch(
  () => props.showAddTeamForm,
  (newValue) => {
    showAddTeamForm.value = newValue
  }
)
</script>
