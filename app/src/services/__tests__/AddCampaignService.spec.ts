import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AddCampaignService } from '@/services/AddCampaignService'
import { mockGetLogs } from '@/tests/mocks'
import { mockWagmiCore } from '@/tests/mocks'

describe('AddCampaignService (wagmi)', () => {
  let service: AddCampaignService
  const contractAddress = '0xCampaignContract'
  const admin = '0xAdmin'
  const hash = '0xTxHash'

  beforeEach(() => {
    service = new AddCampaignService()
    vi.resetAllMocks()
  })

  it('addAdmin - sends tx and waits for receipt', async () => {
    mockWagmiCore.writeContract.mockResolvedValue(hash)
    mockWagmiCore.waitForTransactionReceipt.mockResolvedValue({ status: 'success' })

    const result = await service.addAdmin(contractAddress, admin)

    expect(mockWagmiCore.mutate).toHaveBeenCalled()
    expect(result).toEqual({ status: 'success' })
  })

  it('removeAdmin - sends tx and waits for receipt', async () => {
    mockWagmiCore.writeContract.mockResolvedValue(hash)
    mockWagmiCore.waitForTransactionReceipt.mockResolvedValue({ status: 'success' })

    const result = await service.removeAdmin(contractAddress, admin)

    expect(mockWagmiCore.mutate).toHaveBeenCalled()
    expect(result).toEqual({ status: 'success' })
  })

  it('getAdminList - filters and deduplicates added/removed admins', async () => {
    const client = {
      getBlockNumber: vi.fn().mockResolvedValue(10000n)
    }
    mockWagmiCore.getPublicClient.mockReturnValue(client)

    const adminLogs = [{ args: { admin: '0xAdmin1' } }, { args: { admin: '0xAdmin2' } }]
    const removedLogs = [{ args: { admin: '0xAdmin1' } }]

    mockGetLogs.mockImplementation((_client, { event }) => {
      if (event.name === 'AdminAdded') return adminLogs
      if (event.name === 'AdminRemoved') return removedLogs
      return []
    })

    const list = await service.getAdminList(contractAddress)
    expect(list).toEqual(['0xAdmin2'])
  })

  it('getEventsGroupedByCampaignCode - parses all event types', async () => {
    const mockLogs = [
      { args: { campaignCode: '0xABC', budget: 1000n } },
      { args: { campaignCode: '0xABC', paymentAmount: 200n } },
      { args: { campaignCode: '0xABC', advertiser: '0xAdv', amount: 300n } },
      { args: { campaignCode: '0xABC', paymentAmount: 150n } }
    ]
    mockWagmiCore.getPublicClient.mockReturnValue({
      getBlockNumber: vi.fn().mockResolvedValue(10000n)
    })
    mockGetLogs.mockResolvedValue(mockLogs)

    const result = await service.getEventsGroupedByCampaignCode(contractAddress)
    expect(result.status).toBe('success')
    expect(result.events?.['0xABC']?.length).toBe(16)
  })
})
