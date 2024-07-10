<template>
  <input type="text" class="w-24" placeholder="Put amount" v-model="amount" />
  <span>/token,</span>
  <select v-model="selectedFrequency" class="grow bg-white">
    <option>-- Frequency --</option>
    <option v-for="(item, index) in options" :key="index">
      {{ item }}
    </option>
  </select>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'

const options = ref(['quarterly', 'half-yearly', 'yearly'])

const entitlement = defineModel({
  default: {
    rule: '',
    type: 0
  }
})

const initAmount = computed(() => {
  const entValue = entitlement.value.rule
  if (entValue) {
    return entValue.split(`:`)[0]
  } else {
    return ``
  }
})

const initFrequency = computed(() => {
  const entValue = entitlement.value.rule
  if (entValue) {
    return entValue.split(`:`)[1]
  } else {
    return `-- Frequency --`
  }
})

const amount = ref<string | null>(initAmount.value)
const selectedFrequency = ref<string | null>(initFrequency.value)

watch([amount, selectedFrequency], ([amount, frequency]) => {
  if (amount === `` || frequency === `-- Frequency --`) {
    entitlement.value.rule = ''
  } else {
    entitlement.value.rule = `${amount}:${frequency}`
  }
  //console.log('entitlement.value.rule: ', entitlement.value.rule)
})
</script>
