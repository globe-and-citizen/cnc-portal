import { ref } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useGetTeamOfficersQuery, type TeamOfficerWithContracts } from '@/queries/contract.queries'
import {
  bankScanTargets,
  useIncomingBankTokenTransfersViaLogs
} from '../useIncomingBankTokenTransfersViaLogs'

const { mockUseContractEventsViaLogs } = vi.hoisted(() => ({
  mockUseContractEventsViaLogs: vi.fn()
}))

vi.mock('@/composables/eventsViaLogs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/composables/eventsViaLogs')>()
  return { ...actual, useContractEventsViaLogs: mockUseContractEventsViaLogs }
})

const FIRST_BANK = '0x1111111111111111111111111111111111111111'
const SECOND_BANK = '0x2222222222222222222222222222222222222222'
const USER = '0x3333333333333333333333333333333333333333'

const officerHistory = [
  {
    deployBlockNumber: '101',
    contracts: [
      { address: FIRST_BANK, type: 'Bank' },
      { address: '0x3333333333333333333333333333333333333333', type: 'ExpenseAccountEIP712' }
    ]
  },
  {
    deployBlockNumber: '202',
    contracts: [{ address: SECOND_BANK, type: 'Bank' }]
  }
] as TeamOfficerWithContracts[]

function setupQueries() {
  const eventQuery = {
    data: ref(undefined),
    isPending: ref(false),
    error: ref<Error | null>(null),
    refetch: vi.fn()
  }
  const officerQuery = {
    data: ref<TeamOfficerWithContracts[]>([]),
    isPending: ref(false),
    isError: ref(false),
    error: ref<Error | null>(null),
    refetch: vi.fn()
  }
  mockUseContractEventsViaLogs.mockReturnValue(eventQuery)
  vi.mocked(useGetTeamOfficersQuery).mockReturnValue(
    officerQuery as unknown as ReturnType<typeof useGetTeamOfficersQuery>
  )
  return { eventQuery, officerQuery }
}

beforeEach(() => {
  mockUseContractEventsViaLogs.mockReset()
})

describe('bankScanTargets', () => {
  it('keeps every historic Bank generation with its deploy boundary', () => {
    expect(bankScanTargets(officerHistory, SECOND_BANK)).toEqual([
      { address: FIRST_BANK, fromBlock: 101n },
      { address: SECOND_BANK, fromBlock: 202n }
    ])
  })

  it('keeps the current Bank when Officer history is unavailable', () => {
    expect(bankScanTargets([], SECOND_BANK)).toEqual([{ address: SECOND_BANK }])
  })

  it('does not duplicate a historic Bank when address casing differs', () => {
    expect(bankScanTargets(officerHistory, SECOND_BANK.toUpperCase())).toHaveLength(2)
  })
})

describe('useIncomingBankTokenTransfersViaLogs', () => {
  it('exposes the event query and combines both pending states reactively', () => {
    const { eventQuery, officerQuery } = setupQueries()
    const query = useIncomingBankTokenTransfersViaLogs('1', USER, SECOND_BANK)

    expect(query.data).toBe(eventQuery.data)
    expect(query.refetch).toBe(eventQuery.refetch)
    expect(query.isPending.value).toBe(false)

    eventQuery.isPending.value = true
    expect(query.isPending.value).toBe(true)

    eventQuery.isPending.value = false
    officerQuery.isPending.value = true
    expect(query.isPending.value).toBe(true)
  })

  it('prefers the event error and otherwise exposes the Officer query error', () => {
    const { eventQuery, officerQuery } = setupQueries()
    const eventError = new Error('event scan failed')
    const officerError = new Error('Officer history failed')
    eventQuery.error.value = eventError
    officerQuery.error.value = officerError
    const query = useIncomingBankTokenTransfersViaLogs('1', USER, SECOND_BANK)

    expect(query.error.value).toBe(eventError)

    eventQuery.error.value = null
    expect(query.error.value).toBe(officerError)
  })
})
