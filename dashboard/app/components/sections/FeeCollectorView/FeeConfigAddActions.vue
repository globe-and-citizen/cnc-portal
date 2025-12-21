<template>
  <div>
    <UButton
      v-if="isFeeOwner"
      color="primary"
      icon="i-heroicons-plus"
      :disabled="!feeConfigs"
      @click="isAddModalOpen = true"
    >
      Add Fee Config
    </UButton>
    <FeeConfigFormModal
      v-model="isAddModalOpen"
      mode="add"
      :loading="isLoading"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import FeeConfigFormModal from '@/components/sections/FeeCollectorView/FeeConfigFormModal.vue'
import { isFeeCollectorOwner, useFeeConfigs } from '~/composables/FeeCollector/read'

// const emit = defineEmits(['added'])
const isAddModalOpen = ref(false)
const isLoading = ref(false)

const isFeeOwner = isFeeCollectorOwner()
const { data: feeConfigs } = useFeeConfigs()

// const toast = useToast()
</script>
