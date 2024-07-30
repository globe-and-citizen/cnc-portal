<template>
  <input 
    type="text" 
    class="w-24" 
    placeholder="Enter amount" 
    v-model="amount" 
    @input="async () => { 
      await $v.$validate()
    }"
  />
  <span>per</span>
  <select v-model="selectedFrequency" class="grow bg-white">
    <option>-- Frequency --</option>
    <option v-for="(item, index) in options" :key="index">
      {{ item }}
    </option>
  </select>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { useVuelidate } from "@vuelidate/core";
import { numeric, required, helpers } from "@vuelidate/validators";

const options = ref(['hour', 'week', 'month'])

const entitlement = defineModel({
  default: {
    value: '',
    entitlementTypeId: 0
  }
})

const initAmount = computed(() => {
  const entValue = entitlement.value.value
  if (entValue) {
    return entValue.split(`:`)[0]
  } else {
    return ``
  }
})

const initFrequency = computed(() => {
  const entValue = entitlement.value.value
  if (entValue) {
    return entValue.split(`:`)[1]
  } else {
    return `-- Frequency --`
  }
})

const amount = ref<string | null>(initAmount.value)
const selectedFrequency = ref<string | null>(initFrequency.value)

//#region validate
const validOption = (value: string) => options.value.includes(value);

const rules = {
  amount: { 
    numeric, 
    required
  },
  selectedFrequency: { validOption: helpers.withMessage('Please select a frequency', validOption) }
};

const $v = useVuelidate(rules, { amount, selectedFrequency })
//#endregion validate

watch(initAmount, (newVal) => {
  amount.value = newVal
})

watch(initFrequency, (newVal) => {
  selectedFrequency.value = newVal
})

watch([amount, selectedFrequency], ([amount, frequency]) => {
  if (amount === `` || frequency === `-- Frequency --`) {
    entitlement.value.value = ''
  } else {
    entitlement.value.value = `${amount}:${frequency}`
  }
})
</script>
