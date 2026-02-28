<template>
  <UForm
    :schema="schema"
    :state="state"
    class="flex flex-col gap-4"
    @submit="onSubmit"
  >
    <div class="flex flex-col gap-2">
      <h1 class="font-bold text-2xl">Transfer Ownership</h1>
      <h3 class="font-bold text-red-600">This will create an board of director action</h3>
    </div>
    <hr />

    <UFormField label="New Owner" name="newOwner" required class="w-full">
      <UInput
        v-model="state.newOwner"
        type="text"
        placeholder="0x123"
        data-test="new-owner-input"
        class="w-full"
      />
    </UFormField>

    <UFormField label="Description" name="description" :required="asBod" class="w-full">
      <UInput
        v-model="state.description"
        type="text"
        placeholder="Description"
        data-test="description-input"
        class="w-full"
      />
    </UFormField>

    <div class="modal-action justify-center">
      <UButton
        type="submit"
        color="primary"
        :loading="transferOwnershipLoading"
        :disabled="transferOwnershipLoading"
        data-test="submit-button"
      >
        Submit
      </UButton>
    </div>
  </UForm>
</template>

<script setup lang="ts">
import { z } from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'
import { reactive, computed } from 'vue'
import { isAddress } from 'viem'

const emits = defineEmits(['transferOwnership'])
const props = defineProps({
  transferOwnershipLoading: {
    type: Boolean,
    required: true
  },
  asBod: {
    type: Boolean,
    required: false,
    default: false
  }
})

const schema = computed(() =>
  z.object({
    newOwner: z
      .string({ message: 'New owner is required' })
      .min(1, 'New owner is required')
      .refine((val) => isAddress(val), { message: 'Invalid address' }),
    description: props.asBod
      ? z.string({ message: 'Description is required' }).min(1, 'Description is required')
      : z.string().optional()
  })
)

type Schema = z.output<ReturnType<typeof schema.value>>

const state = reactive({
  newOwner: '',
  description: ''
})

const onSubmit = (event: FormSubmitEvent<Schema>) => {
  emits('transferOwnership', event.data.newOwner, event.data.description ?? '')
}
</script>
