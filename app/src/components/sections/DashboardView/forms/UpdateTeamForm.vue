<template>
  <UForm :schema="teamSchema" :state="state" class="flex flex-col gap-5" @submit="onSubmit">
    <h1 class="font-bold text-2xl">Update Team Details</h1>
    <hr />

    <UFormField label="Team Name" name="name" required class="w-full">
      <UInput
        v-model="state.name"
        type="text"
        :placeholder="team.name"
        class="w-full"
      />
    </UFormField>

    <UFormField label="Description" name="description" required class="w-full">
      <UInput v-model="state.description" type="text" class="w-full" />
    </UFormField>

    <div class="modal-action justify-center">
      <UButton
        type="submit"
        color="primary"
        :loading="teamIsUpdating"
        :disabled="teamIsUpdating"
      >
        Submit
      </UButton>
    </div>
  </UForm>
</template>

<script setup lang="ts">
import { z } from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'
import { reactive, watch } from 'vue'

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

const teamSchema = z.object({
  name: z
    .string({ message: 'Team name is required' })
    .min(3, 'Team name must be at least 3 characters'),
  description: z
    .string({ message: 'Description is required' })
    .min(10, 'Description must be at least 10 characters')
})

type TeamSchema = z.output<typeof teamSchema>

const state = reactive({
  name: team.value.name ?? '',
  description: team.value.description ?? ''
})

watch(
  () => state.name,
  (val) => {
    team.value.name = val
  }
)

watch(
  () => state.description,
  (val) => {
    team.value.description = val
  }
)

watch(team, (val) => {
  if (val.name !== state.name) {
    state.name = val.name ?? ''
  }
  if (val.description !== state.description) {
    state.description = val.description ?? ''
  }
})

const onSubmit = (_event: FormSubmitEvent<TeamSchema>) => {
  emits('updateTeam')
}
</script>
