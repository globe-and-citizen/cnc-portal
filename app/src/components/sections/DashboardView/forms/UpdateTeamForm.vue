<template>
  <h1 class="font-bold text-2xl">Update Team Details</h1>
  <hr class="" />
  <div class="flex flex-col gap-5">
    <label class="input input-bordered flex items-center gap-2 input-md mt-4">
      <span class="w-28">Team Name</span>
      <input type="text" class="grow" :placeholder="team.name" v-model="team.name" />
    </label>
    <div
      class="pl-4 text-red-500 text-sm w-full text-left"
      v-for="error of $v.name.$errors"
      :key="error.$uid"
    >
      {{ error.$message }}
    </div>
    <label class="input input-bordered flex items-center gap-2 input-md">
      <span class="w-28">Description</span>
      <input type="text" class="grow" v-model="team.description" />
    </label>
    <div
      class="pl-4 text-red-500 text-sm w-full text-left"
      v-for="error of $v.description.$errors"
      :key="error.$uid"
    >
      {{ error.$message }}
    </div>
  </div>

  <div class="modal-action justify-center">
    <ButtonUI
      variant="primary"
      :loading="teamIsUpdating"
      :disabled="teamIsUpdating"
      @click="submitForm"
      >Submit</ButtonUI
    >
  </div>
</template>
<script setup lang="ts">
import { required, minLength } from '@vuelidate/validators'
import { useVuelidate } from '@vuelidate/core'
import ButtonUI from '@/components/ButtonUI.vue'
const team = defineModel({
  default: {
    name: '',
    description: ''
  }
})
const emits = defineEmits(['updateTeam'])
defineProps<{
  teamIsUpdating: boolean
}>()
const rules = {
  name: { required, minLength: minLength(3) },
  description: { required, minLength: minLength(10) }
}

const $v = useVuelidate(rules, team)
const submitForm = () => {
  $v.value.$touch()
  if ($v.value.$invalid) return
  emits('updateTeam')
}
</script>
