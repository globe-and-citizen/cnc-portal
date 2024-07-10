<template>
  <AccessValueForm v-if="entName === `access`" v-model="entitlement" />
  <WageValueForm v-if="entName === `wage`" v-model="entitlement" />
  <TokenValueForm v-if="entName === `tokens`" v-model="entitlement" />
  <DividendValueForm v-if="entName === `dividend`" v-model="entitlement" />
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import AccessValueForm from './AccessValueForm.vue'
import WageValueForm from './WageValueForm.vue'
import TokenValueForm from './TokenValueForm.vue'
import DividendValueForm from './DividendValueForm.vue'

const entTypes = ref([
  { id: 1, name: 'salary' },
  { id: 2, name: 'dividend' },
  { id: 3, name: 'wage' },
  { id: 4, name: 'tokens' },
  { id: 5, name: 'access' },
  { id: 6, name: 'vote' },
  { id: -1, name: '-- Create New --' }
])

const entitlement = defineModel({
  default: {
    rule: '',
    type: 0
  }
})

const entName = computed(() => {
  const index = entTypes.value.findIndex((item: { id: number; name: string }) => {
    return item.id === entitlement.value.type
  })

  if (index > -1) {
    return entTypes.value[index].name
  } else return `-- Create New --`
})
</script>
