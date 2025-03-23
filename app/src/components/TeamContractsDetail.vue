<template>
  <div id="admins-table" class="overflow-x-auto">
    <table class="table w-full">
      <!-- head -->
      <thead>
        <tr>
          <th>#</th>
          <th>Name</th>
          <th>Value</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(data, index) in datas" :key="index" class="hover:bg-base-200">
          <th>{{ index + 1 }}</th>
          <td>{{ data['key'] }}</td>
          <td v-if="data['key'].startsWith('cost')">
            <input
              type="number"
              step="any"
              :value="data.value"
              @input="
                updateValue(index, Math.abs(parseFloat(($event.target as HTMLInputElement).value)))
              "
              class="input input-bordered w-24 text-sm"
              required
            />
            ETH
          </td>
          <td v-else>{{ data['value'] }}</td>
        </tr>
      </tbody>
    </table>
    <div class="mt-4">
      <button @click="submit" class="btn btn-primary" :loading="isLoading" :disabled="isLoading">
        <span v-if="isLoading" class="loading loading-spinner loading-xs text-green-800"></span>
        save changes
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { defineProps, ref } from 'vue'

import { isAddress } from 'viem'
import { useToastStore } from '@/stores/useToastStore'
import { AddCampaignService } from '@/services/AddCampaignService'
const { addErrorToast, addSuccessToast } = useToastStore()
const props = defineProps<{
  datas: Array<{ key: string; value: string }>
  contractAddress: string
}>()

import { nextTick, onMounted } from 'vue'

//const originalDatas = ref([...props.datas])
const originalCostPerClick = ref<number>(
  parseFloat(props.datas.find((data) => data.key === 'costPerClick')?.value || '0')
)
const originalCostPerImpression = ref<number>(
  parseFloat(props.datas.find((data) => data.key === 'costPerImpression')?.value || '0')
)
console.log('')
onMounted(async () => {
  await nextTick()
  originalCostPerClick.value = parseFloat(
    props.datas.find((data) => data.key === 'costPerClick')?.value || '0'
  )
  originalCostPerImpression.value = parseFloat(
    props.datas.find((data) => data.key === 'costPerImpression')?.value || '0'
  )
})
const isLoading = ref(false)

const addCamapaignService = new AddCampaignService()

async function setCostPerClick(campaignContractAddress: string, costPerClick: string) {
  if (!isAddress(campaignContractAddress)) {
    addErrorToast('please provide valid campaign address')
  } else {
    isLoading.value = true
    const result = await addCamapaignService.setCostPerClick(
      campaignContractAddress,
      costPerClick.toString()
    )

    if (result.status === 1) {
      addSuccessToast('cost per click updated successfully')
      isLoading.value = false

      originalCostPerClick.value = parseFloat(costPerClick)
    } else {
      addErrorToast('set costPerClick failed please try again')
      isLoading.value = false
    }
  }
}

async function setCostPerImpression(campaignContractAddress: string, costPerImpression: string) {
  if (!isAddress(campaignContractAddress)) {
    addErrorToast('please provide valid campaign address')
  } else {
    isLoading.value = true
    const result = await addCamapaignService.setCostPerImpression(
      campaignContractAddress,
      costPerImpression.toString()
    )

    if (result.status === 1) {
      addSuccessToast('cost per impression updated successfully')
      isLoading.value = false

      originalCostPerImpression.value = parseFloat(costPerImpression)
    } else {
      addErrorToast('set costPerImpression failed please try again')
      isLoading.value = false
    }
  }
}

async function submit() {
  const updatedDatas = [...props.datas]
  const costPerClick = updatedDatas.find((data) => data.key === 'costPerClick')?.value
  const costPerImpression = updatedDatas.find((data) => data.key === 'costPerImpression')?.value

  console.log('Cost Per Click:', costPerClick)
  console.log('Original Cost Per Click:', originalCostPerClick.value)
  console.log('Cost Per Impression:', costPerImpression)

  console.log('Original Cost Per Impression:', originalCostPerImpression.value)
  if (costPerClick && costPerImpression && originalCostPerClick && originalCostPerImpression) {
    if (originalCostPerClick.value != parseFloat(costPerClick)) {
      await setCostPerClick(props.contractAddress, costPerClick)
    }
    if (originalCostPerImpression.value != parseFloat(costPerImpression)) {
      await setCostPerImpression(props.contractAddress, costPerClick)
    }
  }
}

const emit = defineEmits<{
  (e: 'update:datas', value: Array<{ key: string; value: string }>): void
}>()

function updateValue(index: number, value: number) {
  const updatedDatas = [...props.datas]
  updatedDatas[index].value = value.toString()
  emit('update:datas', updatedDatas)
}
</script>

<style scoped>
/* Add any custom styles if necessary */
</style>
