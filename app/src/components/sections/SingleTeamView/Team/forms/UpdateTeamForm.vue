<template>
  <h1 class="font-bold text-2xl">Update Team Details</h1>
  <hr class="" />
  <div class="flex flex-col gap-5">
    <label class="input input-bordered flex items-center gap-2 input-md mt-4">
      <span class="w-28">Team Name</span>
      <input type="text" class="grow" :placeholder="team.name" v-model="team.name" />
    </label>
    <label class="input input-bordered flex items-center gap-2 input-md">
      <span class="w-28">Description</span>
      <input type="text" class="grow" v-model="team.description" />
    </label>
    <label class="input input-bordered flex items-center gap-2 input-md">
      <span class="w-30">Bank Smart Contract Address</span>
      <input type="text" class="grow" v-model="team.bankAddress" />
    </label>
  </div>

  <div class="modal-action justify-center">
    <LoadingButton color="primary min-w-24" v-if="teamIsUpdating" />
    <button v-else class="btn btn-primary" @click="emits('updateTeam')">Submit</button>
  </div>
</template>
<script setup lang="ts">
import LoadingButton from '@/components/LoadingButton.vue'
const team = defineModel({
  default: {
    name: '',
    description: '',
    bankAddress: ''
  }
})
const emits = defineEmits(['updateTeam'])
defineProps<{
  teamIsUpdating: boolean
}>()
</script>
