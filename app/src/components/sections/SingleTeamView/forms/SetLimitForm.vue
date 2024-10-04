<template>
  <h1 class="font-bold text-2xl mb-5">Set Max Limit</h1>
  <hr />
  <div class="mt-5">
    <div v-if="isBodAction">
      <p data-test="bod-notification" class="pt-2 text-red-500">
        This will create a board of directors action
      </p>
      <label class="input input-bordered flex items-center gap-2 input-md mt-2">
        <span class="w-24">Description</span>
        <input
          type="text"
          class="grow"
          data-test="description-input"
          v-model="description"
          placeholder="Enter an action description..."
        />
      </label>
    </div>
    <label class="input input-bordered flex items-center gap-2 input-md mt-2">
      <span class="w-24">Amount</span>
      <input type="text" class="grow" v-model="amount" placeholder="Enter an mount..." />
    </label>

    <div class="modal-action justify-center">
      <LoadingButton color="primary" class="w-24" v-if="loading" />
      <button
        class="btn btn-primary"
        @click="submitForm"
        v-if="!loading"
        data-test="transferButton"
      >
        Set Limit
      </button>
      <button class="btn btn-error" @click="$emit('closeModal')">Cancel</button>
    </div>
  </div>
</template>
<script setup lang="ts">
import { ref, watch } from 'vue'
import LoadingButton from '@/components/LoadingButton.vue'
const emit = defineEmits(['setLimit', 'closeModal'])
const props = defineProps<{ loading: boolean; isBodAction: boolean }>()
const amount = ref('0')
const description = ref('')

const submitForm = async () => {
  emit('setLimit', amount.value, description.value)
}

watch(
  () => props.loading,
  (newVal) => {
    if (newVal) return
    emit('closeModal')
  }
)
</script>
