import { computed, ref, watch, type Ref } from 'vue'
import { parseUnits } from 'viem/utils'
import type { Address } from 'viem'
import { adCampaignManagerAbi } from '@/artifacts/abi/generated'
import { useContractWritesV3 } from '@/composables/contracts/useContractWritesV3'

export interface CampaignContractDatum {
  key: string
  value: string
}

interface CampaignContractDetailsOptions {
  datas: Ref<CampaignContractDatum[]>
  contractAddress: Ref<string>
  reset: Ref<boolean>
  onClose: () => void
}

export function useCampaignContractDetails(options: CampaignContractDetailsOptions) {
  const toast = useToast()
  const pendingTransactions = ref(0)
  const originalCostPerClick = ref(0)
  const originalCostPerImpression = ref(0)
  const originalValues = ref<Record<string, number>>({})
  const initialized = ref(false)
  const contractAddress = computed(() => options.contractAddress.value as Address)

  const costPerClickMutation = useContractWritesV3({
    contractAddress,
    abi: adCampaignManagerAbi,
    functionName: 'setCostPerClick'
  })
  const costPerImpressionMutation = useContractWritesV3({
    contractAddress,
    abi: adCampaignManagerAbi,
    functionName: 'setCostPerImpression'
  })

  const isLoading = computed(
    () => costPerClickMutation.isPending.value || costPerImpressionMutation.isPending.value
  )

  function initializeValues(datas: CampaignContractDatum[]) {
    if (initialized.value || !datas.length) return

    originalValues.value = Object.fromEntries(
      datas.map((data) => [data.key, Number.parseFloat(data.value || '0')])
    )
    originalCostPerClick.value = originalValues.value.costPerClick ?? 0
    originalCostPerImpression.value = originalValues.value.costPerImpression ?? 0
    initialized.value = true
  }

  function completeTransaction(key: string, value: number) {
    pendingTransactions.value--
    originalValues.value[key] = value
    if (key === 'costPerClick') originalCostPerClick.value = value
    if (key === 'costPerImpression') originalCostPerImpression.value = value
    if (pendingTransactions.value === 0) options.onClose()
  }

  function submit() {
    const costPerClick = Number.parseFloat(
      options.datas.value.find((data) => data.key === 'costPerClick')?.value ?? ''
    )
    const costPerImpression = Number.parseFloat(
      options.datas.value.find((data) => data.key === 'costPerImpression')?.value ?? ''
    )

    if (!Number.isFinite(costPerClick) || !Number.isFinite(costPerImpression)) return

    const clickChanged = originalCostPerClick.value !== costPerClick
    const impressionChanged = originalCostPerImpression.value !== costPerImpression

    if (clickChanged && costPerClick <= 0) {
      toast.add({ title: 'Cost per click should be greater than 0', color: 'error' })
      return
    }
    if (impressionChanged && costPerImpression <= 0) {
      toast.add({ title: 'Cost per impression should be greater than 0', color: 'error' })
      return
    }

    try {
      if (clickChanged) {
        pendingTransactions.value++
        costPerClickMutation.mutate(
          { args: [parseUnits(String(costPerClick), 18)] },
          { onSuccess: () => completeTransaction('costPerClick', costPerClick) }
        )
      }

      if (impressionChanged) {
        pendingTransactions.value++
        costPerImpressionMutation.mutate(
          { args: [parseUnits(String(costPerImpression), 18)] },
          { onSuccess: () => completeTransaction('costPerImpression', costPerImpression) }
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

  watch(options.reset, (reset) => {
    if (reset) initialized.value = false
  })
  watch(options.datas, initializeValues, { deep: true })
  watch(costPerClickMutation.error, (error) => {
    if (error) toast.add({ title: 'Set cost per click failed', color: 'error' })
  })
  watch(costPerImpressionMutation.error, (error) => {
    if (error) toast.add({ title: 'Set cost per impression failed', color: 'error' })
  })

  return {
    initialized,
    originalValues,
    originalCostPerClick,
    originalCostPerImpression,
    pendingTransactions,
    isLoading,
    submit
  }
}
