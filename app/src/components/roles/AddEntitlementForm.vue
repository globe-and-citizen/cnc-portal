<template>
  <div class="space-y-2">
    <label class="input input-bordered flex items-center gap-2 input-md mt-4">
      <span class="w-24">Type</span>
      <select v-model="entitlement.type" class="grow bg-white">
        <option v-for="item in availableTypes" :key="item.id" :value="item.id">
          {{ item.name }}
        </option>
      </select>
    </label>
    <label class="input input-bordered flex items-center gap-2 input-md">
      <span class="w-24">Value</span>
      <EntitlementValueForm v-model="entitlement" />
    </label>
  </div>
</template>

<script setup lang="ts">
import { ref, type ComputedRef, watch, onMounted } from 'vue'
import EntitlementValueForm from './EntitlementValueForm.vue'

const entitlement = defineModel({
  default: {
    type: 0,
    rule: '',
    isInit: true //so entitlement value isn't cleared on load
  }
})

const props = defineProps<{
  availableTypes: ComputedRef<{ id: number; name: string }[]>
}>()

const availableTypes = ref(props.availableTypes)

watch(
  () => entitlement.value.type,
  (newType, oldType) => {
    if (!entitlement.value.isInit && newType !== oldType) {
      console.log('reset!!!')
      console.log('newType: ', newType, ', oldType: ', oldType)
      console.log('entitlement.value: ', entitlement.value)
      entitlement.value.rule = ''
    } else entitlement.value.isInit = false
  }
)

onMounted(() => {})
</script>
