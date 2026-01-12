<template>
  <UCard>
    <template #header>
      <div class="flex items-center justify-between">
        <h3 class="text-lg font-semibold">
          Fee Configurations
        </h3>
        <FeeConfigAddActions />
      </div>
    </template>
    <div class="overflow-x-auto">
      <table class="w-full">
        <thead>
          <tr class="border-b border-gray-200 dark:border-gray-700">
            <th class="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">
              Contract Type
            </th>
            <th class="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">
              Fee (BPS)
            </th>
            <th class="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="isLoading">
            <td colspan="3" class="text-center py-8">
              <UIcon name="i-heroicons-arrow-path" class="w-6 h-6 animate-spin inline-block" />
            </td>
          </tr>
          <tr v-for="config in feeConfigs" :key="config.contractType" class="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            <td class="px-4 py-4 font-mono">
              {{ config.contractType }}
            </td>
            <td class="px-4 py-4">
              {{ config.feeBps }} BPS ({{ (config.feeBps / 100).toFixed(2) }}%)
            </td>
            <td class="px-4 py-4">
              <UButton
                v-if="isFeeOwner"
                icon="i-heroicons-pencil"
                size="xs"
                @click="openEdit(config)"
              />
            </td>
          </tr>
          <tr v-if="!isLoading && feeConfigs?.length === 0">
            <td colspan="3" class="text-center py-8 text-gray-500">
              No fee configs available
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <FeeConfigFormModal
      v-if="isEditModalOpen"
      v-model="isEditModalOpen"
      :fee-config="selectedConfig ?? undefined"
      mode="edit"
      :loading="isEditLoading"
    />
  </UCard>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import FeeConfigFormModal from '@/components/sections/FeeCollectorView/FeeConfigFormModal.vue'
import FeeConfigAddActions from '@/components/sections/FeeCollectorView/FeeConfigAddActions.vue'
import { isFeeCollectorOwner, useFeeConfigs } from '~/composables/FeeCollector/read'

const { data: feeConfigs, isLoading } = useFeeConfigs()
const isFeeOwner = isFeeCollectorOwner()
const isEditModalOpen = ref(false)
const isEditLoading = ref(false)
const selectedConfig = ref<{ contractType: string, feeBps: number, feePercent: number } | null>(null)

const openEdit = (cfg: { contractType: string, feeBps: number, feePercent?: number }) => {
  selectedConfig.value = {
    contractType: cfg.contractType,
    feeBps: cfg.feeBps,
    feePercent: cfg.feePercent ?? (cfg.feeBps / 100)
  }
  isEditModalOpen.value = true
}
</script>
