<template>
  <select v-model="selectedResource" class="grow bg-white">
    <option>-- Resource --</option>
    <option v-for="(item, index) in options.resources" :key="index">
      {{ item }}
    </option>
  </select>

  <select v-model="selectedAcessLevel" class="grow bg-white">
    <option>-- Access Level --</option>
    <option v-for="(item, index) in options.levels" :key="index">
      {{ item }}
    </option>
  </select>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'

const options = ref({
  resources: ['teams', 'roles', 'app'],
  levels: ['create', 'delete', 'update', 'read']
})

const entitlement = defineModel({
  default: {
    rule: '',
    type: 0
  }
})

const initResource = computed(() => {
  const entValue = entitlement.value.rule
  if (entValue) {
    return entValue.split(`:`)[0]
  } else {
    return `-- Resource --`
  }
})

const initAccessLevel = computed(() => {
  const entValue = entitlement.value.rule
  if (entValue) {
    return entValue.split(`:`)[1]
  } else {
    return `-- Access Level --`
  }
})

const selectedResource = ref<string | null>(initResource.value)
const selectedAcessLevel = ref<string | null>(initAccessLevel.value)

watch([selectedResource, selectedAcessLevel], ([resource, level]) => {
  if (resource === `-- Resource --` || level === `-- Access Level --`) {
    entitlement.value.rule = ''
  } else {
    entitlement.value.rule = `${resource}:${level}`
  }
  //console.log('entitlement.value.rule: ', entitlement.value.rule)
})
</script>
