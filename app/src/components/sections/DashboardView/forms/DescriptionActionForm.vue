<template>
  <div class="flex flex-col gap-4">
    <h2>{{ actionName }}</h2>

    <h3>
      Please add description about <span class="badge badge-primary">{{ actionName }}</span>
    </h3>
    <label class="input input-bordered input-md mt-2 flex w-full items-center gap-2">
      <p>Description</p>
      |
      <input type="text" class="grow" data-test="amount-input" v-model="description" />
    </label>
    <div
      class="w-full pl-4 text-left text-sm text-red-500"
      v-for="error of $v.description.$errors"
      :key="error.$uid"
    >
      {{ error.$message }}
    </div>

    <div class="text-center">
      <ButtonUI
        :loading="loading"
        :disabled="loading"
        class="btn btn-primary w-44 text-center"
        @click="onSubmit()"
      >
        {{ actionName }}
      </ButtonUI>
    </div>
  </div>
</template>

<script setup lang="ts">
import ButtonUI from '@/components/ButtonUI.vue'
import useVuelidate from '@vuelidate/core'
import { minLength, required } from '@vuelidate/validators'

const description = defineModel('description')

defineProps<{
  actionName: string
  loading: boolean
}>()
const emits = defineEmits(['submit'])

const rules = {
  description: {
    required,
    minLength: minLength(5)
  }
}

const onSubmit = () => {
  $v.value.$touch()
  if ($v.value.$invalid) return

  emits('submit', description.value)
}

const $v = useVuelidate(rules, { description })
</script>
