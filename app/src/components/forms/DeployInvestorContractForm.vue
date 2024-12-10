<template>
  <div class="flex flex-col gap-4">
    <h3 class="text-xl font-bold" data-test="title">
      Deploy Investor Contract {{ isDeployAll ? '(Deploy all)' : '' }}
    </h3>
    <label class="input input-bordered flex items-center gap-2 input-md mt-2 w-full">
      <p>Name of the shares</p>
      |
      <input type="text" class="grow" data-test="name-input" v-model="name" />
    </label>
    <div
      class="pl-4 text-red-500 text-sm w-full text-left"
      v-for="error of $v.name.$errors"
      data-test="name-error"
      :key="error.$uid"
    >
      {{ error.$message }}
    </div>

    <label class="input input-bordered flex items-center gap-2 input-md mt-2 w-full">
      <p>Ticker or Symbol of the shares</p>
      |
      <input type="text" class="grow" data-test="symbol-input" v-model="symbol" />
    </label>
    <div
      class="pl-4 text-red-500 text-sm w-full text-left"
      v-for="error of $v.symbol.$errors"
      data-test="symbol-error"
      :key="error.$uid"
    >
      {{ error.$message }}
    </div>

    <div class="text-center">
     
      <ButtonUI
        :loading="loading"
        :disabled="loading"
        variant="primary"
        class="w-44 text-center"
        data-test="deploy-button"
        @click="onSubmit()"
      >
        Deploy
      </ButtonUI>
    </div>
  </div>
</template>

<script setup lang="ts">
import useVuelidate from '@vuelidate/core'
import { required } from '@vuelidate/validators'
import ButtonUI from '../ButtonUI.vue';

const name = defineModel('name')
const symbol = defineModel('symbol')

const emit = defineEmits(['submit'])

const rules = {
  name: {
    required
  },
  symbol: {
    required
  }
}

defineProps<{
  loading: boolean
  isDeployAll: boolean
}>()

const onSubmit = () => {
  $v.value.$touch()
  if ($v.value.$invalid) return

  emit('submit', name.value, symbol.value)
}

const $v = useVuelidate(rules, { name, symbol })
</script>
