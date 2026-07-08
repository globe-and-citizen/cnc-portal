<template>
  <div id="admins-table" class="overflow-x-auto">
    <UTable
      :data="
        datas.map((data, index) => ({
          ...data,
          index: index + 1
        }))
      "
      :columns="[
        { accessorKey: 'index', header: '#' },
        { accessorKey: 'key', header: 'Name' },
        { accessorKey: 'value', header: 'Value' }
      ]"
    >
      <template #value-cell="{ row: { original: row } }">
        <template v-if="row.key.startsWith('cost')">
          <UInput
            type="number"
            step="any"
            size="sm"
            :model-value="row.value"
            :required="true"
            class="w-24"
            @update:model-value="
              (v: string | number) =>
                updateValue(
                  datas.findIndex((d) => d.key === row.key),
                  Math.abs(parseFloat(String(v)) || 0)
                )
            "
          />
          ETH
        </template>
        <template
          v-else-if="row.key.includes('Address') || row.key.toLowerCase().includes('owner')"
        >
          <AddressToolTip :address="row.value" class="text-xs" />
        </template>
        <template v-else>
          {{ row.value }}
        </template>
      </template>
    </UTable>
    <div class="mt-4">
      <TeamArchivedTooltip v-slot="{ disabled: archivedDisabled }">
        <UButton
          @click="submit"
          color="primary"
          :loading="isLoading"
          :disabled="isLoading || archivedDisabled"
        >
          save changes
        </UButton>
      </TeamArchivedTooltip>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import AddressToolTip from '@/components/AddressToolTip.vue'
import TeamArchivedTooltip from '@/components/TeamArchivedTooltip.vue'

import { parseUnits } from 'viem/utils'
import type { Address } from 'viem'

import { AD_CAMPAIGN_MANAGER_ABI } from '@/artifacts/abi/ad-campaign-manager'
import { useContractWritesV3 } from '@/composables/contracts/useContractWritesV3'
const toast = useToast()
const props = defineProps<{
  datas: Array<{ key: string; value: string }>
  contractAddress: string
  reset: boolean
}>()

const pendingTransactions = ref(0)

const originalCostPerClick = ref<number>(0)
const originalCostPerImpression = ref<number>(0)

const isLoading = computed(() => loadingSetCostPerClick.value || loadingSetCostPerImpression.value)

const originalValues = ref<Record<string, number>>({})

const getOriginalValue = (key: string) => originalValues.value[key] ?? 0

const initialized = ref<boolean>(false)

const contractAddress = computed(() => props.contractAddress as Address)

const {
  mutate: setCostPerClick,
  error: errorSetCostPerClick,
  isPending: loadingSetCostPerClick
} = useContractWritesV3({
  contractAddress,
  abi: AD_CAMPAIGN_MANAGER_ABI,
  functionName: 'setCostPerClick'
})

const {
  mutate: setCostPerImpression,
  error: errorSetCostPerImpression,
  isPending: loadingSetCostPerImpression
} = useContractWritesV3({
  contractAddress,
  abi: AD_CAMPAIGN_MANAGER_ABI,
  functionName: 'setCostPerImpression'
})

watch(errorSetCostPerClick, () => {
  if (errorSetCostPerClick.value) {
    toast.add({ title: 'Set cost per click failed', color: 'error' })
  }
})

watch(errorSetCostPerImpression, () => {
  if (errorSetCostPerImpression.value) {
    toast.add({ title: 'Set cost per impression failed', color: 'error' })
  }
})

defineExpose({
  initialized,
  originalValues,
  originalCostPerClick,
  originalCostPerImpression,
  pendingTransactions
})

watch(
  () => props.reset,
  (resetValue) => {
    if (resetValue) {
      initialized.value = false
    }
  }
)

watch(
  () => props.datas,
  (newDatas: Array<{ key: string; value: string }>) => {
    if (!initialized.value && newDatas?.length) {
      originalValues.value = Object.fromEntries(
        newDatas.map((data) => [data.key, parseFloat(data.value || '0')])
      )

      originalCostPerClick.value = getOriginalValue('costPerClick')
      originalCostPerImpression.value = getOriginalValue('costPerImpression')
      initialized.value = true
    }
  },
  { deep: true }
)

async function submit() {
  try {
    originalCostPerClick.value = getOriginalValue('costPerClick')
    originalCostPerImpression.value = getOriginalValue('costPerImpression')
    const updatedDatas = [...props.datas]
    const costPerClick = updatedDatas.find((data) => data.key === 'costPerClick')?.value
    const costPerImpression = updatedDatas.find((data) => data.key === 'costPerImpression')?.value

    if (costPerClick && costPerImpression && originalCostPerClick && originalCostPerImpression) {
      if (originalCostPerClick.value != parseFloat(costPerClick)) {
        if (parseFloat(costPerClick) <= 0) {
          toast.add({ title: 'Cost per click should be greater than 0', color: 'error' })
          return
        }
        pendingTransactions.value++
        setCostPerClick(
          { args: [parseUnits(String(costPerClick), 18)] },
          {
            onSuccess: () => {
              pendingTransactions.value--
              toast.add({ title: 'Cost per click updated successfully', color: 'success' })
              originalCostPerClick.value = getOriginalValue('costPerClick')
              if (pendingTransactions.value === 0) emit('closeContractDataDialog')
            }
          }
        )
      }
      if (originalCostPerImpression.value != parseFloat(costPerImpression)) {
        if (parseFloat(costPerImpression) <= 0) {
          toast.add({ title: 'Cost per impression should be greater than 0', color: 'error' })
          return
        }
        pendingTransactions.value++
        setCostPerImpression(
          { args: [parseUnits(String(costPerImpression), 18)] },
          {
            onSuccess: () => {
              pendingTransactions.value--
              toast.add({ title: 'Cost per impression updated successfully', color: 'success' })
              originalCostPerImpression.value = getOriginalValue('costPerImpression')
              if (pendingTransactions.value === 0) emit('closeContractDataDialog')
            }
          }
        )
      }
    }
  } catch (error) {
    toast.add({
      title: 'An error occurred while updating the costs. Please try again.',
      color: 'error'
    })
    console.error('Error:', error)
  }
}

const emit = defineEmits<{
  (e: 'update:datas', value: Array<{ key: string; value: string }>): void
  (e: 'closeContractDataDialog'): void
}>()

function updateValue(index: number, value: number) {
  const updatedDatas = [...props.datas]
  if (updatedDatas[index]) {
    updatedDatas[index].value = value.toString()
    emit('update:datas', updatedDatas)
  }
}
</script>
