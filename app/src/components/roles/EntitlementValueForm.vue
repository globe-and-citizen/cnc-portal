<template>
  <AccessValueForm v-if="entName === `access`" v-model="entitlement" />
  <WageValueForm v-if="entName === `wage`" v-model="entitlement" />
  <TokenValueForm v-if="entName === `tokens`" v-model="entitlement" />
  <DividendValueForm v-if="entName === `dividend`" v-model="entitlement" />
  <!--<div v-for="error of $v.$errors" :key="error.$uid">{{ error.$message }}</div>-->
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useCustomFetch } from "@/composables/useCustomFetch";
import AccessValueForm from './AccessValueForm.vue'
import WageValueForm from './WageValueForm.vue'
import TokenValueForm from './TokenValueForm.vue'
import DividendValueForm from './DividendValueForm.vue'
import { useVuelidate } from "@vuelidate/core";

const $v = useVuelidate()

const {
  error: isGetEntTypesError,
  execute: getEntTypesAPI,
  data: entTypes
} = useCustomFetch<{success: boolean; entTypes: {id: number; name: string}}>(`entitlement/types`, {
  immediate: false
})
  .get()
  .json()

const entitlement = defineModel({
  default: {
    value: '',
    entitlementTypeId: 0
  }
})

const entName = computed(() => {
  console.log('entTypes: ', entTypes.value)
  const index = entTypes.value?.entTypes?.findIndex((item: { id: number; name: string }) => {
    return item.id === entitlement.value.entitlementTypeId
  })

  if (index > -1) {
    return entTypes.value.entTypes[index].name
  } else return `-- Create New --`
})

/*watch($v.value.$errors, (newVal) => {
  if ($v.value.$errors.length) {
    console.log(`$errors: `, newVal)
  }
})*/

onMounted(async () => {
  await getEntTypesAPI()
})
</script>
