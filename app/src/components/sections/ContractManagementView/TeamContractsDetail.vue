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
          data-test="campaign-rate-save"
          @click="submit"
        />
      </TeamArchivedTooltip>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { parseUnits, type Address } from 'viem'
import AddressToolTip from '@/components/ui/AddressToolTip.vue'
import TeamArchivedTooltip from '@/components/ui/TeamArchivedTooltip.vue'
import {
  useSetCampaignCostPerClick,
  useSetCampaignCostPerImpression
} from '@/composables/campaign/writes'

interface CampaignContractDatum {
  key: string
  value: string
}

const props = defineProps<{
  datas: CampaignContractDatum[]
  contractAddress: string
  reset: boolean
}>()
const emit = defineEmits<{
  (event: 'update:datas', value: CampaignContractDatum[]): void
  (event: 'closeContractDataDialog'): void
}>()
const toast = useToast()
const initialized = ref(false)
const pendingTransactions = ref(0)
const originalRates = ref({ costPerClick: 0, costPerImpression: 0 })
const campaignAddress = computed(() => props.contractAddress as Address)
const setCostPerClick = useSetCampaignCostPerClick(campaignAddress)
const setCostPerImpression = useSetCampaignCostPerImpression(campaignAddress)
const isLoading = computed(
  () => setCostPerClick.isPending.value || setCostPerImpression.isPending.value
)

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
    Number.parseFloat(costPerClick.value || '0') !== originalRates.value.costPerClick ||
    Number.parseFloat(costPerImpression.value || '0') !== originalRates.value.costPerImpression
)

function updateCost(key: string, value: string | number) {
  const updatedDatas = props.datas.map((data) =>
    data.key === key
      ? { ...data, value: String(Math.abs(Number.parseFloat(String(value)) || 0)) }
      : data
  )
  emit('update:datas', updatedDatas)
}

function initializeRates(datas: CampaignContractDatum[]) {
  if (initialized.value || !datas.length) return

  originalRates.value = {
    costPerClick: Number.parseFloat(
      datas.find((data) => data.key === 'costPerClick')?.value || '0'
    ),
    costPerImpression: Number.parseFloat(
      datas.find((data) => data.key === 'costPerImpression')?.value || '0'
    )
  }
  initialized.value = true
}

function completeTransaction(key: 'costPerClick' | 'costPerImpression', value: number) {
  pendingTransactions.value--
  originalRates.value[key] = value
  if (pendingTransactions.value === 0) emit('closeContractDataDialog')
}

function submit() {
  const clickRate = Number.parseFloat(costPerClick.value)
  const impressionRate = Number.parseFloat(costPerImpression.value)
  if (!Number.isFinite(clickRate) || !Number.isFinite(impressionRate)) return

  const clickChanged = originalRates.value.costPerClick !== clickRate
  const impressionChanged = originalRates.value.costPerImpression !== impressionRate

  if (clickChanged && clickRate <= 0) {
    toast.add({ title: 'Cost per click should be greater than 0', color: 'error' })
    return
  }
  if (impressionChanged && impressionRate <= 0) {
    toast.add({ title: 'Cost per impression should be greater than 0', color: 'error' })
    return
  }

  try {
    pendingTransactions.value = Number(clickChanged) + Number(impressionChanged)
    if (clickChanged) {
      setCostPerClick.mutate(
        { args: [parseUnits(String(clickRate), 18)] },
        { onSuccess: () => completeTransaction('costPerClick', clickRate) }
      )
    }
    if (impressionChanged) {
      setCostPerImpression.mutate(
        { args: [parseUnits(String(impressionRate), 18)] },
        { onSuccess: () => completeTransaction('costPerImpression', impressionRate) }
      )
    }
  } catch (error) {
    pendingTransactions.value = 0
    toast.add({
      title: 'An error occurred while updating the costs. Please try again.',
      color: 'error'
    })
    console.error('Error:', error)
  }
}

watch(
  () => props.reset,
  (reset) => {
    if (reset) initialized.value = false
  }
)
watch(() => props.datas, initializeRates, { deep: true })
watch(setCostPerClick.error, (error) => {
  if (error) toast.add({ title: 'Set cost per click failed', color: 'error' })
})
watch(setCostPerImpression.error, (error) => {
  if (error) toast.add({ title: 'Set cost per impression failed', color: 'error' })
})
</script>
