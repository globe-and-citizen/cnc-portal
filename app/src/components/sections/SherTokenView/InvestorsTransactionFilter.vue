<template>
  <div class="flex items-center gap-2">
    <CustomDatePicker
      v-if="props.showDateFilter"
      v-model="dateRange"
      class="min-w-[140px]"
      :data-test-prefix="props.dataTestPrefix"
    />
    <USelect
      v-model="selectedType"
      :items="typeOptions"
      class="min-w-[160px]"
      :data-test="`${props.dataTestPrefix}-type-filter`"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import CustomDatePicker from '@/components/CustomDatePicker.vue'

const props = withDefaults(
  defineProps<{
    uniqueTypes: string[]
    showDateFilter?: boolean
    dataTestPrefix?: string
  }>(),
  {
    showDateFilter: true,
    dataTestPrefix: 'investor-transaction-history'
  }
)

const emit = defineEmits<{
  (e: 'update:dateRange', value: [Date, Date] | null): void
  (e: 'update:selectedType', value: string): void
}>()

const dateRange = ref<[Date, Date] | null>(null)
const selectedType = ref('all')

const typeOptions = computed(() => [
  { label: 'All Types', value: 'all' },
  ...props.uniqueTypes.map((type) => ({ label: type, value: type }))
])

watch(dateRange, (newRange: [Date, Date] | null) => {
  emit('update:dateRange', newRange)
})

watch(selectedType, (newType: string) => {
  emit('update:selectedType', newType)
})
</script>
