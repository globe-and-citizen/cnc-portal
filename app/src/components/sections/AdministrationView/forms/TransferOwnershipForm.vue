<template>
  <UForm :schema="schema" :state="state" @submit="submitForm">
    <div class="flex flex-col gap-2">
      <h1 class="text-2xl font-bold">Transfer Ownership</h1>
      <h3 class="font-bold text-red-600">This will create an board of director action</h3>
    </div>
    <hr class="" />
    <div class="mt-4 flex flex-col gap-4">
      <UFormField name="newOwner" label="New Owner">
        <UInput
          v-model="state.newOwner"
          placeholder="0x123"
          data-test="new-owner-input"
          class="w-full"
        />
      </UFormField>
      <UFormField name="description" label="Description">
        <UInput
          v-model="state.description"
          placeholder="Description"
          data-test="description-input"
          class="w-full"
        />
      </UFormField>
    </div>
    <UAlert
      v-if="errorMessage"
      color="error"
      variant="soft"
      :description="errorMessage"
      icon="i-lucide-circle-alert"
      class="mt-4"
      data-test="error-alert"
    />

    <div class="modal-action justify-center">
      <UButton
        type="submit"
        color="primary"
        :loading="transferOwnershipLoading"
        :disabled="transferOwnershipLoading"
        data-test="submit-button"
        label="Submit"
      />
    </div>
  </UForm>
</template>

<script setup lang="ts">
import { z } from 'zod'
import { reactive, computed } from 'vue'
import { isAddress } from 'viem'

const props = defineProps({
  transferOwnershipLoading: {
    type: Boolean,
    required: true
  },
  asBod: {
    type: Boolean,
    required: false,
    default: false
  },
  errorMessage: {
    type: String,
    required: false,
    default: ''
  }
})

const emits = defineEmits(['transferOwnership'])

const schema = computed(() =>
  z.object({
    newOwner: z.string().refine((v) => isAddress(v), { message: 'Invalid address' }),
    description: props.asBod ? z.string().min(1, 'Description is required') : z.string()
  })
)

const state = reactive({ newOwner: '', description: '' })

const submitForm = () => {
  emits('transferOwnership', state.newOwner, state.description)
}
</script>
