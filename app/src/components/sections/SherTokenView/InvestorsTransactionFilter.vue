<template>
  <div class="flex items-center gap-2">
    <CustomDatePicker
      v-if="showDateFilter"
      v-model="dateRange"
      class="min-w-[140px]"
      :data-test-prefix="dataTestPrefix"
    />
    <div class="relative">
      <UButton
        class="flex min-w-[110px] cursor-pointer items-center gap-4 border border-gray-300"
        @click="typeDropdownOpen = !typeDropdownOpen"
        :data-test="`${dataTestPrefix}-type-filter`"
        :label="selectedTypeLabel"
        variant="ghost"
        trailing-icon="heroicons:chevron-down"
      />
      <ul
        class="menu bg-base-200 rounded-box absolute right-0 z-1 mt-2 w-40 border-2 p-2 shadow-sm"
        ref="typeDropdownTarget"
        v-if="typeDropdownOpen"
      >
        <li @click="selectType('')"><a>All Types</a></li>
        <li v-for="type in uniqueTypes" :key="type" @click="selectType(type)">
          <a>{{ type }}</a>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import CustomDatePicker from '@/components/CustomDatePicker.vue'
import { onClickOutside } from '@vueuse/core'

withDefaults(
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
const selectedType = ref('')
const typeDropdownOpen = ref(false)
const typeDropdownTarget = ref<HTMLElement | null>(null)

const selectedTypeLabel = computed(() => (selectedType.value ? selectedType.value : 'All Types'))

const selectType = (type: string) => {
  selectedType.value = type
  emit('update:selectedType', type)
  typeDropdownOpen.value = false
}

watch(dateRange, (newRange: [Date, Date] | null) => {
  emit('update:dateRange', newRange)
})

onClickOutside(typeDropdownTarget, () => {
  typeDropdownOpen.value = false
})
</script>
