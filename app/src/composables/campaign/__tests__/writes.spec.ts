import { ref } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Address } from 'viem'
const { useContractWritesV3Mock } = vi.hoisted(() => ({ useContractWritesV3Mock: vi.fn() }))

vi.mock('@/composables/contracts/useContractWritesV3', () => ({
  useContractWritesV3: useContractWritesV3Mock
}))

import { useSetCampaignCostPerClick, useSetCampaignCostPerImpression } from '../writes'

const campaignAddress = ref<Address>('0x1111111111111111111111111111111111111111')

describe('campaign rate write hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('configures the cost-per-click write with its contract function', () => {
    useSetCampaignCostPerClick(campaignAddress)

    expect(useContractWritesV3Mock).toHaveBeenCalledWith(
      expect.objectContaining({
        contractAddress: campaignAddress,
        functionName: 'setCostPerClick'
      })
    )
  })

  it('configures the cost-per-impression write with its contract function', () => {
    useSetCampaignCostPerImpression(campaignAddress)

    expect(useContractWritesV3Mock).toHaveBeenCalledWith(
      expect.objectContaining({
        contractAddress: campaignAddress,
        functionName: 'setCostPerImpression'
      })
    )
  })
})
