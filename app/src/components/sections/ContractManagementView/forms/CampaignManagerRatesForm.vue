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
      <AddressTooltip
        v-if="settings.bankAddress"
        :address="settings.bankAddress"
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
          :model-value="rateDraft.costPerClick"
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
          :model-value="rateDraft.costPerImpression"
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
          :loading="isSavingRates"
          :disabled="isSavingRates || !hasRateChanges || archivedDisabled"
          data-test="campaign-rate-save"
          @click="saveRates"
        />
      </TeamArchivedTooltip>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useToast } from '@nuxt/ui/composables'
import { parseUnits, type Address } from 'viem'
import AddressTooltip from '@/components/ui/AddressTooltip.vue'
import TeamArchivedTooltip from '@/components/ui/TeamArchivedTooltip.vue'
import type { CampaignManagerSettings } from '@/composables/campaign/reads'
import {
  useSetCampaignCostPerClick,
  useSetCampaignCostPerImpression
} from '@/composables/campaign/writes'

type CampaignRates = Pick<CampaignManagerSettings, 'costPerClick' | 'costPerImpression'>

const props = defineProps<{
  settings: CampaignManagerSettings
  managerAddress: Address
}>()
const emit = defineEmits<{
  (event: 'close'): void
}>()
const toast = useToast()
const remainingRateConfirmations = ref(0)
const rateDraft = ref<CampaignRates>({
  costPerClick: props.settings.costPerClick,
  costPerImpression: props.settings.costPerImpression
})
const confirmedRates = ref({
  costPerClick: Number.parseFloat(props.settings.costPerClick || '0'),
  costPerImpression: Number.parseFloat(props.settings.costPerImpression || '0')
})
const managerAddressRef = computed(() => props.managerAddress)
const setCostPerClick = useSetCampaignCostPerClick(managerAddressRef)
const setCostPerImpression = useSetCampaignCostPerImpression(managerAddressRef)
const isSavingRates = computed(
  () => setCostPerClick.isPending.value || setCostPerImpression.isPending.value
)

const hasRateChanges = computed(
  () =>
    Number.parseFloat(rateDraft.value.costPerClick || '0') !== confirmedRates.value.costPerClick ||
    Number.parseFloat(rateDraft.value.costPerImpression || '0') !==
      confirmedRates.value.costPerImpression
)

watch(
  () => props.settings,
  (settings) => {
    if (hasRateChanges.value || isSavingRates.value) return
    rateDraft.value = {
      costPerClick: settings.costPerClick,
      costPerImpression: settings.costPerImpression
    }
    confirmedRates.value = {
      costPerClick: Number.parseFloat(settings.costPerClick || '0'),
      costPerImpression: Number.parseFloat(settings.costPerImpression || '0')
    }
  }
)

function updateCost(key: keyof CampaignRates, value: string | number) {
  rateDraft.value[key] = String(Math.abs(Number.parseFloat(String(value)) || 0))
}

function confirmRateUpdate(key: 'costPerClick' | 'costPerImpression', value: number) {
  remainingRateConfirmations.value--
  confirmedRates.value[key] = value
  if (remainingRateConfirmations.value === 0) emit('close')
}

function saveRates() {
  const clickRate = Number.parseFloat(rateDraft.value.costPerClick)
  const impressionRate = Number.parseFloat(rateDraft.value.costPerImpression)
  if (!Number.isFinite(clickRate) || !Number.isFinite(impressionRate)) return

  const clickChanged = confirmedRates.value.costPerClick !== clickRate
  const impressionChanged = confirmedRates.value.costPerImpression !== impressionRate

  if (clickChanged && clickRate <= 0) {
    toast.add({ title: 'Cost per click should be greater than 0', color: 'error' })
    return
  }
  if (impressionChanged && impressionRate <= 0) {
    toast.add({ title: 'Cost per impression should be greater than 0', color: 'error' })
    return
  }

  try {
    remainingRateConfirmations.value = Number(clickChanged) + Number(impressionChanged)
    if (clickChanged) {
      setCostPerClick.mutate(
        { args: [parseUnits(String(clickRate), 18)] },
        { onSuccess: () => confirmRateUpdate('costPerClick', clickRate) }
      )
    }
    if (impressionChanged) {
      setCostPerImpression.mutate(
        { args: [parseUnits(String(impressionRate), 18)] },
        { onSuccess: () => confirmRateUpdate('costPerImpression', impressionRate) }
      )
    }
  } catch (error) {
    remainingRateConfirmations.value = 0
    toast.add({
      title: 'An error occurred while updating the costs. Please try again.',
      color: 'error'
    })
    console.error('Error:', error)
  }
}

watch(setCostPerClick.error, (error) => {
  if (error) toast.add({ title: 'Set cost per click failed', color: 'error' })
})
watch(setCostPerImpression.error, (error) => {
  if (error) toast.add({ title: 'Set cost per impression failed', color: 'error' })
})
</script>
