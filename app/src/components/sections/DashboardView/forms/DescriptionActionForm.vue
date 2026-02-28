<template>
  <UForm
    :schema="descriptionSchema"
    :state="state"
    class="flex flex-col gap-4"
    @submit="onSubmit"
  >
    <h2>{{ actionName }}</h2>

    <h3>
      Please add description about <span class="badge badge-primary">{{ actionName }}</span>
    </h3>

    <UFormField label="Description" name="description" required class="w-full">
      <UInput
        v-model="state.description"
        type="text"
        data-test="amount-input"
        class="w-full"
      />
    </UFormField>

    <div class="text-center">
      <UButton
        type="submit"
        :loading="loading"
        :disabled="loading"
        class="btn btn-primary w-44 text-center"
      >
        {{ actionName }}
      </UButton>
    </div>
  </UForm>
</template>

<script setup lang="ts">
import { z } from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'
import { reactive, watch } from 'vue'

const description = defineModel('description')

defineProps<{
  actionName: string
  loading: boolean
}>()
const emits = defineEmits(['submit'])

const descriptionSchema = z.object({
  description: z
    .string({ message: 'Description is required' })
    .min(5, 'Description must be at least 5 characters')
})

type DescriptionSchema = z.output<typeof descriptionSchema>

const state = reactive({
  description: (description.value as string) ?? ''
})

watch(
  () => state.description,
  (val) => {
    description.value = val
  }
)

watch(description, (val) => {
  if (val !== state.description) {
    state.description = (val as string) ?? ''
  }
})

const onSubmit = (event: FormSubmitEvent<DescriptionSchema>) => {
  emits('submit', event.data.description)
}
</script>
