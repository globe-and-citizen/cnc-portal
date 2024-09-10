<template>
  <h1 class="font-bold text-2xl mb-5">Set Max Limit</h1>
  <hr />
  <div class="mt-5">
    <label class="input input-bordered flex items-center gap-2 input-md">
      <input type="text" class="w-24" v-model="amount" placeholder="Enter an mount..." />
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
const props = defineProps<{ loading: boolean }>()
const amount = ref('0')

const submitForm = async () => {
  emit('setLimit', amount)
}

watch(
  () => props.loading,
  (newVal) => {
    if (newVal) return
    emit('closeModal')
  }
)
</script>
