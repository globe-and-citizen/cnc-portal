<template>
  <div class="flex items-center gap-2">
    <CustomDatePicker
      v-if="showDateFilter"
      v-model="dateRange"
      class="min-w-[140px]"
      :data-test-prefix="dataTestPrefix"
    />
    <div class="relative">
      <ButtonUI
        class="flex items-center cursor-pointer gap-4 border border-gray-300 min-w-[110px]"
        @click="typeDropdownOpen = !typeDropdownOpen"
        :data-test="`${dataTestPrefix}-type-filter`"
      >
        <span>{{ selectedTypeLabel }}</span>
        <IconifyIcon icon="heroicons:chevron-down" class="w-4 h-4" />
      </ButtonUI>
      <ul
        class="absolute right-0 mt-2 menu bg-base-200 border-2 rounded-box z-[1] w-40 p-2 shadow"
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
import { Icon as IconifyIcon } from '@iconify/vue'
import ButtonUI from '@/components/ButtonUI.vue'
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
