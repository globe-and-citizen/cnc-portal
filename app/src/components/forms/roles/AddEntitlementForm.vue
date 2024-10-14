<template>
  <div class="space-y-2">
    <label class="input input-bordered flex items-center gap-2 input-md mt-4">
      <span class="w-24">Type</span>
      <select v-model="entitlement.entitlementTypeId" class="grow bg-white">
        <option v-for="item in availableTypes" :key="item.id" :value="item.id">
          {{ item.name }}
        </option>
      </select>
    </label>
    <label
      class="input input-bordered flex items-center gap-2 input-md"
      :class="{ 'input-error': $v.$errors.length }"
    >
      <span class="w-24">Value</span>
      <EntitlementValueForm v-model="entitlement" />
    </label>
    <FormErrorMessage v-if="$v.$errors.length">
      <div v-for="error of $v.$errors" :key="error.$uid">
        {{ error.$message }}
      </div>
    </FormErrorMessage>
  </div>
</template>

<script setup lang="ts">
import { ref, type ComputedRef, watch } from 'vue'
import EntitlementValueForm from './entitlement-value/EntitlementValueForm.vue'
import { useVuelidate } from '@vuelidate/core'
import FormErrorMessage from '../../ui/FormErrorMessage.vue'

const isInit = ref(true)

const entitlement = defineModel({
  default: {
    entitlementTypeId: 0,
    value: '',
    //isInit: true //so entitlement value isn't cleared on load
  }
})

const $v = useVuelidate()

const props = defineProps<{
  availableTypes: ComputedRef<{ id: number; name: string }[]>
}>()

const availableTypes = ref(props.availableTypes)

watch(
  () => entitlement.value.entitlementTypeId,
  (newType, oldType) => {
    // if (!entitlement.value.isInit && newType !== oldType && oldType !== 0) {
    //   entitlement.value.value = ''
    // }
    if (!isInit.value && newType !== oldType && oldType !== 0) {
      entitlement.value.value = ''
    }
  }
)
</script>
