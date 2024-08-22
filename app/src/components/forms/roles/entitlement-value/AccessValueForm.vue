<template>
  <select
    v-model="selectedResource"
    class="grow bg-white"
    @input="
      async () => {
        await $v.$validate()
      }
    "
  >
    <option>-- Resource --</option>
    <option v-for="(item, index) in options.resources" :key="index">
      {{ item }}
    </option>
  </select>

  <select
    v-model="selectedAcessLevel"
    class="grow bg-white"
    @input="
      async () => {
        await $v.$validate()
      }
    "
  >
    <option>-- Access Level --</option>
    <option v-for="(item, index) in options.levels" :key="index">
      {{ item }}
    </option>
  </select>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { useVuelidate } from '@vuelidate/core'
import { helpers, required } from '@vuelidate/validators'

const options = ref({
  resources: ['teams', 'roles', 'app', 'expense-account'],
  levels: ['create', 'delete', 'update', 'read']
})

const entitlement = defineModel({
  default: {
    value: '',
    entitlementTypeId: 0
  }
})

const initResource = computed(() => {
  const entValue = entitlement.value.value
  if (entValue) {
    return entValue.split(`:`)[0]
  } else {
    return `-- Resource --`
  }
})

const initAccessLevel = computed(() => {
  const entValue = entitlement.value.value
  if (entValue) {
    return entValue.split(`:`)[1]
  } else {
    return `-- Access Level --`
  }
})

const selectedResource = ref<string | null>(initResource.value)
const selectedAcessLevel = ref<string | null>(initAccessLevel.value)

//#region validate
const customValidators = {
  validResource: (value: string) => options.value.resources.includes(value),
  validLevel: (value: string) => options.value.levels.includes(value)
}

const rules = {
  selectedResource: {
    required,
    validOption: helpers.withMessage('Please select a resource', customValidators.validResource)
  },
  selectedAcessLevel: {
    required,
    validOption: helpers.withMessage('Please select an access level', customValidators.validLevel)
  }
}

const $v = useVuelidate(rules, { selectedResource, selectedAcessLevel })
//#endregion validate

watch([selectedResource, selectedAcessLevel], ([resource, level]) => {
  if (resource === `-- Resource --` || level === `-- Access Level --`) {
    entitlement.value.value = ''
  } else {
    entitlement.value.value = `${resource}:${level}`
  }
})
</script>
