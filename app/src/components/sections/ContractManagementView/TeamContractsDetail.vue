<template>
  <div class="space-y-5">
    <UAlert
      color="info"
      variant="subtle"
      icon="i-lucide-info"
      title="Rates apply to every funded campaign"
      description="Changing a rate affects how future validated clicks and impressions are valued."
    />

    <div class="border-default rounded-lg border p-3">
      <p class="text-muted text-xs">Advertising revenue destination</p>
      <AddressToolTip
        v-if="bankAddress"
        :address="bankAddress"
        :slice="false"
        class="mt-1 text-sm"
      />
      <p v-else class="text-muted mt-1 text-sm">Not configured</p>
    </div>

    <div class="grid gap-4 sm:grid-cols-2">
      <UFormField label="Cost per click" help="Charged for each validated click." required>
        <UInput
          type="number"
          min="0"
          step="any"
          :model-value="costPerClick"
          class="w-full"
          data-test="manager-cost-per-click"
          @update:model-value="updateCost('costPerClick', $event)"
        >
          <template #trailing><span class="text-muted text-xs">POL</span></template>
        </UInput>
      </UFormField>

      <UFormField
        label="Cost per impression"
        help="Charged for each validated impression."
        required
      >
        <UInput
          type="number"
          min="0"
          step="any"
          :model-value="costPerImpression"
          class="w-full"
          data-test="manager-cost-per-impression"
          @update:model-value="updateCost('costPerImpression', $event)"
        >
          <template #trailing><span class="text-muted text-xs">POL</span></template>
        </UInput>
      </UFormField>
    </div>

    <div class="flex justify-end">
      <TeamArchivedTooltip v-slot="{ disabled: archivedDisabled }">
        <UButton
          color="primary"
          icon="i-lucide-save"
          label="Save changes"
          :loading="isLoading"
          :disabled="isLoading || !hasChanges || archivedDisabled"
          @click="submit"
        />
      </TeamArchivedTooltip>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, toRef } from 'vue'
import AddressToolTip from '@/components/ui/AddressToolTip.vue'
import TeamArchivedTooltip from '@/components/ui/TeamArchivedTooltip.vue'
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

const costPerClick = computed(
  () => props.datas.find((data) => data.key === 'costPerClick')?.value ?? ''
)
const costPerImpression = computed(
  () => props.datas.find((data) => data.key === 'costPerImpression')?.value ?? ''
)
const bankAddress = computed(
  () => props.datas.find((data) => data.key === 'bankAddress')?.value ?? ''
)
const hasChanges = computed(
  () =>
    Number.parseFloat(costPerClick.value || '0') !== originalCostPerClick.value ||
    Number.parseFloat(costPerImpression.value || '0') !== originalCostPerImpression.value
)

defineExpose({
  initialized,
  originalValues,
  originalCostPerClick,
  originalCostPerImpression,
  pendingTransactions
})

function updateCost(key: string, value: string | number) {
  const updatedDatas = props.datas.map((data) =>
    data.key === key
      ? { ...data, value: String(Math.abs(Number.parseFloat(String(value)) || 0)) }
      : data
  )
  emit('update:datas', updatedDatas)
}
</script>
