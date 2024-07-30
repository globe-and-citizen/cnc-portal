<template>
  <input
    type="text"
    class="w-24"
    placeholder="Put percentage"
    v-model="entitlement.value"
    @input="
      async () => {
        await $v.$validate()
      }
    "
  />
  <span class="grow">of total supply</span>
</template>

<script setup lang="ts">
import { useVuelidate } from '@vuelidate/core'
import { required, numeric, minValue, maxValue } from '@vuelidate/validators'
const entitlement = defineModel({
  default: {
    value: '',
    entitlementTypeId: 0
  }
})

//#region validate
const rules = {
  entitlement: {
    value: {
      required,
      numeric,
      minValue: minValue(1),
      maxValue: maxValue(100)
    }
  }
}

const $v = useVuelidate(rules, { entitlement })
//#endregion validate
</script>
