<template>
  <div id="admins-table" class="overflow-x-auto">
    <UTable :data="rows" :columns="columns">
      <template #value-cell="{ row: { original: row } }">
        <template v-if="row.key.startsWith('cost')">
          <div class="flex items-center gap-2">
            <UInput
              type="number"
              step="any"
              size="sm"
              :model-value="row.value"
              :required="true"
              class="w-24"
              @update:model-value="updateCost(row.key, $event)"
            />
            <span class="text-muted text-sm">ETH</span>
          </div>
        </template>
        <AddressToolTip
          v-else-if="isAddressField(row.key)"
          :address="row.value"
          :slice="true"
          class="text-xs"
        />
        <template v-else>{{ row.value }}</template>
      </template>
    </UTable>

    <div class="mt-4 flex justify-end">
      <TeamArchivedTooltip v-slot="{ disabled: archivedDisabled }">
        <UButton
          color="primary"
          icon="i-lucide-save"
          label="Save changes"
          :loading="isLoading"
          :disabled="isLoading || archivedDisabled"
          @click="submit"
        />
      </TeamArchivedTooltip>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, toRef } from 'vue'
import AddressToolTip from '@/components/AddressToolTip.vue'
import TeamArchivedTooltip from '@/components/TeamArchivedTooltip.vue'
import {
  useCampaignContractDetails,
  type CampaignContractDatum
} from '@/composables/contracts/useCampaignContractDetails'

const props = defineProps<{
  datas: CampaignContractDatum[]
  contractAddress: string
  reset: boolean
}>()
const emit = defineEmits<{
  (event: 'update:datas', value: CampaignContractDatum[]): void
  (event: 'closeContractDataDialog'): void
}>()

const columns = [
  { accessorKey: 'index', header: '#' },
  { accessorKey: 'key', header: 'Name' },
  { accessorKey: 'value', header: 'Value' }
]
const rows = computed(() => props.datas.map((data, index) => ({ ...data, index: index + 1 })))
const {
  initialized,
  originalValues,
  originalCostPerClick,
  originalCostPerImpression,
  pendingTransactions,
  isLoading,
  submit
} = useCampaignContractDetails({
  datas: toRef(props, 'datas'),
  contractAddress: toRef(props, 'contractAddress'),
  reset: toRef(props, 'reset'),
  onClose: () => emit('closeContractDataDialog')
})

defineExpose({
  initialized,
  originalValues,
  originalCostPerClick,
  originalCostPerImpression,
  pendingTransactions
})

function isAddressField(key: string) {
  return key.includes('Address') || key.toLowerCase().includes('owner')
}

function updateCost(key: string, value: string | number) {
  const updatedDatas = props.datas.map((data) =>
    data.key === key
      ? { ...data, value: String(Math.abs(Number.parseFloat(String(value)) || 0)) }
      : data
  )
  emit('update:datas', updatedDatas)
}
</script>
