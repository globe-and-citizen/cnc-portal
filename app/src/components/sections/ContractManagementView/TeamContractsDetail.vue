<template>
  <div id="admins-table" class="overflow-x-auto">
    <TableComponent
      :rows="
        datas.map((data, index) => ({
          ...data,
          index: index + 1
        }))
      "
      :columns="[
        { key: 'index', label: '#' },
        { key: 'key', label: 'Name' },
        { key: 'value', label: 'Value' }
      ]"
    >
      <template #value-data="{ row }">
        <template v-if="row.key.startsWith('cost')">
          <input
            type="number"
            step="any"
            :value="row.value"
            @input="
              updateValue(
                datas.findIndex((d) => d.key === row.key),
                Math.abs(parseFloat(($event.target as HTMLInputElement).value) || 0)
              )
            "
            class="input input-bordered w-24 text-sm"
            required
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
    </TableComponent>
    <div class="mt-4">
      <button @click="submit" class="btn btn-primary" :loading="isLoading" :disabled="isLoading">
        <span v-if="isLoading" class="loading loading-spinner loading-xs text-green-800"></span>
        save changes
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { defineProps, ref, computed, watch } from 'vue'
import AddressToolTip from '@/components/AddressToolTip.vue'
import TableComponent from '@/components/TableComponent.vue'

import { parseUnits } from 'viem/utils'

import { useToastStore } from '@/stores/useToastStore'
import CampaignAbi from '@/artifacts/abi/AdCampaignManager.json'

import { useWaitForTransactionReceipt, useWriteContract } from '@wagmi/vue'
import { type Abi } from 'viem'
const { addErrorToast, addSuccessToast } = useToastStore()
const props = defineProps<{
  datas: Array<{ key: string; value: string }>
  contractAddress: string
  reset: boolean
}>()

const pendingTransactions = ref(0)

const originalCostPerClick = ref<number>(0)
const originalCostPerImpression = ref<number>(0)

const isLoading = computed(
  () =>
    loadingSetCostPerClick.value ||
    (isConfirmingSetCostPerClick.value && !isConfirmedSetCostPerClick.value) ||
    loadingSetCostPerImpression.value ||
    (isConfirmingSetCostPerImpression.value && !isConfirmedSetCostPerImpression.value)
)

const originalValues = ref<Record<string, number>>({})

const getOriginalValue = (key: string) => originalValues.value[key] ?? 0

const initialized = ref<boolean>(false)

const {
  writeContract: setCostPerClick,
  error: errorSetCostPerClick,
  isPending: loadingSetCostPerClick,
  data: hashSetCostPerClick
} = useWriteContract()

const { isLoading: isConfirmingSetCostPerClick, isSuccess: isConfirmedSetCostPerClick } =
  useWaitForTransactionReceipt({
    hash: hashSetCostPerClick
  })

watch(isConfirmingSetCostPerClick, async (isConfirming, wasConfirming) => {
  if (wasConfirming && !isConfirming && isConfirmedSetCostPerClick.value) {
    pendingTransactions.value--
    addSuccessToast('Cost per click updated successfully')
    originalCostPerClick.value = getOriginalValue('costPerClick')
    if (pendingTransactions.value === 0) emit('closeContractDataDialog')
  }
})

const {
  writeContract: setCostPerImpression,
  error: errorSetCostPerImpression,
  isPending: loadingSetCostPerImpression,
  data: hashSetCostPerImpression
} = useWriteContract()

const { isLoading: isConfirmingSetCostPerImpression, isSuccess: isConfirmedSetCostPerImpression } =
  useWaitForTransactionReceipt({
    hash: hashSetCostPerImpression
  })

watch(isConfirmingSetCostPerImpression, async (isConfirming, wasConfirming) => {
  if (wasConfirming && !isConfirming && isConfirmedSetCostPerImpression.value) {
    pendingTransactions.value--
    addSuccessToast('Cost per impression updated successfully')
    originalCostPerImpression.value = getOriginalValue('costPerImpression')
    if (pendingTransactions.value === 0) emit('closeContractDataDialog')
  }
})

watch(errorSetCostPerClick, () => {
  if (errorSetCostPerClick.value) {
    addErrorToast('Set cost per click failed')
  }
})

watch(errorSetCostPerImpression, () => {
  if (errorSetCostPerImpression.value) {
    addErrorToast('Set cost per impression failed')
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
          addErrorToast('Cost per click should be greater than 0')
          return
        }
        pendingTransactions.value++
        setCostPerClick({
          address: props.contractAddress as `0x${string}`,
          abi: CampaignAbi as Abi,
          functionName: 'setCostPerClick',
          args: [parseUnits(String(costPerClick), 18)]
        })
      }
      if (originalCostPerImpression.value != parseFloat(costPerImpression)) {
        if (parseFloat(costPerImpression) <= 0) {
          addErrorToast('Cost per impression should be greater than 0')
          return
        }
        pendingTransactions.value++
        setCostPerImpression({
          address: props.contractAddress as `0x${string}`,
          abi: CampaignAbi as Abi,
          functionName: 'setCostPerImpression',
          args: [parseUnits(String(costPerImpression), 18)]
        })
      }
    }
  } catch (error) {
    addErrorToast('An error occurred while updating the costs. Please try again.')
    console.error('Error:', error)
  }
}

const emit = defineEmits<{
  (e: 'update:datas', value: Array<{ key: string; value: string }>): void
  (e: 'closeContractDataDialog'): void
}>()

function updateValue(index: number, value: number) {
  const updatedDatas = [...props.datas]
  updatedDatas[index].value = value.toString()
  emit('update:datas', updatedDatas)
}
</script>
