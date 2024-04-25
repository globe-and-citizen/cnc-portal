<template>
  <div class="card w-full bg-white">
    <div class="card-body flex justify-center items-center">
      <h1 class="card-title">Add Member</h1>

      <div class="w-6 h-6 cursor-pointer" @click="showUpdateForm = true">
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
    </div>
  </div>
  <dialog
    id="my_modal_10"
    class="modal modal-bottom sm:modal-middle"
    :class="{ 'modal-open': showUpdateForm }"
  >
    <div class="modal-box">
      <button
        class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
        @click="showUpdateForm = !showUpdateForm"
      >
        ✕
      </button>
      <h1 class="font-bold text-2xl">Add New Member</h1>
      <hr class="" />
      <div v-for="(input, index) in formData" :key="index" class="input-group mt-3">
        <div v-if="input.isValid == false"></div>
        <label
          class="input input-bordered flex items-center gap-2 input-md"
          :class="{ 'input-error': !input.isValid }"
        >
          <input
            type="text"
            class="w-24"
            v-model="input.name"
            :placeholder="'Member Name ' + (index + 1)"
          />
          |
          <input
            type="text"
            class="grow"
            v-model="input.walletAddress"
            :placeholder="'Wallet Address ' + (index + 1)"
          />
          <span class="badge badge-primary">Mandatory</span>
        </label>
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
      <div class="flex justify-center" @click="emits('addMembers')">
        <button class="btn btn-primary justify-center">Add</button>
      </div>
    </div>
  </dialog>
</template>
<script setup lang="ts">
import { ref, defineProps, defineEmits, watch } from 'vue'

const props = defineProps<{
  formData: Array<{ name: string; walletAddress: string; isValid: boolean }>
  showUpdateForm: boolean
}>()

const emits = defineEmits(['updateForm', 'addInput', 'removeInput', 'addMembers', 'showUpdateForm'])

const formData = ref(props.formData)

const showUpdateForm = ref(props.showUpdateForm)
watch(
  [formData, showUpdateForm],
  ([newFormData, newShowUpdateForm]) => {
    emits('updateForm', newFormData)
    emits('showUpdateForm', newShowUpdateForm)
  },
  { deep: true }
)
</script>
