<template>
  <div>
    <UButton  v-if="isFeeCollectorOwner" color="primary" icon="i-heroicons-plus" @click="isAddModalOpen = true" :disabled="availableContractTypes.length === 0">
      Add Fee Config
    </UButton>
    <FeeConfigFormModal
      v-model="isAddModalOpen"
      mode="add"
      :loading="isLoading"
      @submit="handleAdd"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useFeeCollector } from '@/composables/useFeeCollector'
import FeeConfigFormModal from '@/components/sections/FeeCollectorView/FeeConfigFormModal.vue'


const emit = defineEmits(['added'])
const isAddModalOpen = ref(false)
const isLoading = ref(false)
const { setFee, availableContractTypes,isFeeCollectorOwner } = useFeeCollector()

const toast = useToast()

const handleAdd = async (cfg: { contractType: string; feeBps: number }) => {
  isLoading.value = true
  try {
    await setFee(cfg.contractType, cfg.feeBps)
    toast.add({
      title: 'Success',
      description: `Fee for "${cfg.contractType}" added.`,
      color: 'success'
    })
    isAddModalOpen.value = false
    emit('added')
  } catch (e) {
    toast.add({
      title: 'Error',
      description: 'Failed to add fee config.',
      color: 'error'
    })
  } finally {
    isLoading.value = false
  }
}
</script>