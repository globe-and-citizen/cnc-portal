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
      :class="{'input-error': $v.$errors.length}"
    >
      <span class="w-24">Value</span>
      <EntitlementValueForm v-model="entitlement" />
    </label>
    <FormInputError v-if="$v.$errors.length">
      <div 
        v-for="error of $v.$errors" :key="error.$uid"
      >
        {{ error.$message }}
      </div>
    </FormInputError>
  </div>  
</template>

<script setup lang="ts">
import { ref, type ComputedRef, watch, onMounted } from 'vue'
import EntitlementValueForm from './EntitlementValueForm.vue'
import { useVuelidate } from "@vuelidate/core";
import { required } from "@vuelidate/validators";
import FormInputError from '../FormInputError.vue';

const entitlement = defineModel({
  default: {
    entitlementTypeId: 0,
    value: '',
    isInit: true //so entitlement value isn't cleared on load
  }
})

//#region validation
const rules = {
  entitlement: { required }
}

const $v = useVuelidate(/*rules, { entitlement }*/)
//#endregion validation

const props = defineProps<{
  availableTypes: ComputedRef<{ id: number; name: string }[]>
}>()

const availableTypes = ref(props.availableTypes)

watch(
  () => entitlement.value.entitlementTypeId,
  (newType, oldType) => {
    if (!entitlement.value.isInit && newType !== oldType && oldType !== 0) {
      console.log('reset!!!')
      console.log('newType: ', newType, ', oldType: ', oldType)
      console.log('entitlement.value: ', entitlement.value)
      entitlement.value.value = ''
    } /*else entitlement.value.isInit = false*/
  }
)

onMounted(() => {
  console.log('entitlement: ', entitlement.value)
})
</script>
